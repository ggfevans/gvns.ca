# github-json-bourne: Implementation Plan

## Overview

Extract gwilym.ca's inline GitHub data fetching workflow into a standalone, reusable GitHub Action. Fix fragility issues, add schema validation, publish to Marketplace, and enhance the consuming components.

**Two repos involved:**
- `~/code/projects/github-json-bourne` — the Action itself (new repo, already created)
- `~/code/projects/gwilym.ca` — the consumer (update workflow + enhance components)

---

## Phase 1: Bootstrap the Action repo

**Goal:** Scaffold `github-json-bourne` as a proper Node.js GitHub Action.

**Files to create in `~/code/projects/github-json-bourne`:**

### 1.1 `action.yml` — Action metadata

```yaml
name: 'GitHub JSON Bourne'
description: 'Fetch GitHub profile data (contributions, heatmap, streak, activity, repos) as clean JSON'
author: 'ggfevans'

branding:
  icon: 'activity'
  color: 'purple'

inputs:
  username:
    description: 'GitHub username to fetch data for'
    required: false
    default: '${{ github.repository_owner }}'
  token:
    description: 'GitHub token (PAT for private contributions, or GITHUB_TOKEN for public only)'
    required: false
    default: '${{ github.token }}'
  output-path:
    description: 'Path to write the JSON output file'
    required: false
    default: 'github.json'
  max-repos:
    description: 'Maximum number of repositories to include'
    required: false
    default: '12'
  max-activities:
    description: 'Maximum number of recent activities to include'
    required: false
    default: '30'

outputs:
  json-path:
    description: 'Path to the generated JSON file'
  last-updated:
    description: 'ISO timestamp of when data was fetched'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

### 1.2 `package.json`

```json
{
  "name": "github-json-bourne",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "ncc build src/index.js -o dist",
    "test": "node --test src/**/*.test.js",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@actions/core": "^1.11.1",
    "@octokit/graphql": "^8.2.1",
    "@octokit/rest": "^21.1.1"
  },
  "devDependencies": {
    "@vercel/ncc": "^0.38.3"
  }
}
```

### 1.3 Source structure

```text
src/
├── index.js          # Entry point — orchestrates fetch + validate + write
├── contributions.js  # GraphQL query for contributions + calendar
├── activity.js       # REST: events → commit/PR/issue activities
├── repos.js          # REST: user repos with language metadata
├── streak.js         # Calculate streak from calendar data
├── stats.js          # Calculate weekly/monthly stats from calendar + activity
├── schema.js         # JSON schema validation (validate before write)
├── lang-colours.js   # Language colour map (extracted from current workflow)
└── __tests__/
    ├── streak.test.js
    ├── stats.test.js
    └── schema.test.js
```

### 1.4 `.gitignore`

```gitignore
node_modules/
# dist/ is committed (required for GitHub Actions)
```

**Note:** `dist/` must be committed — GitHub Actions requires pre-built output.

---

## Phase 2: Implement the core fetch logic

Port the bash logic to Node.js, fixing issues along the way.

### 2.1 `src/contributions.js` — GraphQL contributions + calendar

Port the existing GraphQL query. Returns `{ contributions, calendar }`.

**Key fix:** Use `@octokit/graphql` instead of raw `curl`. The query is identical to the current one (lines 31-51 of `fetch-github.yml`).

Transform `contributionLevel` enum to 0-4 levels (same mapping as current jq).

### 2.2 `src/activity.js` — Recent activity feed

Port the events parsing (lines 128-232 of current workflow).

**Key fix: eliminate N+1 API calls.** The current workflow loops through every PushEvent and calls the compare API for each one. Instead:

- For PushEvents: use the `payload.commits[]` array directly from the events API response (it includes commit messages and SHAs). Only call compare API if commit count > 20 (the events API truncates at 20).
- For PRs and issues: same parsing as current (straightforward).

This reduces API calls from potentially dozens to just 3 (one per events page).

### 2.3 `src/repos.js` — Repositories

Port lines 268-303. Same REST call: `GET /users/{user}/repos?sort=pushed&per_page=100&type=owner`. Filter out forks/archived. Add language colours from `lang-colours.js`.

### 2.4 `src/streak.js` — Streak calculation

Port the jq streak logic (lines 100-126) to JS. Pure function: takes calendar days array, returns `{ current, longest, today }`.

**Key fix:** Use `new Date()` instead of `date -u` commands. No platform-specific issues.

### 2.5 `src/stats.js` — Weekly/monthly stats

Port lines 234-265. Pure function: takes calendar + activities, returns stats object.

**Key fix:** Replace `date -u -d '7 days ago'` / `date -u -v-7d` with:
```js
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
```

### 2.6 `src/schema.js` — Validation

Validate the assembled JSON before writing. Check:
- All required top-level keys exist
- `contributions` has expected numeric fields
- `calendar.weeks[].days[]` have `date`, `count`, `level`
- `recentActivity[]` items have `type`, `repo`, `title`, `url`, `date`
- `repositories[]` have `name`, `url`

Throw with descriptive error if validation fails. This catches upstream API changes early.

### 2.7 `src/index.js` — Orchestrator

```js
import * as core from '@actions/core';
import { fetchContributions } from './contributions.js';
import { fetchActivity } from './activity.js';
import { fetchRepos } from './repos.js';
import { calculateStreak } from './streak.js';
import { calculateStats } from './stats.js';
import { validate } from './schema.js';
import fs from 'node:fs';
import path from 'node:path';

async function run() {
  const username = core.getInput('username');
  const token = core.getInput('token');
  const outputPath = core.getInput('output-path');
  const maxRepos = parseInt(core.getInput('max-repos'), 10);
  const maxActivities = parseInt(core.getInput('max-activities'), 10);

  // Fetch in parallel — contributions (GraphQL) + activity (REST) + repos (REST)
  const [{ contributions, calendar }, recentActivity, repositories] =
    await Promise.all([
      fetchContributions(username, token),
      fetchActivity(username, token, maxActivities),
      fetchRepos(username, token, maxRepos),
    ]);

  const streak = calculateStreak(calendar);
  const stats = calculateStats(calendar, recentActivity);

  const data = {
    lastUpdated: new Date().toISOString(),
    contributions,
    calendar,
    streak,
    recentActivity,
    stats,
    repositories,
  };

  validate(data); // throws on invalid

  const outDir = path.dirname(outputPath);
  if (outDir !== '.') fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  core.setOutput('json-path', outputPath);
  core.setOutput('last-updated', data.lastUpdated);
  core.info(`Wrote ${outputPath} (${data.recentActivity.length} activities, ${data.repositories.length} repos)`);
}

run().catch((err) => core.setFailed(err.message));
```

---

## Phase 3: Tests + build

### 3.1 Unit tests

- `streak.test.js` — test streak calculation with various calendar patterns (no contributions, continuous, gaps, today empty)
- `stats.test.js` — test weekly/monthly counting
- `schema.test.js` — test validation catches missing fields, wrong types

### 3.2 Build with ncc

```bash
npm run build  # bundles to dist/index.js
```

Commit `dist/` (required for Actions).

### 3.3 CI workflow for the Action repo itself

`.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: Verify dist is up to date
        run: git diff --exit-code dist/
```

---

## Phase 4: Update gwilym.ca to consume the Action

### 4.1 Replace inline workflow

Replace the entire contents of `.github/workflows/fetch-github.yml` with:

```yaml
name: Fetch GitHub Data

on:
  schedule:
    - cron: "17 3 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Fetch GitHub activity
        uses: ggfevans/github-json-bourne@v1
        with:
          username: ${{ github.repository_owner }}
          token: ${{ secrets.GH_PAT || secrets.GITHUB_TOKEN }}
          output-path: src/data/github.json

      - name: Commit and push if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add src/data/github.json
          if ! git diff --staged --quiet; then
            git commit -m "chore: update github activity data"
            git pull --rebase || true
            git push
          else
            echo "No changes to commit"
          fi
```

**Before/after:** ~350 lines of bash → ~30 lines of YAML.

### 4.2 Verify JSON schema compatibility

The Action's output schema MUST match the existing `GitHubData` interface in `src/utils/github.ts`. No changes needed to the TypeScript types — the Action produces the same shape.

Key fields to verify:
- `lastUpdated` (string, ISO)
- `contributions` (object with `total`, `commits`, `pullRequests`, `pullRequestReviews`, `issues`, `restricted`)
- `calendar` (object with `weeks[].days[]` where each day has `date`, `count`, `level`)
- `streak` (object with `current`, `longest`, `today`)
- `recentActivity` (array of `{ type, repo, repoUrl, title, url, date, meta? }`)
- `stats` (object with `commitsThisWeek`, `commitsThisMonth`, `contributionsThisWeek`, `contributionsThisMonth`, `repositoriesThisWeek`)
- `repositories` (array of `{ name, description, language, languageColor, stars, url }`)

---

## Phase 5: Enhance components in gwilym.ca

### 5.1 ContributionHeatmap — add tooltip

Update `ContributionHeatmap.tsx` to show contribution count on hover using `react-activity-calendar`'s built-in tooltip support (peer dependency on `react-tooltip`):

```tsx
import { Tooltip as ReactTooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

// In the component:
<ActivityCalendar
  data={days}
  theme={violetTheme}
  // ... existing props ...
  renderBlock={(block, activity) =>
    React.cloneElement(block, {
      'data-tooltip-id': 'heatmap-tooltip',
      'data-tooltip-content': `${activity.count} contributions on ${activity.date}`,
    })
  }
/>
<ReactTooltip id="heatmap-tooltip" />
```

### 5.2 ActivityTimeline — empty state

Add a proper empty state when no activities exist (currently the section just doesn't render). A subtle "No recent activity" message matching the CodeWidget empty state pattern.

### 5.3 ActivityTimeline — commit grouping (nice-to-have)

When multiple commits in the same repo happen close together, group them:
- "3 commits to gwilym.ca" with expandable detail
- Reduces visual noise for busy days

Can defer if scope feels large.

---

## Phase 6: Publish to Marketplace + docs

### 6.1 README.md for github-json-bourne

Cover: what it does, usage example, all inputs/outputs, output schema, example workflow.

### 6.2 Example workflow

`examples/basic.yml` showing:
- Scheduled daily run
- Commit and push pattern
- Using with a PAT for private contributions

### 6.3 Marketplace publishing

1. Tag `v1.0.0`
2. Create GitHub Release with release notes
3. The `action.yml` + branding handles Marketplace listing automatically

### 6.4 CONTRIBUTING.md

Brief guide: develop locally, run tests, build dist.

---

## Execution Order

| # | Phase | Repo | Depends On | Parallel? |
|---|-------|------|------------|-----------|
| 1 | Bootstrap Action | github-json-bourne | — | — |
| 2 | Core fetch logic | github-json-bourne | Phase 1 | — |
| 3 | Tests + build | github-json-bourne | Phase 2 | — |
| 4 | Update gwilym.ca workflow | gwilym.ca | Phase 3 | Yes (with 6) |
| 5 | Enhance components | gwilym.ca | Phase 4 | — |
| 6 | Publish + docs | github-json-bourne | Phase 3 | Yes (with 4) |

Phases 4+5 and 6 can run in parallel once Phase 3 is done.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Node.js with ncc bundle | Standard for GitHub Actions, fixes date portability, proper error handling |
| Use `payload.commits[]` from events API | Eliminates N+1 compare API calls (biggest perf fix) |
| Validate JSON before write | Catches upstream API changes, prevents corrupt data on site |
| Same JSON schema as existing | Zero changes needed to gwilym.ca components |
| `dist/` committed | Required by GitHub Actions runtime |
| Parallel fetching (Promise.all) | Contributions + activity + repos are independent, ~3x faster |

---

## Files Changed in gwilym.ca

| File | Change |
|------|--------|
| `.github/workflows/fetch-github.yml` | Replace 350-line bash with Action call |
| `src/components/ContributionHeatmap.tsx` | Add tooltip on hover |
| `src/components/ActivityTimeline.astro` | Empty state, optional commit grouping |

No changes to: `src/utils/github.ts`, `src/data/github.json`, `src/pages/code/index.astro`, `src/components/ContributionHeatmap.astro`, `src/components/widgets/CodeWidget.astro`.
