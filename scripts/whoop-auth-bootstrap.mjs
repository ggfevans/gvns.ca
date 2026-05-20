#!/usr/bin/env node

/**
 * One-shot Whoop OAuth bootstrap (local).
 *
 * Walks Whoop's authorization-code flow, surfacing the first refresh +
 * access token pair so they can be stored as GitHub Actions secrets for
 * `scripts/fetch-whoop.mjs`. Mirrors the structure of
 * `scripts/threads-auth-bootstrap.mjs`.
 *
 * Run-once locally. Do NOT commit any output.
 *
 * ─── PREREQUISITES ──────────────────────────────────────────────────────
 *
 *   1. The Whoop app must be registered in the developer dashboard and the
 *      redirect URI you intend to use here must be on its allowlist:
 *      https://developer.whoop.com/  →  your app  →  Redirect URIs.
 *
 *   2. `gh` CLI authenticated for this repo (`gh auth status`).
 *
 * ─── REDIRECT URI — TWO PATHS ───────────────────────────────────────────
 *
 *   Whoop's docs show only `https://` and custom-scheme examples for the
 *   redirect URI (e.g. `https://example.com/redirect` or
 *   `whoop://callback`). They do NOT explicitly document `http://localhost`
 *   support, so this is the residual unknown.
 *
 *   PATH A — try `http://localhost` first.
 *
 *     export WHOOP_CLIENT_ID=e888c435-61b2-4118-a80d-a5f781931fd3
 *     export WHOOP_CLIENT_SECRET=…                          # from 1Password
 *     export WHOOP_REDIRECT_URI=http://localhost:8910/callback
 *     node scripts/whoop-auth-bootstrap.mjs
 *
 *     Then open the printed URL, accept the scope prompts, and the redirect
 *     will come back to this script's loopback listener. If Whoop's authorize
 *     endpoint rejects the redirect URI as invalid, fall through to Path B.
 *
 *   PATH B — Cloudflare Quick Tunnel (if Path A is rejected).
 *
 *     In a second terminal:
 *
 *       cloudflared tunnel --url http://localhost:8910
 *
 *     Cloudflare prints a one-shot HTTPS URL like
 *       https://<random-words>.trycloudflare.com
 *     Append `/callback` and register it temporarily in the Whoop dashboard:
 *       https://<random-words>.trycloudflare.com/callback
 *     Then export and re-run:
 *
 *       export WHOOP_REDIRECT_URI=https://<random-words>.trycloudflare.com/callback
 *       node scripts/whoop-auth-bootstrap.mjs
 *
 *     The tunnel forwards :443 → localhost:8910 so this script's loopback
 *     listener still receives the code. After the bootstrap succeeds, remove
 *     the trycloudflare URI from the Whoop allowlist (single-use, short TTL).
 *
 * ─── AFTER A SUCCESSFUL RUN ─────────────────────────────────────────────
 *
 *   The script prints the three `gh secret set` commands you need to run.
 *   Order them refresh-token-first to keep the chain unambiguous. From then
 *   on, `fetch-daily.yml` rotates the refresh token on every workflow run —
 *   no manual touch required unless the chain breaks (see
 *   `scripts/fetch-whoop.mjs` failure-issue surfacing).
 *
 *   Clear your terminal scrollback (or close the window) when done — the
 *   tokens are sensitive.
 */

import { createServer } from 'node:http';
import { URL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { exec } from 'node:child_process';
import { platform } from 'node:os';

const AUTHORIZE_ENDPOINT = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const TOKEN_ENDPOINT = 'https://api.prod.whoop.com/oauth/oauth2/token';
const SCOPES = ['read:workout', 'read:profile', 'offline'];
const DEFAULT_REDIRECT_URI = 'http://localhost:8910/callback';

const HARDCODED_CLIENT_ID = 'e888c435-61b2-4118-a80d-a5f781931fd3';

function bail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

const CLIENT_ID = process.env.WHOOP_CLIENT_ID || HARDCODED_CLIENT_ID;
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const REDIRECT_URI = process.env.WHOOP_REDIRECT_URI || DEFAULT_REDIRECT_URI;

if (!CLIENT_SECRET) {
  bail('Missing WHOOP_CLIENT_SECRET env var. Get it from 1Password (Whoop dev app secret).');
}

const redirect = new URL(REDIRECT_URI);
if (!['http:', 'https:'].includes(redirect.protocol)) {
  bail(`WHOOP_REDIRECT_URI must use http: or https: (got ${redirect.protocol}).`);
}

// Loopback listener port — script binds here regardless of how the request
// arrives (direct from browser via http://localhost, or proxied via a
// Cloudflare quick tunnel). For non-loopback hosts (e.g. trycloudflare),
// still bind to localhost — the tunnel forwards externally.
const LISTEN_PORT = redirect.hostname === 'localhost' || redirect.hostname === '127.0.0.1'
  ? Number(redirect.port || 80)
  : 8910;
const CALLBACK_PATH = redirect.pathname || '/callback';

// ───────────────────────────────────────────────────────────────────────────
// Step 1: build authorize URL with state
// ───────────────────────────────────────────────────────────────────────────

const state = randomBytes(16).toString('hex');
const authUrl = new URL(AUTHORIZE_ENDPOINT);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPES.join(' '));
authUrl.searchParams.set('state', state);

console.log('\n──── Step 1: Authorise ────');
console.log('Open this URL in a browser, accept the scopes, and let Whoop redirect back:\n');
console.log(authUrl.toString());
console.log(`\nWaiting for callback at ${REDIRECT_URI} …`);
console.log(`(loopback listener bound to localhost:${LISTEN_PORT}${CALLBACK_PATH})`);

// Best-effort auto-open. Falls through silently — the URL is already printed.
function tryOpenBrowser(url) {
  const command =
    platform() === 'darwin' ? `open "${url}"` :
    platform() === 'win32' ? `start "" "${url}"` :
    `xdg-open "${url}"`;
  exec(command, () => {});
}
tryOpenBrowser(authUrl.toString());

// ───────────────────────────────────────────────────────────────────────────
// Step 2: spin up loopback listener for the redirect
// ───────────────────────────────────────────────────────────────────────────

function awaitCallback() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url, `http://localhost:${LISTEN_PORT}`);
        if (reqUrl.pathname !== CALLBACK_PATH) {
          res.writeHead(404, { 'content-type': 'text/plain' });
          res.end('Not found');
          return;
        }

        const code = reqUrl.searchParams.get('code');
        const returnedState = reqUrl.searchParams.get('state');
        const errParam = reqUrl.searchParams.get('error');

        if (errParam) {
          res.writeHead(400, { 'content-type': 'text/html' });
          res.end(`<h1>Whoop returned an error: ${escapeHtml(errParam)}</h1><p>Check the terminal.</p>`);
          server.close(() => reject(new Error(`Whoop error: ${errParam}`)));
          return;
        }

        // State equality must be checked in constant time when secrets are
        // involved; here the value is one-shot per-run so a normal compare
        // is acceptable.
        if (!returnedState || returnedState !== state) {
          res.writeHead(400, { 'content-type': 'text/html' });
          res.end('<h1>State mismatch.</h1><p>Likely a CSRF attempt or stale tab. Try again.</p>');
          server.close(() => reject(new Error('State parameter mismatch — aborting.')));
          return;
        }
        if (!code) {
          res.writeHead(400, { 'content-type': 'text/html' });
          res.end('<h1>No code returned.</h1>');
          server.close(() => reject(new Error('No code in callback.')));
          return;
        }

        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<h1>Got it.</h1><p>You can close this tab — back to the terminal.</p>');
        server.close(() => resolve(code));
      } catch (err) {
        server.close(() => reject(err));
      }
    });

    server.on('error', reject);
    server.listen(LISTEN_PORT, '127.0.0.1');
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

let code;
try {
  code = await awaitCallback();
  console.log('\n✓ Received authorization code');
} catch (err) {
  bail(`Callback failed: ${err.message}`);
}

// ───────────────────────────────────────────────────────────────────────────
// Step 3: exchange code → tokens
// ───────────────────────────────────────────────────────────────────────────

console.log('\n──── Step 2: Code → tokens ────');
const tokenRes = await fetch(TOKEN_ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }),
});
const tokenBody = await tokenRes.text();
if (!tokenRes.ok) bail(`Token exchange failed (${tokenRes.status}): ${tokenBody}`);

let accessToken, refreshToken, expiresIn, scope;
try {
  ({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    scope,
  } = JSON.parse(tokenBody));
} catch {
  bail(`Couldn't parse token response as JSON: ${tokenBody}`);
}
if (!accessToken || !refreshToken) bail(`Token response missing tokens: ${tokenBody}`);

const expiresInMinutes = Math.round((expiresIn ?? 3600) / 60);
console.log(`✓ Access token (expires in ~${expiresInMinutes} min)`);
console.log(`✓ Refresh token  (single-use; rotates on every refresh)`);
console.log(`✓ Granted scopes: ${scope ?? '(none reported)'}`);

// ───────────────────────────────────────────────────────────────────────────
// Step 4: stash output
// ───────────────────────────────────────────────────────────────────────────

console.log('\n──── Step 3: Set the GitHub Actions secrets ────');
console.log('Values (sensitive — clear this terminal afterwards):\n');
console.log(`  WHOOP_CLIENT_ID      = ${CLIENT_ID}`);
console.log(`  WHOOP_ACCESS_TOKEN   = ${accessToken}`);
console.log(`  WHOOP_REFRESH_TOKEN  = ${refreshToken}`);
console.log('');
console.log('Suggested commands (run them in order — refresh first):\n');
console.log(`  gh secret set WHOOP_REFRESH_TOKEN --body "${refreshToken}"`);
console.log(`  gh secret set WHOOP_ACCESS_TOKEN  --body "${accessToken}"`);
console.log(`  gh secret set WHOOP_CLIENT_ID     --body "${CLIENT_ID}"`);
console.log('  gh secret set WHOOP_CLIENT_SECRET   # then paste secret on stdin');
console.log('');
console.log('After setting secrets, trigger the daily fetch once to verify end-to-end:');
console.log('  gh workflow run fetch-daily.yml');
console.log('');
console.log('From then on, scripts/fetch-whoop.mjs rotates the refresh token on every run.');
