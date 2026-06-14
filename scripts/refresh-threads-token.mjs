#!/usr/bin/env node

/**
 * Refresh the long-lived Threads access token and persist the new value
 * back into the THREADS_ACCESS_TOKEN GitHub Actions secret.
 *
 * Runs on the 1st and 15th of each month via
 * .github/workflows/refresh-threads-token.yml.
 *
 * Why plain fetch instead of denim: this script must be runnable
 * independently of Phase B (the rest of the Threads integration), so it
 * stays dependency-free. The refresh endpoint is a single GET — no need
 * for a wrapper.
 *
 * Why pipe the token via stdin to `gh secret set`: keeps the value out of
 * process args (visible to `ps`), workflow logs, and shell history.
 *
 * Failure handling: any error opens a GitHub issue (or comments on an
 * existing open one) titled `[threads-auth] …`. Visible in normal triage.
 */

import { execFile } from 'node:child_process';

const REFRESH_ENDPOINT = 'https://graph.threads.net/refresh_access_token';

function bail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

const currentToken = process.env.THREADS_ACCESS_TOKEN;
const repo = process.env.GITHUB_REPOSITORY; // owner/name, set automatically by GH Actions
if (!currentToken) bail('Missing THREADS_ACCESS_TOKEN env var.');
if (!repo) bail('Missing GITHUB_REPOSITORY env var (this script expects to run inside GitHub Actions).');

// ───────────────────────────────────────────────────────────────────────────
// gh CLI helper — pipes optional stdin without exposing it in argv
// ───────────────────────────────────────────────────────────────────────────

function ghCmd(args, stdin = null) {
  return new Promise((resolve, reject) => {
    const proc = execFile('gh', args, { encoding: 'utf8' }, (err, stdout, stderr) => {
      if (err) {
        const detail = stderr?.trim() || err.message;
        reject(new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${detail}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
    if (stdin != null) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    }
  });
}

async function reportFailure(title, body) {
  try {
    const { stdout } = await ghCmd([
      'issue', 'list',
      '--repo', repo,
      '--state', 'open',
      '--search', `${title} in:title`,
      '--json', 'number',
      '--limit', '1',
    ]);
    const existing = JSON.parse(stdout);
    if (existing.length > 0) {
      const num = existing[0].number;
      console.error(`→ Commenting on existing issue #${num}`);
      await ghCmd(['issue', 'comment', String(num), '--repo', repo, '--body', body]);
    } else {
      console.error('→ Opening new issue');
      await ghCmd(['issue', 'create', '--repo', repo, '--title', title, '--body', body]);
    }
  } catch (err) {
    // Issue creation itself failed — last-resort log.
    console.error(`Could not surface failure as an issue: ${err.message}`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Step 1: refresh
// ───────────────────────────────────────────────────────────────────────────

console.log('=== Threads token refresh ===');

const refreshUrl = new URL(REFRESH_ENDPOINT);
refreshUrl.searchParams.set('grant_type', 'th_refresh_token');
refreshUrl.searchParams.set('access_token', currentToken);

let newToken, expiresIn;
try {
  const res = await fetch(refreshUrl.toString());
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  const body = JSON.parse(text);
  newToken = body.access_token;
  expiresIn = body.expires_in;
  if (!newToken) throw new Error(`Response missing access_token: ${text}`);
} catch (err) {
  const title = '[threads-auth] Token refresh failed';
  const failBody = `Refresh failed at \`${new Date().toISOString()}\`.

\`\`\`
${err.message}
\`\`\`

**What this means:** The current \`THREADS_ACCESS_TOKEN\` secret is likely still valid until its original 60-day expiry — refresh failures don't invalidate the token they were trying to refresh.

**Recovery:**

1. Run the bootstrap script (\`scripts/threads-auth-bootstrap.mjs\`) **or** click "Generate Access Token" in the Meta dashboard (Use cases → Threads API → Settings → User Token Generator) to mint a fresh long-lived token.
2. \`gh secret set THREADS_ACCESS_TOKEN\` with the new value.
3. Retry this workflow via the Actions tab.

If this issue recurs, check whether Meta's refresh endpoint shape has changed: https://developers.facebook.com/docs/threads/get-started/long-lived-tokens/`;
  await reportFailure(title, failBody);
  bail(`Refresh failed: ${err.message}`);
}

const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString().slice(0, 10);
const newExpiresInDays = Math.round(expiresIn / 86400);
console.log(`✓ Refreshed token — new expiry: ${newExpiresAt} (~${newExpiresInDays} days)`);

// ───────────────────────────────────────────────────────────────────────────
// Step 2: persist new token back to GH secret
// ───────────────────────────────────────────────────────────────────────────

try {
  await ghCmd(
    ['secret', 'set', 'THREADS_ACCESS_TOKEN', '--repo', repo, '--body-file', '-'],
    newToken
  );
  console.log('✓ Updated THREADS_ACCESS_TOKEN secret');
} catch (err) {
  const title = '[threads-auth] Token refreshed but secret update failed';
  const failBody = `Refreshed at \`${new Date().toISOString()}\` but couldn't write the new token back to GitHub secrets.

\`\`\`
${err.message}
\`\`\`

**Likely cause:** the \`GH_PAT\` lacks \`Secrets: write\` capability.

- Classic PATs: the broad \`repo\` scope already covers secret writes — should be fine.
- Fine-grained PATs: need **Repository permissions → Secrets → Read and write** enabled.

Run the \`verify-pat.yml\` workflow to confirm scopes.

**State right now:** the existing \`THREADS_ACCESS_TOKEN\` secret may or may not still work — Meta's refresh sometimes invalidates the source token, sometimes doesn't. Treat it as suspect. Re-run the bootstrap script to mint a clean token, fix the PAT, then \`gh secret set\` manually.`;
  await reportFailure(title, failBody);
  bail(`Secret update failed: ${err.message}`);
}

console.log('=== Done ===');
