#!/usr/bin/env node

/**
 * Daily fetch of recent Whoop workouts → src/data/whoop.json
 *
 * Runs daily via .github/workflows/fetch-daily.yml. First instance of the
 * in-repo fetch pattern (per docs/specs/move-widget-whoop-2026-05.md §4).
 *
 * Pipeline:
 *   1. Refresh first.    POST /oauth/oauth2/token → new {access, refresh}.
 *   2. Persist new refresh token to GH secret BEFORE doing anything else
 *      (refresh tokens are single-use; if we fetch first and that errors,
 *      Whoop's old refresh is already invalidated and we'd lose the chain).
 *   3. Persist new access token to GH secret.
 *   4. Fetch /v2/activity/workout from `since` → now (24h overlap to catch
 *      late-syncing workouts; falls back to 30d on first run).
 *   5. Filter to movement-sport allowlist; map sport_name → display.
 *   6. Merge with existing whoop.json, dedupe on id, sort newest-first,
 *      cap to 30 entries.
 *   7. Write src/data/whoop.json.
 *
 * Failure surfacing: any error opens or comments on an open issue titled
 * `[whoop-auth] …` (mirrors scripts/refresh-threads-token.mjs).
 *
 * v2 schema confirmed against live docs 2026-05-19 — see docs/research/whoop-api.md.
 * If Whoop changes endpoint shape or scope semantics, update this preamble.
 */

import { execFile } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const OUTPUT_PATH = join(ROOT, 'src', 'data', 'whoop.json');

const TOKEN_ENDPOINT = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WORKOUT_ENDPOINT = 'https://api.prod.whoop.com/v2/activity/workout';

const PAGE_LIMIT = 25;
const MAX_ENTRIES = 30;
const FIRST_RUN_LOOKBACK_DAYS = 30;
const OVERLAP_HOURS = 24;
const FALLBACK_PROFILE_URL = 'https://www.whoop.com/';

// ───────────────────────────────────────────────────────────────────────────
// Movement-sport allowlist (spec §4.6) — Whoop v2 returns recovery activities
// (meditation, ice bath, sauna, massage, etc.) via the workouts endpoint
// alongside actual training. Filter those out before writing JSON.
//
// TUNE ME — refine after the first week of real data once we know which
// sport_name strings actually appear in this account.
// ───────────────────────────────────────────────────────────────────────────

const MOVEMENT_SPORTS = new Set([
  'running', 'cycling', 'rowing', 'swimming',
  'weightlifting', 'powerlifting', 'functional fitness', 'hiit',
  'jiu jitsu', 'brazilian jiu-jitsu', 'martial arts', 'boxing', 'kickboxing', 'wrestling',
  'rock climbing', 'hiking', 'hiking/rucking', 'cross country skiing', 'skiing',
  'strength trainer', 'spin', 'elliptical', 'stairmaster', 'walking',
  'yoga', 'pilates', 'barre', 'f45 training',
]);

// Special-case display names. Unmapped entries get title-cased by default.
const SPORT_DISPLAY_MAP = new Map([
  ['jiu jitsu', 'Jiu-jitsu'],
  ['brazilian jiu-jitsu', 'Brazilian Jiu-jitsu'],
  ['hiit', 'HIIT'],
  ['f45 training', 'F45 Training'],
  ['hiking/rucking', 'Hiking/Rucking'],
]);

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

async function reportFailure(repo, title, body) {
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
    console.error(`Could not surface failure as an issue: ${err.message}`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function displaySport(rawSport) {
  const lower = rawSport.toLowerCase().trim();
  return SPORT_DISPLAY_MAP.get(lower) ?? titleCase(lower);
}

function durationMinutes(startIso, endIso) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

function normaliseWorkout(raw) {
  const sportRaw = String(raw.sport_name ?? '').toLowerCase().trim();
  const scoreState = String(raw.score_state ?? 'UNSCORABLE');
  const rawStrain = raw.score?.strain;
  const strain = typeof rawStrain === 'number' && Number.isFinite(rawStrain)
    ? Number(rawStrain.toFixed(1))
    : 0;
  return {
    id: String(raw.id),
    sport: displaySport(sportRaw),
    sportRaw,
    start: String(raw.start),
    end: String(raw.end),
    durationMinutes: durationMinutes(raw.start, raw.end),
    strain,
    scoreState,
  };
}

async function readExisting() {
  try {
    const raw = await readFile(OUTPUT_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    // Hand-authored placeholder fixture — treat as empty so the first real
    // fetch starts a clean 30-day window and overwrites the placeholder
    // entries rather than merging fictional UUIDs into prod data.
    if (parsed._fixture === true) {
      console.log('ℹ Existing whoop.json is the placeholder fixture — starting fresh');
      return { lastUpdated: null, profile: { profileUrl: FALLBACK_PROFILE_URL }, recentWorkouts: [] };
    }
    return {
      lastUpdated: parsed.lastUpdated ?? null,
      profile: parsed.profile ?? { profileUrl: FALLBACK_PROFILE_URL },
      recentWorkouts: Array.isArray(parsed.recentWorkouts) ? parsed.recentWorkouts : [],
    };
  } catch {
    return { lastUpdated: null, profile: { profileUrl: FALLBACK_PROFILE_URL }, recentWorkouts: [] };
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Step 1: refresh tokens (always — see spec §4.3)
// ───────────────────────────────────────────────────────────────────────────

async function refreshTokens({ clientId, clientSecret, refreshToken }) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'offline',
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Token refresh HTTP ${res.status}: ${text}`);
  let body;
  try { body = JSON.parse(text); } catch { throw new Error(`Token refresh non-JSON: ${text}`); }
  if (!body.access_token || !body.refresh_token) {
    throw new Error(`Token refresh missing tokens: ${text}`);
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in ?? 3600,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Step 2: fetch workouts (paginated)
// ───────────────────────────────────────────────────────────────────────────

async function fetchWorkouts(accessToken, since) {
  const records = [];
  let nextToken = null;
  const seenTokens = new Set();
  let pageCount = 0;
  const maxPages = 20; // safety belt — far more than we'd ever need at 25/page

  do {
    const url = new URL(WORKOUT_ENDPOINT);
    url.searchParams.set('limit', String(PAGE_LIMIT));
    if (since) url.searchParams.set('start', since);
    if (nextToken) url.searchParams.set('nextToken', nextToken);

    const res = await fetch(url.toString(), {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Workouts HTTP ${res.status}: ${text}`);
    let body;
    try { body = JSON.parse(text); } catch { throw new Error(`Workouts non-JSON: ${text}`); }

    const pageRecords = Array.isArray(body.records) ? body.records : [];
    records.push(...pageRecords);

    const newToken = body.next_token || '';
    if (!newToken) break;
    if (seenTokens.has(newToken)) {
      console.warn('⚠ pagination cursor repeated — aborting to avoid loop');
      break;
    }
    seenTokens.add(newToken);
    nextToken = newToken;
    pageCount += 1;
  } while (nextToken && pageCount < maxPages);

  return records;
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const refreshToken = process.env.WHOOP_REFRESH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const inActions = Boolean(process.env.GITHUB_ACTIONS);

  if (inActions && !repo) bail('Missing GITHUB_REPOSITORY env var.');

  // GH_TOKEN authenticates every `gh` call — token rotation (`gh secret set`)
  // AND failure reporting (`gh issue …`) both need it. Without it we can't even
  // surface a failure as an issue, so fail fast with a clear message.
  if (inActions && !(process.env.GH_TOKEN || process.env.GITHUB_TOKEN)) {
    bail('Missing GH_TOKEN env var — cannot persist rotated tokens or report failures as issues.');
  }

  const missingEnv = [
    ['WHOOP_CLIENT_ID', clientId],
    ['WHOOP_CLIENT_SECRET', clientSecret],
    ['WHOOP_REFRESH_TOKEN', refreshToken],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missingEnv.length > 0) {
    if (inActions) {
      const title = '[whoop-auth] Required env var(s) missing';
      const body = `Daily fetch bailed at \`${new Date().toISOString()}\` — missing env var(s): ${missingEnv.map((name) => `\`${name}\``).join(', ')}.

**What this means:** the workflow's secret(s) are absent or empty (deleted, renamed, or never set), so the fetch never reached the Whoop API.

**Recovery:**

1. Check repo secrets: \`gh secret list\` should include WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET and WHOOP_REFRESH_TOKEN.
2. Restore the missing value(s) — for WHOOP_REFRESH_TOKEN, run \`node scripts/whoop-auth-bootstrap.mjs\` locally to mint a fresh refresh token, then \`gh secret set WHOOP_REFRESH_TOKEN\`.
3. Retry this workflow.`;
      await reportFailure(repo, title, body);
    }
    bail(`Missing ${missingEnv.join(', ')} env var(s).`);
  }

  console.log('=== Whoop daily fetch ===');

  // 1. Refresh tokens
  let newAccess, newRefresh, expiresIn;
  try {
    ({ accessToken: newAccess, refreshToken: newRefresh, expiresIn } = await refreshTokens({
      clientId, clientSecret, refreshToken,
    }));
    console.log(`✓ Refreshed Whoop tokens (access expires in ~${Math.round(expiresIn / 60)} min)`);
  } catch (err) {
    const title = '[whoop-auth] Token refresh failed';
    const body = `Refresh failed at \`${new Date().toISOString()}\`.

\`\`\`
${err.message}
\`\`\`

**What this means:** the refresh chain is likely broken. Whoop refresh tokens are single-use, so once the response errors we don't know whether the old token is still valid.

**Recovery:**

1. Run \`node scripts/whoop-auth-bootstrap.mjs\` locally to mint a fresh refresh token.
2. \`gh secret set WHOOP_REFRESH_TOKEN\` with the new value.
3. Retry this workflow.

If this recurs, verify the Whoop OAuth endpoint shape hasn't changed: https://developer.whoop.com/docs/developing/oauth`;
    if (inActions) await reportFailure(repo, title, body);
    bail(`Token refresh failed: ${err.message}`);
  }

  // 2. Persist new refresh token IMMEDIATELY (spec §4.4 — single-use rotation)
  if (inActions) {
    try {
      await ghCmd(
        ['secret', 'set', 'WHOOP_REFRESH_TOKEN', '--repo', repo, '--body-file', '-'],
        newRefresh,
      );
      console.log('✓ Persisted new WHOOP_REFRESH_TOKEN secret');
    } catch (err) {
      const title = '[whoop-auth] Refresh token rotated but secret update failed';
      const body = `Refresh succeeded at \`${new Date().toISOString()}\` but couldn't write the new refresh token back to GitHub secrets.

\`\`\`
${err.message}
\`\`\`

**Critical:** the old refresh token is now invalidated (Whoop rotates on every refresh). The new refresh token printed below should be set manually before the next workflow run, otherwise the chain breaks and bootstrap is required.

The fine-grained PAT needs **Secrets: Read and write** permission. Run \`verify-pat.yml\` to confirm scopes.`;
      await reportFailure(repo, title, body);
      bail(`Refresh-token secret update failed: ${err.message}`);
    }

    try {
      await ghCmd(
        ['secret', 'set', 'WHOOP_ACCESS_TOKEN', '--repo', repo, '--body-file', '-'],
        newAccess,
      );
      console.log('✓ Persisted new WHOOP_ACCESS_TOKEN secret');
    } catch (err) {
      // Non-fatal — access token is reconstructible from refresh.
      console.warn(`⚠ Could not persist access token (continuing): ${err.message}`);
    }
  } else {
    console.log('ℹ Local run — skipping secret persistence');
  }

  // 3. Fetch workouts
  const existing = await readExisting();
  const since = computeSince(existing.lastUpdated);
  console.log(`→ Fetching workouts since ${since}`);

  let rawWorkouts;
  try {
    rawWorkouts = await fetchWorkouts(newAccess, since);
    console.log(`✓ Fetched ${rawWorkouts.length} raw workout record(s)`);
  } catch (err) {
    const title = '[whoop-auth] Workouts fetch failed';
    const body = `Workouts fetch failed at \`${new Date().toISOString()}\` (tokens were rotated successfully).

\`\`\`
${err.message}
\`\`\`

**State:** new refresh + access tokens are already persisted to secrets, so the next run will pick up where this one stopped.`;
    if (inActions) await reportFailure(repo, title, body);
    bail(`Workouts fetch failed: ${err.message}`);
  }

  // 4. Filter, normalise, merge, dedupe, sort, cap
  const movementWorkouts = rawWorkouts.filter((w) => {
    const sport = String(w.sport_name ?? '').toLowerCase().trim();
    if (!sport) return false;
    if (!MOVEMENT_SPORTS.has(sport)) {
      console.log(`  · skipping non-movement sport: "${sport}"`);
      return false;
    }
    return true;
  });

  const normalised = movementWorkouts.map(normaliseWorkout);
  const byId = new Map();
  for (const entry of existing.recentWorkouts) byId.set(entry.id, entry);
  for (const entry of normalised) byId.set(entry.id, entry); // fetched wins on conflict

  const merged = Array.from(byId.values())
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
    .slice(0, MAX_ENTRIES);

  // 5. Write whoop.json
  const out = {
    lastUpdated: new Date().toISOString(),
    profile: existing.profile?.profileUrl ? existing.profile : { profileUrl: FALLBACK_PROFILE_URL },
    recentWorkouts: merged,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf-8');
  console.log(`✓ Wrote ${OUTPUT_PATH} (${merged.length} workout(s))`);
  console.log('=== Done ===');
}

function computeSince(lastUpdated) {
  if (!lastUpdated) {
    const t = new Date(Date.now() - FIRST_RUN_LOOKBACK_DAYS * 86400000);
    return t.toISOString();
  }
  const t = new Date(new Date(lastUpdated).getTime() - OVERLAP_HOURS * 3600000);
  return t.toISOString();
}

function bail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
