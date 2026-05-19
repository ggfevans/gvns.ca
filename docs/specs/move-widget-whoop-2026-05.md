# Move widget (Whoop integration) — #553 spec

**Status:** Spec, awaiting implementation
**Drafted:** 2026-05-19
**Revised:** 2026-05-19 (post-API-research) — corrected to Whoop **v2** API paths, removed `whoop-sports.json` (v2 returns `sport_name` directly), added movement-sport allowlist (recovery activities now share the workouts endpoint). See `docs/research/whoop-api.md`.
**Replaces:** the one-line stub on issue [#553](https://github.com/ggfevans/gvns.ca/issues/553)
**Related work:** in-flight consolidation of the `*-json-bourne` sibling repos into in-repo fetch scripts. This integration is the **first instance** of the new in-repo pattern, so the script + workflow shape it establishes should be reusable when the existing fetchers (steam / github / hardcover / listenbrainz / trakt) are migrated.

---

## 1. Decision summary

| Question | Decision |
|---|---|
| What does the widget show? | **Latest workout, headline metric.** Single signal per cell: `sport · duration · strain`. Example: `BJJ · 47 min · strain 14.2`. Optimised for the compact home-strip cell; on `/now` the same component renders the same headline at full size. |
| Name + colour token | **`MoveWidget`** consuming a new **P6 crimson** palette token. Verb naming matches Read / Listen / Watch / Code / Write. New token avoids collision with the five claimed accents and gives the activity its own identity rather than borrowing P2 rose (already "read"). |
| Where it appears | **Home widget strip** (added as 6th cell, grid expands from 5-up → 6-up) · **`/now` bento** (always rendered) · **dedicated `/move` page** (parallel to `/code`, `/read`, `/listen`, `/watch` — workout list + per-day strain heatmap). |
| Data pipeline | **In-repo Node script + GitHub Actions workflow.** No `whoop-json-bourne` sibling repo. `scripts/fetch-whoop.mjs` writes `src/data/whoop.json` on a daily cron; `scripts/refresh-whoop-token.mjs` rotates the OAuth refresh token on a separate schedule (Whoop refresh tokens are single-use, so the fetch script also handles per-run rotation — see §4.4). Matches the consolidated direction the other fetchers are moving toward. |
| OAuth scopes requested | `read:workout` (required) · `read:profile` (for the link target) · `offline` (refresh tokens). **Deliberately not requesting** `read:recovery`, `read:cycles`, `read:sleep` for v1 — keeps the JSON small and the privacy surface minimal. Easy to add later. |

---

## 2. Goal & non-goals

**Goal.** Surface the most recent movement session as a glanceable signal across the home strip, `/now` bento, and a dedicated `/move` activity page. Match the visual + data treatment used by the other activity widgets so the addition feels like a sixth peer, not a special case.

**Non-goals (this round).**

- **Recovery + sleep + cycles data.** Whoop's signature paired narrative (recovery % + strain) is deliberately deferred. Adding the scopes is cheap later; deciding what they *render as* on the public site is the work.
- **HRV / RHR / heart-rate detail.** Personal-medical surface; defer until there's a clear use.
- **Workout drill-down pages.** Each workout is a row, not a page. No `/move/<workout-id>/` routes.
- **Live data on page load.** Same build-time data freshness as the other widgets — daily cron, JSON committed to repo, no client fetch.
- **Editing past workouts via CMS.** Read-only from the public site's perspective. Workouts are source-of-truth in Whoop.

---

## 3. Widget design — `src/components/widgets/MoveWidget.astro`

### 3.1 Compact (home strip)

Header label `MOVE` · primary text: latest workout sport name (Inter 500, 11px) · secondary subtitle: `47 min · strain 14.2` (Inter 400, 10px, muted). Whole cell is a link to `/move`. Border-top 2px P6 crimson. Empty state: `No recent sessions.`

```
┌──────────────────┐
│ MOVE            │  ← uppercase label, P6 crimson top stripe
│                  │
│ Jiu-jitsu        │  ← Inter 500 11px
│ 47 min · strain  │  ← Inter 400 10px muted
│ 14.2             │
└──────────────────┘
```

### 3.2 Full (`/now` bento, `/move` page header)

Same component, `compact={false}`. Renders inside `.gvns-widget` shell with `border-left-color: var(--colour-p6-crimson)`. Adds: relative time (`time` element with `relativeTime()`), `View movement →` link to `/move`. Empty state: `No sessions logged yet.`

Visual reference: `GameWidget.astro` is the closest sibling — same shape, same affordances, same empty/error handling.

### 3.3 Data contract

```ts
interface WorkoutEntry {
  id: string;                  // Whoop workout id (UUID, v2)
  sport: string;               // display-ready, e.g. "Jiu-jitsu" (title-cased + special-cases)
  sportRaw: string;            // Whoop's lowercase string, e.g. "jiu jitsu" (debugging / filter changes)
  start: string;               // ISO timestamp
  end: string;                 // ISO timestamp
  durationMinutes: number;     // derived from start/end
  strain: number;              // 0–21, one decimal (score.strain) — only meaningful when scoreState === "SCORED"
  scoreState: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
}

interface WhoopData {
  lastUpdated: string | null;  // ISO; null if first run failed
  profile?: { profileUrl?: string }; // Whoop has no public profile URL; falls back to whoop.com
  recentWorkouts: WorkoutEntry[]; // sorted newest-first, capped to 30
}
```

The widget reads `data.recentWorkouts[0]` for the headline. The `/move` page uses the full list (§5).

### 3.4 Strain rendering rule

Strain is a 0–21 logarithmic scale (Whoop convention). Render to one decimal place (`14.2`). Don't render `/21` or a coloured indicator in the compact view — the cell is too tight. The `/move` page (§5) can add a small horizontal strain bar per row.

---

## 4. Data pipeline — in-repo

### 4.1 Files

| File | Action |
|---|---|
| `scripts/fetch-whoop.mjs` | **New.** Node ESM script. Reads `WHOOP_ACCESS_TOKEN` + `WHOOP_REFRESH_TOKEN` from env, fetches latest workouts, writes `src/data/whoop.json`. Rotates both tokens back to GH secrets on success (refresh tokens are single-use). |
| `scripts/refresh-whoop-token.mjs` | **New, optional.** Standalone refresh script following the `refresh-threads-token.mjs` pattern (incl. failure-as-issue reporter). Useful when the fetch script hasn't run for a while and tokens are close to expiry. |
| `scripts/whoop-auth-bootstrap.mjs` | **New.** One-time local utility to walk through Whoop's OAuth flow (browser redirect → code → first refresh token). Run once locally, `gh secret set` the result, never touch again unless the refresh chain breaks. |
| ~~`scripts/whoop-sports.json`~~ | **Dropped post-research.** Whoop v2 returns `sport_name` directly; the v1 `sport_id` enum is being phased out 2025-09-01. The fetch script will keep a tiny inline presentation map for special cases (`"jiu jitsu"` → `"Jiu-jitsu"`, `"hiit"` → `"HIIT"`, etc.) — no external lookup needed. |
| `.github/workflows/fetch-daily.yml` | **Edit.** Add a `whoop` step calling `node scripts/fetch-whoop.mjs`. Reuse the existing `commit-via-pr` flow. `continue-on-error: true` so a Whoop outage doesn't fail the whole daily fetch. |
| `src/data/whoop.json` | **New.** Generated artefact. Committed (matches the pattern of `gaming.json`, `github.json`, etc.). |

### 4.2 OAuth flow

Whoop uses OAuth2 with the authorization-code grant + refresh tokens. The flow:

1. **Bootstrap (one-time, local).** Run `node scripts/whoop-auth-bootstrap.mjs`. Script:
   - Opens browser to Whoop's authorize URL with the chosen scopes (`read:workout`, `read:profile`, `offline`).
   - Listens on `localhost:8910/callback` for the redirected `code`.
   - Exchanges `code` → `{ access_token, refresh_token, expires_in }`.
   - Prints the values; user pipes them into `gh secret set WHOOP_ACCESS_TOKEN` and `gh secret set WHOOP_REFRESH_TOKEN`.
2. **Daily fetch (CI).** `scripts/fetch-whoop.mjs` runs:
   - Always refresh first (cheap, ~200ms; means the access token is fresh for the fetch and we exercise refresh every day, catching breakage early).
   - Fetch workouts since the last `lastUpdated` (or last 30 days on first run).
   - Merge with existing `whoop.json`, dedupe on `id`, sort newest-first, cap at 30 entries.
   - Write `src/data/whoop.json`.
   - **Rotate tokens.** Pipe the new `access_token` + `refresh_token` to `gh secret set` (stdin, to keep them out of argv / logs / shell history — same pattern as `refresh-threads-token.mjs`).
3. **Failure surfacing.** On any error, open or comment on a `[whoop-auth] …` issue (mirrors the Threads pattern). Don't fail the whole `fetch-daily.yml` run — `continue-on-error: true` on the step.

### 4.3 Why "always refresh"

Whoop's access tokens last 1 hour; refresh tokens are single-use and rotate on every refresh call. The cleanest model is: refresh → fetch → save both new tokens. This way:

- We never have a stale access token at fetch time.
- The refresh chain is exercised daily, so if Whoop changes the refresh flow we find out within 24h, not in 60 days.
- A separate `refresh-whoop-token.mjs` exists only as a manual recovery tool, not a cron.

### 4.4 Single-use refresh token gotcha

Because refresh tokens rotate, **the script must persist the new refresh token back to the secret before exiting, even if the subsequent fetch fails.** Sequence:

1. Refresh → get new `{access, refresh}`.
2. **`gh secret set WHOOP_REFRESH_TOKEN` immediately**, before anything else can fail.
3. Then `gh secret set WHOOP_ACCESS_TOKEN`.
4. Then fetch + write JSON.

If we fetch first and the fetch errors, the old refresh token is already invalidated by Whoop's side — we'd lose the chain and have to re-bootstrap. The "rotate first" order avoids this.

### 4.5 Endpoint reference (confirmed against live docs 2026-05-19)

- **Authorize:** `https://api.prod.whoop.com/oauth/oauth2/auth`
- **Token / refresh:** `https://api.prod.whoop.com/oauth/oauth2/token`
- **Workouts collection (v2):** `https://api.prod.whoop.com/v2/activity/workout` (paginated via `next_token`; `start`/`end` query params accept ISO timestamps; `limit` controls page size)

Full response shape + field-by-field notes live in `docs/research/whoop-api.md` §3. Reference that doc rather than re-deriving fields. Pin the script preamble to "v2 schema confirmed 2026-05-19" so future-us knows when to revisit.

### 4.6 Movement-sport allowlist

Whoop v2 returns recovery activities (meditation, ice bath, sauna, massage, etc.) through the workouts endpoint alongside actual training sessions. For the headline "latest workout" framing on the home strip and `/now`, those are noise.

The fetch script filters via an inline allowlist before writing `whoop.json`. Initial set (refine after first week of real data):

```
running, cycling, rowing, swimming, weightlifting, powerlifting,
functional fitness, hiit, jiu jitsu, martial arts, boxing,
kickboxing, wrestling, rock climbing, hiking/rucking,
strength trainer, spin, elliptical, stairmaster,
yoga, pilates, barre, f45 training, …
```

Excluded: meditation, ice bath, sauna, massage therapy, air compression, percussive massage, stretching, dog walking, etc. Marked `// TUNE ME` in the script so it's findable.

The `/move` page (§5) can optionally surface recovery activities in a separate section — out of scope for v1.

---

## 5. `/move` page — `src/pages/move/index.astro`

Light first cut, modelled on `/code` and `/listen`. Full design can iterate; this section sets the scope.

### 5.1 Layout

1. **Page header** — `<h1>Move</h1>` left, "Updated DD Month YYYY" mono right (sourced from `whoop.json` `lastUpdated`).
2. **Headline row** — `MoveWidget` (full variant) at the top, full-width.
3. **Strain heatmap** — per-day max strain over the last 90 days, rendered as a contribution-style grid. Reuses `ContributionHeatmap` semantics if practical (it currently expects GitHub-shaped data — extracting a generic heatmap is a maybe, see §7).
4. **Recent workouts list** — vertical list of `recentWorkouts`, one row each: sport name, ISO date, duration, strain. Hairline divider between rows. No avatars/icons.
5. **Empty state** — `No sessions logged yet. <a href="https://whoop.com">whoop.com</a>` if `recentWorkouts` is empty.

### 5.2 Breadcrumb + meta

- Breadcrumb: Home → Move.
- Title: `Move`.
- Description: short string in `src/utils/site.ts` (e.g. `SITE_MOVE_DESCRIPTION`). Not in the BIO; that stays static per `feedback_gvns_bio_static`.
- Accent: P6 crimson throughout.

### 5.3 Files

| File | Action |
|---|---|
| `src/pages/move/index.astro` | **New.** Reads `src/data/whoop.json`, renders header + widget + heatmap + list. |
| `src/components/WorkoutList.astro` | **New.** Section wrapper. Mirrors `BookList.astro` shape. |
| `src/components/WorkoutRow.astro` | **New.** One row. Mirrors `BookCard.astro`'s compact density. |
| `src/components/StrainHeatmap.astro` | **New** (or generalise `ContributionHeatmap`). 90-day grid, P6 crimson scale. |
| `src/components/Header.astro` | **Edit.** Add `Move` to the nav links (or omit — see §7). |

---

## 6. Design system — P6 crimson token

### 6.1 Token

| Token | Light | Dark |
|---|---|---|
| `--colour-p6-crimson` | `#dc143c` (TBD — see §7) | `#dc143c` (TBD) |
| `--colour-p6-crimson-hover` | derive 8% lighter | derive 8% lighter |

Add to `src/styles/global.css` alongside P1–P5. Update any shared gradient that enumerates the palette (`--gvns-activity-gradient` in `global.css`, consumed by the masthead stripe + footer gradient line) to **6 stops** instead of 5, hard stops at 16.6 / 33.3 / 50 / 66.6 / 83.3 %.

### 6.2 Audit of consumers

- `ActivityBar.astro` — reads the gradient variable, no change beyond the variable update.
- `Header.astro` masthead stripe — same.
- `Footer.astro` 80×2px gradient line — same.
- Any existing P1–P5 enum-style references in components → grep for `--colour-p1-` through `--colour-p5-` and confirm no code relies on a 5-stop assumption.

### 6.3 Why crimson, not Whoop-brand red

Whoop's brand red is roughly `#FF0026` — saturated, very close to P2 rose. Pulling the value down to a crimson (`#dc143c` range) puts visible distance between this widget and "read" on the home strip, and reads less product-branded. Open to a riff (§7).

---

## 7. Open questions

1. **Exact P6 hex.** `#dc143c` is a placeholder. Worth dropping P2 rose, the candidate P6, and the existing palette into a swatch grid before PR 1 lands. Crimson vs deeper burgundy vs orange-leaning — small choice, big visual.
2. **Generalise `ContributionHeatmap` or build `StrainHeatmap` standalone?** GitHub-shaped vs strain-shaped data differs (continuous score vs discrete count). Could go either way; defer the call until PR 4.
3. **Add `Move` to the top-nav?** The other activity pages (`/read`, `/listen`, `/watch`, `/code`) aren't in the top-nav — they're reached via `/now` widget links. Consistency says don't add. But "Move" being net-new might warrant a launch nudge for the first month. Decide at PR 5.
4. **Sport-name display mapping.** v2 returns `sport_name` directly — no lookup table. The fetch script keeps a small inline `SPORT_DISPLAY_MAP` for special cases (`jiu jitsu` → `Jiu-jitsu`, `hiit` → `HIIT`, etc.) and title-cases the rest. Log unseen `sport_name` values as warnings so the map + the movement-sport allowlist stay current.
5. **Display when the latest workout is ≥7 days old.** The compact cell saying "Jiu-jitsu · 47 min · strain 14.2" with `time` saying "9 days ago" is slightly awkward. Either show the timestamp prominently in compact, or render an empty state after N days idle. Suggest: 14-day cutoff to empty state.
6. **Privacy review.** Workout names + strain + duration are fine. The sport-ID list reveals BJJ days, gym days, etc. — also fine. Add a `.privacy.md` note to `docs/` if anything subtler shows up during implementation.

---

## 8. Acceptance criteria

The integration ships when:

1. **Data pipeline.** `scripts/fetch-whoop.mjs` runs cleanly in CI on a daily cron, fetches workouts via Whoop's v2 API, writes a valid `src/data/whoop.json` matching §3.3, and rotates both access + refresh tokens back to GH secrets on every run (refresh first, before fetch).
2. **Bootstrap script.** `node scripts/whoop-auth-bootstrap.mjs` walks through Whoop's OAuth flow locally and prints the two tokens for `gh secret set`. Documented in a comment block at the top of the script.
3. **Failure surfacing.** Any fetch / refresh failure opens or comments on an existing `[whoop-auth] …` GitHub issue (mirrors `refresh-threads-token.mjs`).
4. **Widget — compact.** `MoveWidget.astro` (compact mode) renders inside the home widget strip. Strip grid expands to 6-up (`.gvns-activity-grid` breakpoints updated: 6 desktop / 3 tablet / 2 mobile / 1 narrow). Empty state reads `No recent sessions.`
5. **Widget — full.** Same component (`compact={false}`) renders inside the `/now` bento. Sits in a single cell; existing bento layout adapts (one cell either becomes wide-1×1, or `/now` grows to 7 cells with the responsive plan updated accordingly).
6. **`/move` page.** Reachable at `/move`. Renders the full `MoveWidget`, a 90-day strain heatmap (P6 crimson scale), and the `recentWorkouts` list. Breadcrumb Home → Move. Description meta string lives in `src/utils/site.ts`.
7. **P6 crimson token.** `--colour-p6-crimson` + `--colour-p6-crimson-hover` defined in `global.css`. `--gvns-activity-gradient` updated to a 6-stop gradient consumed correctly by the masthead stripe + footer gradient line + any `ActivityBar` instance. No visual regression on existing surfaces.
8. **No regressions.** `npm run build` clean. Lighthouse on `/`, `/now`, `/move` shows no regression vs current production. No new console warnings.
9. **Documentation.** Brief note added to `docs/INFRASTRUCTURE.md` (or equivalent) explaining the in-repo fetch + rotate pattern, since this is the first instance. Future fetchers (steam, github, hardcover, listenbrainz, trakt) should be able to use the same shape.

---

## 9. Suggested PR order

PR 1 — **P6 crimson token + gradient update.** `global.css` adds `--colour-p6-crimson` / `--colour-p6-crimson-hover`. `--gvns-activity-gradient` updates to 6 stops. Visual diff on masthead stripe + footer + any `ActivityBar` use. Pure design-system change; no widget yet. Resolves Open Q1 (exact hex).

PR 2 — **Whoop OAuth bootstrap + data pipeline.** `scripts/whoop-auth-bootstrap.mjs` + `scripts/fetch-whoop.mjs` + `scripts/refresh-whoop-token.mjs`. New `whoop` step in `fetch-daily.yml`. `WHOOP_ACCESS_TOKEN` + `WHOOP_REFRESH_TOKEN` set in repo secrets. **First successful `whoop.json` committed** before merging — that's the live integration test.

PR 3 — **`MoveWidget` (compact + full) + home strip integration.** Component lands consuming `whoop.json`. Home grid widens to 6-up. Doesn't touch `/now` or `/move` yet — small PR, easy to review visually.

PR 4 — **`/now` bento integration.** Wire `MoveWidget` (full) into the bento. Update responsive cell plan (6 → 7 cells, decide which cell becomes wide / large).

PR 5 — **`/move` page.** `WorkoutList`, `WorkoutRow`, strain heatmap (decide §7 Q2 here), header + breadcrumb. Optionally add `Move` to top-nav (§7 Q3).

PR 6 — **Documentation + cleanup.** Update `docs/INFRASTRUCTURE.md` with the in-repo fetch pattern; cross-link from `docs/SESSION-START.md`. Add a `docs/specs/` reference back to this file. Mark Open Questions as resolved or moved to follow-up issues.

**Dependency graph:**
- PR 1 → PR 3 (widget needs the token).
- PR 2 → PR 3 (widget needs the JSON).
- PR 3 → PRs 4 & 5 (parallelisable after PR 3).
- PR 6 last.

**Recommended landing order:** 1 → 2 (parallelisable with 1) → 3 → 4 → 5 → 6.

---

## 10. Notes for future me

- This is the **prototype** for in-repo data fetching. When migrating the existing fetchers (steam / github / hardcover / listenbrainz / trakt) off their sibling repos, the shape established by `fetch-whoop.mjs` + the `fetch-daily.yml` step is the template. Anything weird-but-necessary about Whoop's flow (refresh-first ordering, single-use refresh tokens) is genuinely specific to Whoop and shouldn't propagate.
- Refresh-token rotation is the riskiest part. The chain breaking means a manual bootstrap re-run. Worth setting a calendar reminder to spot-check the first month.
- If Whoop ever ships a public webhook (they've teased one), revisit whether daily cron is still the right shape — webhooks would let `/now` reflect a just-finished workout much sooner.
