# Whoop Developer API — research notes

**Spike deliverable for [#563](https://github.com/ggfevans/gvns.ca/issues/563).**
**Date:** 2026-05-19
**Sources:** [Whoop developer docs](https://developer.whoop.com/docs/introduction) — specifically [OAuth 2.0](https://developer.whoop.com/docs/developing/oauth), [v1→v2 migration](https://developer.whoop.com/docs/developing/v1-v2-migration), [Workout data type](https://developer.whoop.com/docs/developing/user-data/workout), and [Pagination](https://developer.whoop.com/docs/developing/pagination).

This document confirms or revises every assumption in `docs/specs/move-widget-whoop-2026-05.md` §4–5 against the live Whoop docs. Where the spec is wrong, this doc is right.

---

## 1. Headline corrections to the spec

| Spec assumption | Reality | Impact |
|---|---|---|
| Workouts endpoint is `…/developer/v1/activity/workout` | **`…/v2/activity/workout`** — v1 is fully deprecated, no longer supported; v2 only going forward | Fetch script uses v2 paths. |
| Workout `id` is a UUID string | Confirmed for v2 (was `long` in v1) | Data contract unchanged. |
| Spec needs a hand-maintained `scripts/whoop-sports.json` lookup table | **Not needed.** v2 returns `sport_name` directly as a string. `sport_id` is the legacy integer enum and will not exist past 2025-09-01 | Delete the lookup file from spec §4.1 and from issue #567 acceptance. |
| Recovery / sleep / cycle endpoints are separate concerns deferred | **"Recovery activities are included in the Workouts endpoint"** in v2 | We may see `Activity` / `Recovery` entries in the workouts response. Decide whether to filter them out at fetch time. See §3.5. |

Everything else in the spec stands.

---

## 2. Authentication

### 2.1 App registration

App already exists — client ID `e888c435-61b2-4118-a80d-a5f781931fd3`, secret in 1Password. No new dashboard step needed for #566. When the bootstrap runs, set two repo secrets:

- `WHOOP_CLIENT_ID` — `e888c435-61b2-4118-a80d-a5f781931fd3` (not strictly secret — it's exposed to the user's browser during the OAuth redirect — but keeping it as a secret matches the convention)
- `WHOOP_CLIENT_SECRET` — the value from 1Password

### 2.2 OAuth endpoints (confirmed)

```text
Authorize : https://api.prod.whoop.com/oauth/oauth2/auth
Token     : https://api.prod.whoop.com/oauth/oauth2/token   (also handles refresh)
```

### 2.3 Scopes

The OAuth docs reference scopes generically and link to the API spec for the full list. From the migration guide, the v2 scope constants are `READ_WORKOUT`, `READ_SLEEP`, `READ_CYCLES` — string form in OAuth requests is conventionally lowercase-colon (`read:workout`, etc.). For the Move widget v1 we request:

- `read:workout` — required for the `/v2/activity/workout` endpoint
- `read:profile` — for the User endpoint (currently used only for the future "link to Whoop profile" idea; could drop if we never link out)
- `offline` — required to receive a refresh token

**Open item for the bootstrap PR (#566):** confirm exact scope string casing during first successful authorize call. Treat lowercase-colon as best-known; adjust if Whoop rejects it.

### 2.4 Token lifecycle — exact mechanics

- **Access tokens**: short-lived. Lifetime returned in `expires_in` (seconds) on every token response. Treat as expiring at `now + expires_in - 60s` to account for clock skew.
- **Refresh tokens**: single-use. Whoop's docs are explicit: *"the refresh token from the refresh response is now the valid refresh token, and your app must use the new refresh token on the subsequent refresh request."* This validates spec §4.4 — rotate first, persist new tokens before fetching.
- **Concurrent refresh hazard**: *"the first refresh request that reaches WHOOP will succeed. The second request would fail because the first request invalidates the refresh token."* The `fetch-daily.yml` workflow already has `concurrency: { group: fetch-daily, cancel-in-progress: false }` which prevents this for the cron path, but any manual `workflow_dispatch` run while another is in-flight would clobber. Add a refresh-mutex note to the script's preamble.

### 2.5 Token request shape (confirmed)

Refresh POST body — JSON, matching docs exactly:

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "<previous refresh token>",
  "client_id": "e888c435-61b2-4118-a80d-a5f781931fd3",
  "client_secret": "<from 1Password>",
  "scope": "offline"
}
```

Response:

```json
{
  "access_token": "<new access token>",
  "expires_in": 3600,
  "refresh_token": "<new refresh token — replace immediately>",
  "scope": "offline read:workout read:profile",
  "token_type": "bearer"
}
```

The docs example shows `expires_in: 3600` — i.e. one-hour access tokens. Confirm on first call; treat as the working assumption.

### 2.6 Revocation

There's a `revokeUserOauthAccess` endpoint if we ever need to disable the integration cleanly. Not needed for v1 of this widget.

---

## 3. Workouts endpoint

### 3.1 Path + auth

```text
GET https://api.prod.whoop.com/v2/activity/workout
Authorization: Bearer <access_token>
```

(Note the `v2` prefix is bare — not `/developer/v2`. The legacy pagination doc still shows `/developer/v1/…` in its example, but the migration guide is unambiguous: drop the `/developer` segment going forward.)

### 3.2 Query parameters

- `start` — ISO 8601 timestamp, inclusive lower bound
- `end` — ISO 8601 timestamp, exclusive upper bound
- `limit` — page size; endpoint-specific max (check OpenAPI; default works)
- `nextToken` — opaque cursor for pagination (see §3.4)

### 3.3 Response shape — workout record

Verbatim from the [Whoop Workout data type docs](https://developer.whoop.com/docs/developing/user-data/workout/) sample:

```json
{
  "id": "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
  "v1_id": 1043,
  "user_id": 9012,
  "created_at": "2022-04-24T11:25:44.774Z",
  "updated_at": "2022-04-24T14:25:44.774Z",
  "start": "2022-04-24T02:25:44.774Z",
  "end": "2022-04-24T10:25:44.774Z",
  "timezone_offset": "-05:00",
  "sport_name": "running",
  "score_state": "SCORED",
  "score": {
    "strain": 8.2463,
    "average_heart_rate": 123,
    "max_heart_rate": 146,
    "kilojoule": 1569.34033203125,
    "percent_recorded": 100,
    "distance_meter": 1772.77035916,
    "altitude_gain_meter": 46.64384460449,
    "altitude_change_meter": -0.781372010707855,
    "zone_durations": {
      "zone_zero_milli": 300000,
      "zone_one_milli": 600000,
      "zone_two_milli": 900000,
      "zone_three_milli": 900000,
      "zone_four_milli": 600000,
      "zone_five_milli": 300000
    }
  },
  "sport_id": 1
}
```

Key fields for the widget:

- **`id`** — UUID, primary key for dedupe.
- **`start`, `end`** — both required, ISO timestamps. Duration = `end - start`. Don't compute from `created_at` — that's when Whoop ingested the activity, not when it happened.
- **`timezone_offset`** — display in user's local zone if we ever want "this morning's BJJ" framing. v1 of the widget can ignore.
- **`sport_name`** — string, lowercase (`"running"`, `"jiu jitsu"`, etc.). We may want to title-case for display, or maintain a tiny presentation map for special cases (`"jiu jitsu"` → `"Jiu-jitsu"`, `"hiit"` → `"HIIT"`).
- **`score_state`** — `SCORED` / `PENDING_SCORE` / `UNSCORABLE`. **Only show in widget when `SCORED`.** Pending or unscorable workouts have no `score` object and can't render strain.
- **`score.strain`** — float, 0–21 logarithmic. Render to one decimal place per spec §3.4.

Fields we deliberately ignore for v1: `average_heart_rate`, `max_heart_rate`, `kilojoule`, `percent_recorded`, `distance_meter`, `altitude_*`, `zone_durations`. They're available if we want them later on `/move`.

### 3.4 Pagination

Response envelope (from docs):

```json
{
  "records": [ /* workout objects */ ],
  "next_token": "eyIkIjoib0AxIiwibyI6MTB9"
}
```

Iterate until `next_token` is empty string. We're capping at 30 entries in `whoop.json` so one page should almost always suffice — but the script should still handle pagination correctly for the first-run backfill (last 30 days might span multiple pages on heavy training schedules).

### 3.5 Decision: filter out non-workout activities

v2 returns recovery activities through the workouts endpoint. The sport_name values likely include things like `"Activity"` (sport_id -1) for generic, plus things like `"Meditation"`, `"Ice Bath"`, `"Stretching"`, `"Sauna"` from the v1 sport-id table that look like recovery, not training. For the headline "latest workout" framing, those would be noise.

**Recommendation:** during the fetch script, filter the response down to a sport allowlist for the headline / widget. Keep the full unfiltered list available in `whoop.json` for `/move` if we want to surface recovery activities there later.

Initial allowlist (training-coded sports — refine based on what the user's account actually returns):

```js
const TRAINING_SPORTS = new Set([
  "running", "cycling", "rowing", "swimming",
  "weightlifting", "powerlifting", "functional fitness", "hiit",
  "jiu jitsu", "martial arts", "boxing", "kickboxing", "wrestling",
  "rock climbing", "hiking/rucking", "cross country skiing",
  "strength trainer", "spin", "elliptical", "stairmaster",
  "yoga", "pilates", "barre", "f45 training",
  // ...etc — expand on first-run review
]);
```

Out: meditation, ice bath, sauna, massage, stretching, air compression, percussive massage, dog walking, etc.

Mark this list as a `// TUNE ME` block in the fetch script — refine after a week of real data.

---

## 4. Other relevant endpoints (not used in v1)

For completeness, in case scope expands later:

| Endpoint | Purpose | Required scope |
|---|---|---|
| `GET /v2/cycle` | Daily cycle (cumulative strain, kilojoules, HR) | `read:cycles` |
| `GET /v2/recovery` | Morning recovery score, HRV, RHR | `read:recovery` |
| `GET /v2/activity/sleep` | Sleep duration, efficiency, stages | `read:sleep` |
| `GET /v2/user/profile/basic` | First name, last name, email | `read:profile` |
| `GET /v1/activity-mapping/{activityV1Id}` | Migration-only: v1 ID → v2 UUID | none specific |

Webhooks exist in v2 with UUID payloads for `workout.updated/deleted`, `sleep.updated/deleted`, `recovery.updated/deleted`. If we ever want near-realtime widget updates we'd add a Cloudflare Workers webhook receiver — out of scope for the current epic.

---

## 5. Rate limiting

The docs reference an [API Rate Limiting](https://developer.whoop.com/docs/developing/rate-limiting) page (not fetched during this spike — flag as residual unknown). Given the fetch script runs once daily and makes ≤2 calls (refresh + workouts), rate limits are extremely unlikely to bite. Verify the exact limits during PR for #567 so we can document them in the script preamble.

---

## 6. Recommended sample `whoop.json` shape

Aligned to the data contract in spec §3.3, but post-v2-correction (no `sportId` field — `sport_name` only):

```json
{
  "lastUpdated": "2026-05-19T03:00:00.000Z",
  "profile": {
    "profileUrl": "https://www.whoop.com/"
  },
  "recentWorkouts": [
    {
      "id": "ecfc6a15-4661-442f-a9a4-f160dd7afae8",
      "sport": "Jiu-jitsu",
      "sportRaw": "jiu jitsu",
      "start": "2026-05-18T18:00:00.000Z",
      "end": "2026-05-18T18:47:00.000Z",
      "durationMinutes": 47,
      "strain": 14.2,
      "scoreState": "SCORED"
    }
  ]
}
```

Fields:

- `sport` — display-ready string (title-cased + special-case map). What the widget renders.
- `sportRaw` — Whoop's lowercase value, kept for debugging / future filter changes.
- `durationMinutes` — pre-computed (rounded) so the widget doesn't need to do date math.
- `scoreState` — kept so the widget knows whether `strain` is real or a pending fill.

Workouts with `scoreState !== "SCORED"` should still appear in the array, but the widget renders them as `(pending score)` rather than `strain 14.2`.

---

## 7. Implementation notes for #566 (bootstrap) and #567 (fetch)

### Bootstrap (#566)

- Client ID is already provisioned — script can hard-code it as a constant or read from env. Prefer env for portability across users.
- Redirect URL needs to be registered in the Whoop dashboard before the first bootstrap run. `http://localhost:8910/callback` won't work because Whoop's docs show `https://` or app-scheme URLs only. **Verify whether Whoop accepts `http://localhost` for development.** If not, route through a temporary public URL (ngrok, or a one-time Cloudflare quick tunnel). This is the one residual unknown that could bite during bootstrap.
- After bootstrap success, the script should print three `gh secret set` commands ready to copy.

### Fetch (#567)

- **No `whoop-sports.json` lookup table needed.** Strike that line item from the issue. Build a tiny presentation map directly in the fetch script for known special cases (`"jiu jitsu"` → `"Jiu-jitsu"`, `"hiit"` → `"HIIT"`, `"f45 training"` → `"F45 Training"`, etc.).
- Filter the workouts array via the movement-sport allowlist (§3.5) before writing to JSON.
- On first run (no existing `whoop.json` or no `lastUpdated`): fetch last 30 days.
- On subsequent runs: fetch from `lastUpdated - 24h` to now (the 24h buffer catches late-syncing workouts).
- Dedupe on `id`, sort by `start` descending, cap to 30 entries.
- Always `JSON.stringify(data, null, 2)` so the committed file is diff-friendly.

---

## 8. Residual unknowns to verify during implementation

1. **Exact scope string casing** (`read:workout` vs `READ_WORKOUT` vs something else). Confirm on first authorize call.
2. **Rate limit numbers.** Likely irrelevant for daily polling but document in script header.
3. **Redirect URL — does Whoop accept `http://localhost`?** Critical for bootstrap UX. If not, use a Cloudflare quick tunnel or similar for the one-time flow.
4. **Whether `sport_name` for Brazilian Jiu-Jitsu is `"jiu jitsu"` or `"jiu-jitsu"` or `"brazilian jiu-jitsu"`.** Inspect first real response and update the presentation map.
5. **Behaviour when `score_state` is `PENDING_SCORE`** — does the score object exist with nulls, or is it omitted entirely? Affects widget render logic.

None of these are blockers for landing the issue — they're things to confirm-and-document during the implementation PRs.
