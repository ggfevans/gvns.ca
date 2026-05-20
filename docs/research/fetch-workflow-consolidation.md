# Spike: consolidating fetch workflows

**Issue:** [#336](https://github.com/ggfevans/gvns.ca/issues/336)
**Date:** 2026-05-13
**Recommendation:** **Option C-partial** — consolidate the five daily fetchers into one workflow, keep `fetch-comments` separate.

## Current state

Six workflows, each on its own cron, each opening its own PR via the shared `commit-via-pr` composite action.

| Workflow | Cadence | Cron | Step runtime (recent) | Status |
|---|---|---|---|---|
| `fetch-comments` | hourly | `0 * * * *` | ~27s | last run 2026-04-26 — failure |
| `fetch-gaming` | daily | `42 3 * * *` | ~9–16s | failing daily since at least 2026-04-09 (see #334) |
| `fetch-github` | daily | `17 3 * * *` | ~14–26s | green since recent fix |
| `fetch-listening` | daily | `17 2 * * *` | ~14–31s | green |
| `fetch-reading` | daily | `0 0 * * *` | ~12–25s | green (one transient failure 2026-05-07) |
| `fetch-watching` | daily | `0 0 * * *` | ~17–29s | green |

Sources: `.github/workflows/fetch-*.yml`, `gh run list --workflow=<name>.yml --limit 10`.

Two workflows (`fetch-reading`, `fetch-watching`) currently collide on `0 0 * * *`. Not a problem in practice — independent runners — but worth noting as accidental coupling.

### What each commits

| Workflow | Output path | Underlying action |
|---|---|---|
| `fetch-comments` | `src/data/comments/` (directory) | `node scripts/fetch-comments.mjs` (in-repo) |
| `fetch-gaming` | `src/data/gaming.json` | `ggfevans/steam-json-bourne` (vendored, commits internally with `skip_commit: false`) |
| `fetch-github` | `src/data/github.json` | `ggfevans/github-json-bourne` (vendored) |
| `fetch-listening` | `src/data/listening.json` | `ggfevans/listenbrainz-json-bourne` (vendored, commits internally) |
| `fetch-reading` | `src/data/reading.json` | `ggfevans/hardcover-github-action` (vendored) |
| `fetch-watching` | `src/data/watching.json` | `ggfevans/trakt-json-bourne` (vendored) |

The `commit-via-pr` action wraps everything in a PR-and-merge cycle. Two of the vendored actions (`steam-json-bourne`, `listenbrainz-json-bourne`) commit locally; `commit-via-pr` detects that via `git rev-list origin/main..HEAD` and routes it through a PR rather than a direct push. The others write a file and let `commit-via-pr` stage and commit it.

## Cost model

Repo is **public**, so GitHub Actions minutes are unlimited. The "save runner-minutes" framing from the original issue doesn't apply — there's no billing pressure.

The actual costs of the status quo are:

1. **PR noise.** Up to 5 daily PRs + 24 hourly comment PRs = ~29 auto-merged PRs/day. Drowns out human PRs in notifications and `gh pr list`.
2. **Maintenance surface.** Six near-identical YAML files. When a checkout action version, Node version, or commit pattern changes, it changes in six places (e.g., #338 — `node25` runner support — would have hit all six).
3. **Cold-start latency.** Each workflow spins up a fresh runner (~10–15s of overhead before the first useful second). Irrelevant for batch fetches but real if any of these ever become interactive.

The status-quo *benefit* is failure isolation: `fetch-gaming` has been red since April without affecting any other fetcher.

## Options

### A — Status quo (six workflows)

- **Maintenance:** six files, six crons.
- **PR noise:** ~29 PRs/day (5 daily + 24 hourly).
- **Failure isolation:** maximal.
- **Verdict:** baseline.

### B — Single workflow, matrix per source (parallel jobs)

```yaml
strategy:
  matrix:
    source: [gaming, github, listening, reading, watching]
```

- **Maintenance:** one file, one cron, but each matrix leg still needs its source-specific action invocation — so the file still encodes six branches (or a step-conditional dispatcher).
- **PR noise:** Could be one PR per leg (no improvement) or one batched PR if the matrix has a follow-up commit job. Batching across parallel jobs needs an artifact handoff — adds complexity.
- **Failure isolation:** good, with `continue-on-error: true` per leg.
- **Cost:** same number of runners as A; matrix doesn't reduce runner count, it just centralises the YAML.
- **Verdict:** middling. You pay the design cost of consolidation without the PR-noise payoff unless you also add a batching job.

### C — Single workflow, sequential steps (one runner, one PR)

```yaml
jobs:
  fetch-all:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - fetch gaming   (continue-on-error)
      - fetch github   (continue-on-error)
      - fetch listening (continue-on-error)
      - fetch reading  (continue-on-error)
      - fetch watching (continue-on-error)
      - commit-via-pr  (one PR, all sources)
      - report any failed steps
```

- **Maintenance:** one file. `continue-on-error: true` per fetch step keeps a Steam failure from blocking the rest. A final `if: failure()` step (or `steps.*.outcome` check) can post a summary annotation listing which sources failed.
- **PR noise:** **one PR per day** instead of five.
- **Failure isolation:** preserved at step level. A failed step is visible in the run summary and can be alerted on; it doesn't block the others or the commit.
- **Cost:** runtime is sum of step times — ~70–100s wall-clock vs. ~30s for the slowest. Still trivial.
- **Side effects to reconcile:**
  - `steam-json-bourne` and `listenbrainz-json-bourne` commit internally. In a sequential run, each will produce its own local commit on the same branch — `commit-via-pr` will then see a chain of commits, not one. Either pass `skip_commit: true` and let `commit-via-pr` handle everything, or accept multiple commits inside one PR.
  - The two vendored actions that *don't* commit (`hardcover`, `trakt`, `github-json-bourne`) just write files — fine.
  - Recommend: set `skip_commit: true` everywhere, let `commit-via-pr` stage `src/data/` at the end.
- **Verdict:** **best fit for this repo.** The PR-noise problem is the one cost the status quo actually imposes, and C is the only option that solves it.

### Why exclude `fetch-comments` from consolidation

- Different cadence (hourly vs daily). Putting it in C means either downgrading comments to daily, upgrading the rest to hourly (wasteful), or running the consolidated workflow twice with conditional steps (complexity).
- It's the one fetcher whose data is *interactive* (replies on posts). Daily latency would be visibly worse for readers.
- Different commit path (writes a directory of files via an in-repo script, not a vendored action) — less natural to fold in.

So: keep `fetch-comments` standalone. Consolidate the other five.

## Recommendation

**Adopt Option C-partial:**

1. Create `fetch-daily.yml` — single workflow, sequential `continue-on-error` steps for gaming/github/listening/reading/watching, single `commit-via-pr` at the end. Cron at `0 3 * * *` (off-peak, lines up with the existing GitHub/gaming window).
2. Delete `fetch-gaming.yml`, `fetch-github.yml`, `fetch-listening.yml`, `fetch-reading.yml`, `fetch-watching.yml`.
3. Keep `fetch-comments.yml` unchanged.
4. Add a final step that fails the *workflow* if any fetch step failed — keeps red runs visible without blocking the commit.

**Net effect:**

- 6 workflow files → 2.
- ~29 PRs/day → ~25 (5 daily merged into 1; comments unchanged).
- Single place to bump action versions for the five vendored fetchers.
- `fetch-comments` remains independently debuggable / pausable.

## Open questions / risks

- **Vendored actions that commit internally.** Need to verify all of them accept `skip_commit: true` (or equivalent). Quick check: `steam-json-bourne` and `listenbrainz-json-bourne` both expose the flag based on current usage; the others (`github-json-bourne`, `hardcover-github-action`, `trakt-json-bourne`) don't appear to commit at all. **Action:** confirm in the implementation issue.
- **Branch protection interaction (#263).** The consolidated PR will touch five JSON files instead of one — slightly larger diff, no semantic change. CODEOWNERS doesn't gate `src/data/`. Should be fine.
- **Per-source secrets.** All five actions use different secrets (`STEAM_API_KEY`, `GH_PAT`, `LISTENBRAINZ_USERNAME`, `HARDCOVER_TOKEN`/`HARDCOVER_USER_ID`, `TRAKT_CLIENT_ID`/`TMDB_API_KEY`). One workflow, all secrets in `env:` — no security regression.
- **Bisecting failures.** When a consolidated run goes red, the bad step is named in the run summary. As long as `continue-on-error: true` + an explicit final "fail if any failed" step is in place, this stays diagnosable.
- **Don't fix #334 in the consolidation PR.** The Steam fetch is broken for an upstream reason (per #334). Fix that first; do consolidation after the green runs are in place, so the rollover is from "5 green workflows" to "1 green workflow", not "4 green + 1 broken" to "1 partially broken".

## Implementation issue (next step)

Open a follow-up `feat(fetch): consolidate daily fetchers into fetch-daily.yml` once #334 is closed and the Steam fetch is green. Tasks:

- [ ] Verify all five vendored actions support `skip_commit` or don't commit at all.
- [ ] Write `fetch-daily.yml` with the five sources as sequential steps, `continue-on-error: true`, single `commit-via-pr` at end.
- [ ] Add summary step: `if: always()` reporting per-step outcomes; fail workflow if any step failed.
- [ ] Delete the five superseded workflow files.
- [ ] Run `gh workflow run fetch-daily.yml` and confirm one PR, five JSON files updated.
- [ ] Monitor next two scheduled runs.
