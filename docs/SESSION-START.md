# Session Start — Claude Brief for gvns.ca

This is the first thing a new Claude session on this repo should read. It exists so we don't waste a turn re-discovering the basics every time.

> **Companion docs.** Architecture is in `ARCHITECTURE.md`, decisions in `DECISIONS.md`, what's next in `ROADMAP.md`. This file is the **orientation layer** — pointers and ground rules, not duplication.

---

## Working agreement

**Default mode: consultative.** Analyse, suggest, explain trade-offs, and wait for sign-off before making changes. Do not branch, edit code, or open PRs without an explicit go-ahead — even when a request looks straightforward.

There are exceptions baked into the repo:

- `/dev-issue` (`.claude/commands/dev-issue.md`) — when invoked, that command grants explicit autonomous permissions (branch, edit `src/`/`docs/`/`public/`, push non-main, open and merge PRs). Use those permissions only inside that flow.
- `/create-issue` and `/research-spike` — same pattern; permissions defined inside the command file.

Outside those commands: propose first, act second.

**Tone.** Canadian spelling (colour, organise). Plain prose, minimal formatting unless the content genuinely benefits from a list or table. No emojis unless Gareth uses them first.

**Brief over thorough.** Gareth has built up a lot of context here. Lead with the answer or the proposal; reach for ARCHITECTURE.md and the like only when the question actually requires them.

---

## What this site is

Personal site for Gareth Evans (writing + work + activity dashboard) at https://gvns.ca. Astro 5 static site, Svelte 5 islands for interactivity, Tailwind 4 with a CSS-variable-driven design system, deployed via Cloudflare Pages on push to `main`.

Brand identity is the **P1–P5 accent palette** mapped to activity sections:

| Accent | Token | Activity |
|--------|-------|----------|
| P1 Violet | `--colour-p1-violet` | Code (also primary brand) |
| P2 Rose | `--colour-p2-rose` | Read |
| P3 Emerald | `--colour-p3-emerald` | Listen |
| P4 Amber | `--colour-p4-amber` | Write, Watch |
| P5 Sky | `--colour-p5-sky` | Status / now |

Colour discipline matters. If you're touching a Code feature, it's violet. Read = rose. Don't mix.

---

## Repo map (where to look first)

```
gvns.ca/
├── CLAUDE.md                    # Lean overview — kept short on purpose
├── docs/
│   ├── SESSION-START.md         # ← you are here
│   ├── ARCHITECTURE.md          # Tech stack + file organisation
│   ├── DESIGN-SYSTEM.md         # Colours, type, spacing, components
│   ├── CONTENT-SCHEMA.md        # Frontmatter + tag taxonomy
│   ├── INFRASTRUCTURE.md        # CF Pages, GH Actions, DNS
│   ├── DECISIONS.md             # ADRs (always read before proposing changes)
│   ├── ROADMAP.md               # Phases 6–10, what's done vs not
│   ├── COMPONENT-CONVENTIONS.md # Patterns to copy when building UI
│   ├── CONTENT-QUICKREF.md      # One-page authoring cheatsheet
│   ├── OBSIDIAN-SETUP.md        # Drafting → ingest pipeline
│   ├── plans/                   # Dated implementation plans
│   ├── notes/                   # Site spec + working notes
│   └── research/                # Spike outputs
├── .claude/
│   ├── commands/                # Custom slash commands (dev-issue, create-issue, research-spike)
│   └── settings.json            # Plugin config (claude-mem)
├── src/                         # Source — see COMPONENT-CONVENTIONS.md
├── scripts/
│   ├── new-post.mjs             # `npm run new-post`
│   ├── ingest.mjs               # `npm run ingest` — Obsidian → site
│   ├── syndicate.mjs            # `npm run syndicate` — POSSE
│   └── prebuild-clean.js        # Pre-build housekeeping
├── plan.md                      # CURRENT WIP — github-json-bourne action extraction
└── workflow-fix-findings.md     # CURRENT WIP — branch-protection blocking workflows
```

---

## What's in flight (refresh this when it changes)

> **Stale-check this section first.** The state below was true at the time of writing — verify with `git status` / `git log` / `gh issue list` before relying on it.

**Current branch:** `chore/workflow-grouping`

**Active threads:**

1. **Workflow fix — PR-based data pushes.** The "protect da goods" ruleset blocks all 6 fetch workflows from pushing directly to `main`. See `workflow-fix-findings.md` for the analysis. Resolution: each workflow pushes to a temp branch, opens a PR, and auto-merges once Cloudflare Pages passes. `fetch-gaming.yml` needs to switch from `GITHUB_TOKEN` to `GH_PAT` so PR creation can trigger the Pages check.
2. **`github-json-bourne` extraction.** `plan.md` is the rolling design for pulling the inline GitHub-fetching logic out into a standalone reusable Action in a separate repo (`~/code/projects/github-json-bourne`). Phases 4–5 land back in this repo (workflow swap + component enhancements).
3. **Phase 9 — Now dashboard.** Widgets exist (`src/components/widgets/*Widget.astro`) and the `/now` page renders them; data sources are partly live (GitHub, ListenBrainz, reading) and partly placeholder. ROADMAP §9 is the source of truth for what's still TBD.
4. **Backlog.** Open issues live at https://github.com/ggfevans/gvns.ca/issues. Use `gh issue list --label ready` to see what's queued for `/dev-issue`.

**Lots of stale feature branches** exist locally (`feat/*`, `chore/*`). Don't assume any of them are alive — `git log origin/main` is the source of truth.

---

## Common gotchas

- **Posts are flat-routed.** `src/content/writing/2024/12/my-post.md` → `/write/my-post/`. The folder is for organisation only; the URL is the slug. Two posts with the same slug in different folders will collide.
- **Verbs, not gerunds.** `/write` not `/writing`, `/read` not `/reading`. ADR-010 is the source. Nav labels match: "Write", "Read", "Listen", "Watch", "Code".
- **Dark-first via class, not data-attribute.** `.dark` on `<html>`, switched by `ThemeToggle.svelte`. Tailwind 4 wires this via `@custom-variant dark` in `global.css`. Do not introduce `[data-theme]` selectors.
- **Custom CSS classes use the `gvns-` prefix.** Component-scoped styles still go in the `<style>` block of the `.astro` file; shared widget styles live in `src/styles/widgets.css`.
- **Path aliases.** `@components/*`, `@layouts/*`, `@utils/*`, `@styles/*` (defined in `tsconfig.json`). Use them — relative imports across `src/` get noisy fast.
- **Cloudflare Pages deploys on push to main, automatically.** No GH Action does the deploy. CI just runs `npm run build` on PRs as a check.
- **Build before declaring done.** `npm run build` catches type errors and content-schema violations. Don't trust `npm run dev` alone.
- **Threads, not Twitter/X.** Site spec is explicit on this — never add Twitter/X anywhere.

---

## Useful commands

```bash
npm run dev          # Dev server at http://localhost:4321
npm run build        # Build to ./dist (run before claiming a change is done)
npm run preview      # Preview the production build
npm run new-post     # Interactive new post scaffold
npm run ingest -- ~/notes/gVault/02-AREAS/writing/drafts/foo.md  # Obsidian → site
npm run syndicate    # POSSE flow

gh issue list --label ready                  # Queued issues for /dev-issue
gh issue list --label ready --json number,title,labels
gh pr list                                   # In-flight PRs
git worktree list                            # Active worktrees (parallel work)
```

---

## Quick decision tree

| If Gareth asks for… | Default behaviour |
|---|---|
| "What's the state of X?" | Read the relevant doc / file, summarise. No edits. |
| "Should we do X?" | Propose with trade-offs. Cite ADRs if relevant. Wait for the call. |
| "Fix this typo / tiny tweak" | Show the diff, then ask before applying. (Consultative default.) |
| "Pick up issue #N" or "/dev-issue N" | Follow the autonomous flow defined in `.claude/commands/dev-issue.md`. |
| "Create an issue for…" | Use `/create-issue` if it makes sense, otherwise propose the issue body and labels first. |
| "Research X" | Suggest a spike (`/research-spike`) if scope warrants; otherwise summarise from web search + repo. |
| "Add a new widget / page / component" | Read `COMPONENT-CONVENTIONS.md`, propose the structure, get sign-off, then build. |
| "New post" | `CONTENT-QUICKREF.md` is the cheat sheet. Confirm tags + slug + draft state before writing the file. |

---

*Last updated: 2026-04-24*
