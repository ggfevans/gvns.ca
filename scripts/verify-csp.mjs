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
  const res = await fetch(ORIGIN + path, { method: "HEAD", redirect: "manual" });

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

if (failures > 0) {
  console.error(`\n${failures} route(s) failed CSP verification.`);
  process.exit(1);
}
console.log("\nAll routes passed: one CSP with the expected scope (and /admin/ behind Cloudflare Access).");
