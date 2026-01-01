# Issue Creation Workflow v1

Create well-formed GitHub Issues or triage existing ones for the ready queue.
Designed for quick capture during development and structured issue planning.

**Arguments:** `$ARGUMENTS` (optional)
- No args: Interactive mode (guided prompts)
- Number only (e.g., `42`): Triage existing issue
- Quoted string (e.g., `"Fix toast bug"`): Quick capture

---

## Permissions

| Action | Scope |
|--------|-------|
| GitHub Issues | Read, create, edit (labels, body, milestone) |
| GitHub API | Read milestones |

**Commands allowed:** `gh issue list`, `gh issue view`, `gh issue create`, `gh issue edit`, `gh api`

---

## Decision Flow

```
START
  │
  ├─ $ARGUMENTS empty? ──yes──▶ INTERACTIVE MODE
  │                              (guided prompts)
  │
  ├─ $ARGUMENTS is number? ──yes──▶ TRIAGE MODE
  │   (e.g., "42")                   (prepare issue for ready queue)
  │
  └─ $ARGUMENTS is text? ──yes──▶ QUICK CAPTURE MODE
      (e.g., "Fix bug")              (minimal friction)
```

---

## Mode 1: Interactive

Full guided workflow for creating well-formed issues.

### Step 1: Type Selection

Ask the user:
```
What type of issue are you creating?

1. bug      - Something is broken
2. feature  - New capability
3. chore    - Refactoring, docs, tooling
4. spike    - Research before implementation
```

### Step 2: Summary

Ask for a one-line summary:
```
Enter a one-line summary:
> _____
```

### Step 3: Duplicate Check

Search for similar issues:
```bash
gh issue list --search "<summary keywords>" --limit 5 --json number,title,state
```

If matches found, display them and ask:
```
Possible duplicates:
1. #42: Similar issue title (open)
2. #38: Related bug (closed)

Are any of these duplicates? (enter number to link, 'n' to continue):
```

If user selects a duplicate, comment on existing issue and stop.

### Step 4: Type-Specific Details

**For bug:**
- What is the expected behaviour?
- What is the actual behaviour?
- Steps to reproduce (optional)

**For feature:**
- What problem does this solve?
- Proposed solution (optional)

**For chore:**
- What needs to be done?
- Why is this needed?

**For spike:**
- Research question
- Expected deliverables
- Time box (default: "2-4 hours")

### Step 5: Acceptance Criteria

Prompt for testable criteria:
```
Enter acceptance criteria (one per line, empty line to finish):
> Page loads in under 3 seconds
> Mobile viewport displays correctly
>
```

Format as `- [ ] <criterion>` in issue body.

### Step 6: Label Suggestions

Use keyword inference (see Label Inference section) and present:
```
Suggested labels based on content:
- area:content (detected: "blog", "post")
- size:small (default for bugs)

Confirm labels? [y/n/edit]:
```

If 'edit', allow adding/removing labels.

### Step 7: Priority

```
Priority? (u=urgent, h=high, m=medium, l=low, enter=skip):
> _
```

### Step 8: Milestone

Fetch available milestones:
```bash
gh api repos/:owner/:repo/milestones --jq '.[] | "\(.number). \(.title)"'
```

Present:
```
Assign to milestone?
1. v1.0.0 - Launch
2. Backlog
3. Skip
> _
```

### Step 9: Preview & Confirm

Show complete issue preview:
```
=== PREVIEW ===
Title: bug: Page layout broken on mobile
Labels: bug, area:styling, size:small
Milestone: v1.0.0 - Launch

## Summary
Mobile viewport shows horizontal scrollbar and content overflow.

## Expected Behaviour
Page should be fully responsive without horizontal scroll.

## Actual Behaviour
Content overflows viewport on screens under 768px.

## Acceptance Criteria
- [ ] No horizontal scrollbar on mobile viewports
- [ ] All content visible without horizontal scroll

---

Create this issue? [y/n]:
```

### Step 10: Create Issue

```bash
gh issue create \
  --title "<type>: <summary>" \
  --body "<generated body>" \
  --label "<labels>" \
  --milestone "<milestone>"
```

### Step 11: Handoff Offer

```
Issue #12 created: https://github.com/ggfevans/gvns.ca/issues/12

Start implementation now? [y/n]:
```

If yes, output: `Invoking /dev-issue 12`

---

## Mode 2: Triage

Prepare community-submitted issues for the ready queue.

### Step 1: Fetch Issue

```bash
gh issue view $ARGUMENTS --json number,title,body,labels,comments,milestone
```

Display issue summary.

### Step 2: Completeness Check

Parse issue body and check for required sections:

| Section | Check For |
|---------|-----------|
| Acceptance Criteria | `## Acceptance Criteria` or `- [ ]` items |
| Size label | `size:small`, `size:medium`, `size:large` |
| Area label | Any `area:*` label |
| Type label | `bug`, `feature`, `chore`, `spike` |

Display status:
```
Issue #42: Page layout broken on mobile

PRESENT:
- [x] Description
- [x] bug label

MISSING:
- [ ] Acceptance Criteria
- [ ] Size estimate
- [ ] Area label

Fill in missing sections? [y/n]:
```

### Step 3: Fill Missing Sections

For each missing element, prompt user with same flow as Interactive mode steps 5-7.

### Step 4: Update Issue

Append new sections to issue body:
```bash
gh issue edit $ARGUMENTS --body "<original + new sections>"
```

### Step 5: Update Labels

```bash
gh issue edit $ARGUMENTS \
  --remove-label triage \
  --add-label ready,<area>,<size>
```

### Step 6: Handoff Offer

```
Issue #42 triaged and moved to ready queue.
Start implementation now? [y/n]:
```

---

## Mode 3: Quick Capture

Minimal friction for logging during development.

### Step 1: Parse Input

Extract text from `$ARGUMENTS` (the quoted string).

### Step 2: Infer Type and Labels

Use keyword inference tables (see Label Inference section).

Example: `"Fix mobile layout overflow"` → type: `bug`, area: `area:styling`

### Step 3: Duplicate Check

```bash
gh issue list --search "<keywords>" --limit 3 --json number,title,state
```

If matches found:
```
Possible duplicates:
1. #42: Mobile layout issue (open)

Continue creating? [y/n]:
```

### Step 4: Brief Confirmation

```
Title: bug: Fix mobile layout overflow
Labels: bug, triage, area:styling

Create? [y/n]:
```

### Step 5: Create Minimal Issue

```bash
gh issue create \
  --title "<type>: <captured text>" \
  --body "Quick capture during development. Needs triage for full details.

## Captured Note
<user's input>

---
*Logged via /create-issue quick capture*" \
  --label "<type>,triage,<area if detected>"
```

### Step 6: Output

```
Created #15: bug: Fix mobile layout overflow
https://github.com/ggfevans/gvns.ca/issues/15

Labels: bug, triage, area:styling (inferred)
[Note: Issue needs triage before implementation]
```

---

## Label Inference

### Type Labels (from keywords)

| Keywords | Label |
|----------|-------|
| fix, bug, broken, error, crash, fails, wrong, issue | `bug` |
| add, implement, new, support, enable, allow, feature | `feature` |
| refactor, clean, update, docs, rename, move, remove | `chore` |
| research, investigate, explore, spike, POC, prototype | `spike` |

**Default:** If no keywords match, ask user in interactive/triage, use `chore` in quick capture.

### Area Labels (from keywords)

| Keywords | Label |
|----------|-------|
| blog, post, article, writing, content, markdown | `area:content` |
| layout, header, footer, nav, component, page | `area:components` |
| css, style, tailwind, colour, font, typography | `area:styling` |
| build, deploy, action, CI, rsync, Caddy | `area:infra` |
| SEO, meta, OG, sitemap, RSS, feed | `area:seo` |
| accessibility, keyboard, screen reader, focus, ARIA | `area:a11y` |
| docs, documentation, README, CLAUDE.md | `area:docs` |
| analytics, Umami, tracking | `area:analytics` |

### Size Labels (defaults)

| Type | Default Size |
|------|--------------|
| bug | `size:small` |
| feature | `size:medium` |
| chore | `size:small` |
| spike | `size:medium` |

**Override:** User can change in interactive/triage modes.

### Priority Labels (only if explicit)

| Keywords | Label |
|----------|-------|
| urgent, critical, blocking, ASAP | `priority:urgent` |
| important, soon, high priority | `priority:high` |
| when possible, nice to have, low priority | `priority:low` |

**Default:** No priority label unless explicitly set.

---

## Issue Body Templates

### Bug Template

```markdown
## Summary
<one-line description>

## Expected Behaviour
<what should happen>

## Actual Behaviour
<what's broken>

## Steps to Reproduce
<if provided>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Technical Notes
<if provided>
```

### Feature Template

```markdown
## Summary
<one-line description>

## Problem
<what problem this solves>

## Proposed Solution
<if provided>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Technical Notes
<if provided>
```

### Chore Template

```markdown
## Summary
<one-line description>

## Motivation
<why this is needed>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Technical Notes
<if provided>
```

### Spike Template

```markdown
## Research Question
<the question to answer>

## Context
<why this research is needed>

## Expected Deliverables
- [ ] <deliverable 1>
- [ ] <deliverable 2>

## Time Box
<estimate, default "2-4 hours">
```

### Quick Capture Template

```markdown
Quick capture during development. Needs triage for full details.

## Captured Note
<user's input>

---
*Logged via /create-issue quick capture*
```

---

## Error Handling

| Scenario | Response |
|----------|----------|
| `gh` not authenticated | "Error: GitHub CLI not authenticated. Run `gh auth login`." |
| Issue not found (triage) | "Error: Issue #N not found." |
| Network error | "Error: Could not reach GitHub. Check connection." |
| User cancels | "Issue creation cancelled." |
| Duplicate confirmed | "Linked to existing issue #X. No new issue created." |

---

## Output Format

### After Issue Creation

```
Issue #<N> created: <url>
Type: <type>
Labels: <labels>
Milestone: <milestone or "none">
```

### After Triage

```
Issue #<N> triaged and moved to ready queue.
Labels added: <new labels>
Labels removed: triage
```

### Handoff Prompt

```
Start implementation now? [y/n]:
```

If yes: `Invoking /dev-issue <N>`
