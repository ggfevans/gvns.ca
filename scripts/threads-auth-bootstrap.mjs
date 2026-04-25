#!/usr/bin/env node

/**
 * One-shot Threads OAuth bootstrap.
 *
 * Walks through the short-lived → long-lived token exchange documented at
 * https://developers.facebook.com/docs/threads/get-started/get-access-tokens-and-permissions/
 *
 * USAGE
 *   THREADS_APP_ID=<your Threads app id, not the parent Meta app id> \
 *   THREADS_APP_SECRET=<your Threads app secret> \
 *   THREADS_REDIRECT_URI=https://gvns.ca/auth/threads/callback \
 *   node scripts/threads-auth-bootstrap.mjs
 *
 * What it does:
 *   1. Prints an authorize URL — open in a browser, accept scopes, copy the
 *      redirected URL (or just the `code=…` value).
 *   2. Exchanges the code for a short-lived token (1h).
 *   3. Exchanges the short-lived token for a long-lived token (~60 days).
 *   4. Verifies the long-lived token works by fetching `/me`.
 *   5. Prints values to copy into `gh secret set`. Nothing is written to disk.
 *
 * Notes:
 *   - The redirect URI must exactly match a "Redirect Callback URL" whitelisted
 *     in the Threads use case settings of your Meta dev app.
 *   - Authorization codes expire ~10 minutes after issuance.
 *   - You're a Threads Tester for the app and have accepted the invite from
 *     within Threads (Settings → Account → Website Permissions → Invites).
 *   - Output contains secrets. After copying into `gh secret set`, `clear` your
 *     terminal scrollback (or close the window).
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const SCOPES = ['threads_basic', 'threads_content_publish', 'threads_manage_replies'];

function bail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

const APP_ID = process.env.THREADS_APP_ID;
const APP_SECRET = process.env.THREADS_APP_SECRET;
const REDIRECT_URI = process.env.THREADS_REDIRECT_URI;

if (!APP_ID) bail('Missing THREADS_APP_ID env var (the Threads app id, e.g. 2120710068774311 — not the parent Meta app id).');
if (!APP_SECRET) bail('Missing THREADS_APP_SECRET env var.');
if (!REDIRECT_URI) bail('Missing THREADS_REDIRECT_URI env var (must exactly match a whitelisted callback URL).');

const authUrl = new URL('https://threads.net/oauth/authorize');
authUrl.searchParams.set('client_id', APP_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPES.join(','));
authUrl.searchParams.set('response_type', 'code');

console.log('\n──── Step 1: Authorise ────');
console.log('Open this URL in your browser, accept the scopes, and copy the redirected URL:\n');
console.log(authUrl.toString());
console.log('\nThreads will redirect you to:');
console.log(`  ${REDIRECT_URI}?code=AQB…#_`);
console.log('That URL will probably 404 in the browser — that\'s fine. The code is in the address bar.');
console.log('Codes expire in ~10 minutes, so don\'t dawdle.\n');

const rl = createInterface({ input: stdin, output: stdout });
const raw = (await rl.question('Paste the full redirect URL or just the code: ')).trim();
rl.close();

let code = raw;
if (raw.startsWith('http')) {
  try {
    code = new URL(raw).searchParams.get('code') || '';
  } catch {
    bail("That doesn't look like a valid URL or a code.");
  }
}
// Threads appends "#_" to the redirect — strip if present
code = code.replace(/#_?$/, '').trim();
if (!code) bail('No code found in the input.');

// ───────────────────────────────────────────────────────────────────────────
// Step 2: code → short-lived token
// ───────────────────────────────────────────────────────────────────────────

console.log('\n──── Step 2: Code → short-lived token ────');
const shortRes = await fetch('https://graph.threads.net/oauth/access_token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
    code,
  }),
});
const shortBody = await shortRes.text();
if (!shortRes.ok) bail(`Code exchange failed (${shortRes.status}): ${shortBody}`);
let shortLived, userId;
try {
  ({ access_token: shortLived, user_id: userId } = JSON.parse(shortBody));
} catch {
  bail(`Couldn't parse short-lived response as JSON: ${shortBody}`);
}
if (!shortLived) bail(`Short-lived response missing access_token: ${shortBody}`);
console.log(`✓ Got short-lived token (1h validity) for user_id=${userId}`);

// ───────────────────────────────────────────────────────────────────────────
// Step 3: short-lived → long-lived token
// ───────────────────────────────────────────────────────────────────────────

console.log('\n──── Step 3: Short-lived → long-lived token ────');
const longUrl = new URL('https://graph.threads.net/access_token');
longUrl.searchParams.set('grant_type', 'th_exchange_token');
longUrl.searchParams.set('client_secret', APP_SECRET);
longUrl.searchParams.set('access_token', shortLived);
const longRes = await fetch(longUrl.toString());
const longBody = await longRes.text();
if (!longRes.ok) bail(`Long-lived exchange failed (${longRes.status}): ${longBody}`);
let longLived, expiresIn;
try {
  ({ access_token: longLived, expires_in: expiresIn } = JSON.parse(longBody));
} catch {
  bail(`Couldn't parse long-lived response as JSON: ${longBody}`);
}
if (!longLived) bail(`Long-lived response missing access_token: ${longBody}`);
const expiresInDays = Math.round(expiresIn / 86400);
const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString().slice(0, 10);
console.log(`✓ Got long-lived token (~${expiresInDays} days, expires ${expiresAt})`);

// ───────────────────────────────────────────────────────────────────────────
// Step 4: verify by hitting /me
// ───────────────────────────────────────────────────────────────────────────

console.log('\n──── Step 4: Verify token ────');
const meUrl = new URL('https://graph.threads.net/v1.0/me');
meUrl.searchParams.set('fields', 'id,username,name');
meUrl.searchParams.set('access_token', longLived);
const meRes = await fetch(meUrl.toString());
const meBody = await meRes.text();
if (!meRes.ok) {
  console.warn(`⚠ Verification call failed (${meRes.status}): ${meBody}`);
  console.warn('  The exchanges succeeded but /me failed — token may still be valid; investigate before relying on it.');
} else {
  const profile = JSON.parse(meBody);
  console.log(`✓ Token verified: @${profile.username} (${profile.name ?? '?'}, id=${profile.id})`);
  if (String(profile.id) !== String(userId)) {
    console.warn(`⚠ /me id (${profile.id}) doesn't match short-lived user_id (${userId}) — unexpected.`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Step 5: stash output
// ───────────────────────────────────────────────────────────────────────────

console.log('\n──── Step 5: Stash in GitHub Actions secrets ────');
console.log('\nValues (sensitive — clear this terminal afterwards):\n');
console.log(`  THREADS_USER_ID      = ${userId}`);
console.log(`  THREADS_ACCESS_TOKEN = ${longLived}`);
console.log('');
console.log('Suggested commands:');
console.log('');
console.log(`  gh secret set THREADS_USER_ID --body "${userId}"`);
console.log(`  gh secret set THREADS_ACCESS_TOKEN --body "${longLived}"`);
console.log(`  gh secret set THREADS_APP_ID --body "${APP_ID}"`);
console.log(`  gh secret set THREADS_APP_SECRET   # then paste secret on stdin`);
console.log('');
console.log(`Long-lived token must be refreshed before ${expiresAt} — that's the job of`);
console.log('scripts/refresh-threads-token.mjs (Phase A.6).');
console.log('');
