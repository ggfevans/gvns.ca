#!/usr/bin/env node
// Post-deploy CSP coverage check.
//
// Why this exists: setting CSP via Cloudflare _headers is order-sensitive in
// a non-obvious way — when both /* and a more-specific rule (like /admin/*)
// match a request, BOTH Content-Security-Policy headers are emitted, and
// browsers enforce each policy independently (W3C CSP3, "combined policy is
// the conjunction of all individual policies"). Effective CSP is the
// intersection (strictest wins), so a "looser" override on /admin/* doesn't
// loosen anything unless the inherited /* CSP is detached first via
// `! Content-Security-Policy`.
//
// We've shipped that bug twice. This script catches it before the third.
//
// Usage:  node scripts/verify-csp.mjs [origin]
//         origin defaults to https://gvns.ca

const ORIGIN = process.argv[2] || "https://gvns.ca";

// Cloudflare's bot rules challenge requests with no (or a default Node) UA, so
// from a GitHub Actions runner this script was reading the *challenge page's*
// headers instead of the site's — every route failing with a nonce CSP it never
// defines. A descriptive UA identifies the check and gets it treated as the
// first-party monitor it is.
const USER_AGENT =
  "gvns-ca-csp-verifier/1.0 (+https://github.com/ggfevans/gvns.ca; scripts/verify-csp.mjs)";

// A UA alone is not enough — runners still score as bots and get
// `cf-mitigated: challenge` / 403. To let this checker through, add a
// Cloudflare WAF custom rule:
//
//   Expression:  http.request.headers["x-csp-verifier"][0] eq "<secret>"
//   Action:      Skip -> all remaining custom rules + Bot Fight Mode
//
// then store the same value as the CSP_VERIFY_TOKEN repository secret.
//
// The check deliberately runs against the zone (gvns.ca), not the
// *.workers.dev origin: zone-level settings can rewrite headers on their way
// out — that is exactly how HSTS ended up as max-age=0 below — and a check
// that bypassed the zone would not see it.
const VERIFY_TOKEN = process.env.CSP_VERIFY_TOKEN;

const REQUEST_HEADERS = {
  "user-agent": USER_AGENT,
  ...(VERIFY_TOKEN ? { "x-csp-verifier": VERIFY_TOKEN } : {}),
};

// Cloudflare's interstitial serves its own CSP, which is never anything
// public/_headers emits. Treat that as "we got blocked" rather than as a policy
// mismatch — the two have completely different fixes.
//
// The signature is structural on purpose: `default-src 'none'` paired with a
// per-request nonce. Our own policies use `default-src 'self'` and never carry
// a nonce. Matching the challenge domain as a substring instead would be both
// imprecise (a lookalike host contains it too) and wrong here — /contact's
// legitimate CSP already lists challenges.cloudflare.com for Turnstile.
function challengeReason(res, csp) {
  const mitigated = res.headers.get("cf-mitigated");
  if (mitigated) return `cf-mitigated: ${mitigated}`;
  if (csp && /'nonce-[^']+'/.test(csp) && /default-src\s+'none'/.test(csp)) {
    return "response carries Cloudflare's challenge CSP (default-src 'none' + per-request nonce)";
  }
  return null;
}

// Routes we expect to have a CSP, and the marker substring that proves which
// CSP arrived. Markers pin "connect-src 'self';" (semicolon included) so a
// reintroduced analytics/third-party connect-src origin fails the check, and
// the directive that follows distinguishes the site CSP from the contact one.
//
// /admin/ is fronted by Cloudflare Access: unauthenticated requests get a 302
// to the Access login with a `www-authenticate: Cloudflare-Access` header, so
// we assert the Access challenge instead of the CSP behind it (which is still
// defined in public/_headers but unreachable without auth).
const expectations = [
  { path: "/",       marker: "connect-src 'self'; frame-ancestors 'none'",      label: "site"  },
  { path: "/about/", marker: "connect-src 'self'; frame-ancestors 'none'",      label: "site"  },
  { path: "/code/",  marker: "connect-src 'self'; frame-ancestors 'none'",      label: "site"  },
  { path: "/now/",   marker: "connect-src 'self'; frame-ancestors 'none'",      label: "site"  },
  { path: "/work/",  marker: "connect-src 'self'; frame-ancestors 'none'",      label: "site"  },
  { path: "/admin/", accessGated: true,                                         label: "admin" },
  { path: "/contact", marker: "connect-src 'self'; frame-src https://challenges.cloudflare.com", label: "contact" },
];

let failures = 0;

// Node's fetch Headers collapses duplicates by joining values with ", ".
// CSP directives use ";" internally — never ",". So if the joined header
// value contains ", " between two directive-bearing chunks, multiple
// policies were sent. We detect by counting "default-src" occurrences.
function countPolicies(cspHeaderValue) {
  if (!cspHeaderValue) return 0;
  const matches = cspHeaderValue.match(/(^|[,\s])default-src/g);
  return matches ? matches.length : 0;
}

for (const { path, marker, label, accessGated } of expectations) {
  let res;
  try {
    res = await fetch(ORIGIN + path, {
      method: "HEAD",
      redirect: "manual",
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error(`FAIL ${path}: request error (${err.name}: ${err.message}, label: ${label})`);
    failures++;
    continue;
  }

  const blocked = challengeReason(res, res.headers.get("content-security-policy"));
  if (blocked) {
    console.error(
      `FAIL ${path}: blocked by Cloudflare before reaching the site — ${blocked} (status ${res.status}, label: ${label})`
    );
    console.error(
      `  These are the challenge page's headers, not gvns.ca's. Allow this checker through the WAF; do not change public/_headers to match.`
    );
    failures++;
    continue;
  }

  if (accessGated) {
    const www = res.headers.get("www-authenticate") ?? "";
    if (res.status === 302 && www.includes("Cloudflare-Access")) {
      console.log(`OK   ${path}  (${label}: Cloudflare Access challenge)`);
    } else {
      console.error(
        `FAIL ${path}: expected 302 + www-authenticate: Cloudflare-Access, got ${res.status} (www-authenticate: ${www || "absent"}, label: ${label})`
      );
      failures++;
    }
    continue;
  }

  const csp = res.headers.get("content-security-policy");

  if (!csp) {
    console.error(`FAIL ${path}: no Content-Security-Policy header (label: ${label})`);
    failures++;
    continue;
  }
  const policyCount = countPolicies(csp);
  if (policyCount > 1) {
    console.error(`FAIL ${path}: ${policyCount} CSP policies sent — browsers intersect them (strictest wins, label: ${label})`);
    console.error(`  joined: ${csp.slice(0, 300)}…`);
    failures++;
    continue;
  }
  if (!csp.includes(marker)) {
    console.error(`FAIL ${path}: CSP doesn't contain expected '${label}' marker "${marker}"`);
    console.error(`  got: ${csp.slice(0, 200)}…`);
    failures++;
    continue;
  }
  console.log(`OK   ${path}  (${label})`);
}

// HSTS is declared in public/_headers but Cloudflare's zone-level HSTS setting
// can override it, rewriting max-age to 0 while leaving `includeSubDomains;
// preload` intact — which is how the site shipped with HSTS unenforced and
// nothing noticed. Nothing above asserts it, so check it here.
//
// Deliberately a warning, not a failure: as of 2026-09-20 production serves
// max-age=0, and a check that can only ever be red is a check people learn to
// ignore. Promote this to `failures++` once the zone setting is on.
try {
  const res = await fetch(ORIGIN + "/", {
    method: "HEAD",
    redirect: "manual",
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  const hsts = res.headers.get("strict-transport-security") ?? "";
  const maxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? -1);
  if (maxAge >= 31536000) {
    console.log(`OK   HSTS  (max-age=${maxAge})`);
  } else if (maxAge === 0) {
    console.warn(
      `WARN HSTS is not enforced: max-age=0 (public/_headers declares 31536000).\n` +
        `  Cloudflare's zone HSTS setting overrides the origin header. Enable it in\n` +
        `  SSL/TLS -> Edge Certificates, then make this a hard failure.`
    );
  } else {
    console.warn(`WARN HSTS unexpected or absent: "${hsts || "absent"}"`);
  }
} catch (err) {
  console.warn(`WARN HSTS check could not run (${err.name}: ${err.message})`);
}

if (failures > 0) {
  console.error(`\n${failures} route(s) failed CSP verification.`);
  process.exit(1);
}
console.log("\nAll routes passed: one CSP with the expected scope (and /admin/ behind Cloudflare Access).");
