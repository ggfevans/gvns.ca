# gvns.ca Workflow Fix — Findings

## Problem

The "protect da goods" ruleset (ID: 13171659) on `gvns.ca` requires the "Cloudflare Pages" status check (integration_id: 85455) to pass before any push to `main`. This blocks all 6 automated workflows that push data updates directly to main.

## Affected Workflows

| Workflow | Data File | Token Used |
|----------|-----------|------------|
| `fetch-watching.yml` | `src/data/watching.json` | `GH_PAT` |
| `fetch-gaming.yml` | `src/data/gaming.json` | `GITHUB_TOKEN` |
| `fetch-github.yml` | `src/data/github.json` | `GH_PAT` / `GITHUB_TOKEN` fallback |
| `fetch-listening.yml` | `src/data/listening.json` | `GITHUB_TOKEN` |
| `fetch-reading.yml` | `src/data/reading.json` | `GITHUB_TOKEN` |
| `syndicate.yml` | `src/content/writing/` | `GITHUB_TOKEN` |

All workflows share the same pattern: commit data changes, then `git push` directly to main with a retry loop.

## Ruleset Details

- **Name:** "protect da goods"
- **Enforcement:** active
- **Target:** `~DEFAULT_BRANCH` (main)
- **Rules:**
  - No deletion
  - No non-fast-forward
  - Required status check: "Cloudflare Pages"
- **Bypass list:** Not available on free plan

## Repo Settings

- `allow_auto_merge`: **true** (already enabled)
- `delete_branch_on_merge`: **true** (already enabled)

## Recommended Approach: PR-Based Workflow

Each workflow pushes to a temp branch, creates a PR, and auto-merges once Cloudflare Pages passes.

### Why this approach

- Works on free plan, no ruleset changes needed
- Every data update gets a legitimate Cloudflare Pages build
- Clean audit trail in PR history
- Minimal PR noise (auto-delete branches already enabled)

### Considerations

- All 6 workflows need the same change — extract shared push logic into a reusable pattern
- `fetch-gaming.yml` uses `GITHUB_TOKEN` — needs switching to `GH_PAT` (PATs can create PRs, `GITHUB_TOKEN` cannot trigger workflows on the PR branch)
- Branch naming should include workflow name to avoid collisions when multiple workflows run concurrently (e.g., `auto/update-watching-20260315`)
- `gh pr merge --auto --squash --delete-branch` handles the merge once Cloudflare Pages passes
- Retry logic for push/rebase can be simplified since we're no longer pushing to a protected branch

### Rejected Alternatives

- **Disable the status check:** Loses the Cloudflare Pages gate for human pushes
- **Split ruleset (PR-only scope):** Free plan limitations make this unreliable
