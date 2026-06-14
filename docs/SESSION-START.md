# Session Start — Claude Brief for gvns.ca

The first thing a new Claude session on this repo should read. Pointers and ground rules — not duplication of `ARCHITECTURE.md`, `DECISIONS.md`, or `ROADMAP.md`.

---

## Working agreement

**Default mode: consultative.** Analyse, propose, surface trade-offs. Wait for an explicit go-ahead before branching, editing code, or opening PRs — even when a request looks straightforward.

Exceptions are gated by slash commands that grant explicit autonomous permissions inside their flow:

- `/dev-issue` — pick up a GitHub issue, branch, implement, PR.
- `/create-issue` — file a structured issue.
- `/research-spike` — time-boxed investigation.

The command files live under `.claude/commands/`. Outside those flows: propose first, act second.

**Tone.** Canadian spelling (colour, organise, optimise). Plain prose, minimal formatting. No emojis unless the user uses them first.

**Brief over thorough.** Lead with the answer or the proposal. Reach for `ARCHITECTURE.md` and the like only when the question actually requires them.

---

## What this site is

Personal site at https://gvns.ca — writing, work, activity dashboard. Astro 6 with Svelte 5 islands for interactivity, Tailwind 4 with a CSS-variable design system, content via Astro Content Collections, deployed to Cloudflare Workers via Workers Builds (auto-deploy on push to `main`). The `@astrojs/cloudflare` adapter runs in `output: 'server'` with all current routes prerendered.

Content authoring goes through the **Sveltia CMS at `gvns.ca/admin`** (works on mobile). For Obsidian-drafted content, pipe through `npm run wikilinks` before pasting into the CMS.

Brand identity is the **P1–P5 accent palette** mapped to activity sections:

| Accent | Token | Activity |
|--------|-------|----------|
| P1 Violet | `--colour-p1-violet` | Code (also primary brand) |
| P2 Rose | `--colour-p2-rose` | Read |
| P3 Emerald | `--colour-p3-emerald` | Listen |
| P4 Amber | `--colour-p4-amber` | Write, Watch |
| P5 Sky | `--colour-p5-sky` | Status / now |

Colour discipline matters. Code = violet. Read = rose. Don't mix.

---

## Repo map (where to look first)

```text
gvns.ca/
├── CLAUDE.md                    # Lean overview — kept short on purpose
├── docs/
│   ├── SESSION-START.md         # ← you are here
│   ├── ARCHITECTURE.md          # Tech stack + file organisation
│   ├── DESIGN-SYSTEM.md         # Colours, type, spacing, components
│   ├── CONTENT-SCHEMA.md        # Frontmatter + tag taxonomy
│   ├── CONTENT-QUICKREF.md      # One-page authoring cheat sheet
│   ├── COMPONENT-CONVENTIONS.md # Patterns to copy when building UI
│   ├── INFRASTRUCTURE.md        # Workers Builds, GH Actions, DNS
│   ├── CMS-SETUP.md             # Sveltia at /admin + auth.gvns.ca Worker
│   ├── OBSIDIAN-SETUP.md        # Optional drafting → wikilinks → CMS
│   ├── DECISIONS.md             # ADRs (always read before proposing changes)
│   └── ROADMAP.md               # Phases, what's done vs not
├── .claude/
│   ├── commands/                # Custom slash commands
│   └── settings.json            # Plugin config
├── public/
│   ├── admin/                   # Sveltia CMS (config.yml + bundled JS)
│   └── uploads/                 # Hero images and CMS-uploaded media
├── src/
│   ├── components/              # *.astro + *.svelte (PascalCase)
│   ├── content/
│   │   ├── posts/YYYY/MM/*.md   # Blog posts (URL = /posts/<slug>/)
│   │   └── work/                # Work entries
│   ├── content.config.ts        # Zod schemas — heroImage enforced as /uploads/...
│   ├── layouts/                 # BaseLayout, PostLayout, PageLayout
│   ├── pages/                   # Routes — kebab-case
│   ├── styles/                  # global.css with Tailwind
│   └── utils/                   # date-format, reading-time, etc
├── scripts/
│   ├── wikilink-convert.mjs     # `npm run wikilinks`
│   ├── syndicate.mjs            # `npm run syndicate` — POSSE
│   ├── validate-image-refs.mjs  # prebuild check (`npm run build`)
│   ├── verify-csp.mjs           # CSP hash check
│   ├── fetch-comments.mjs       # Threads replies → src/data/comments/
│   ├── fetch-threads-feed.mjs   # Threads feed → src/data/
│   ├── fetch-whoop.mjs          # In-repo fetch pattern prototype (Whoop)
│   ├── refresh-threads-token.mjs
│   └── threads-auth-bootstrap.mjs / whoop-auth-bootstrap.mjs
├── workers/                     # Cloudflare Workers (auth, etc)
└── wrangler.jsonc               # Workers config
```

---

## Current state

For what's actually in flight, check the live signals — anything written here would be stale within days.

```bash
git status                       # working tree
git log origin/main --oneline -20  # recent landings
gh issue list --state open       # open issues
gh pr list --state open          # open PRs
```

Read `docs/ROADMAP.md` for the planned phase shape; cross-reference against the issue list to see what's actually queued.

---

## Common gotchas

- **Post URLs come from the filename, not the folder.** `src/content/posts/2024/12/my-post.md` → `/posts/my-post/`. The `YYYY/MM/` folders are organisation only; two posts with the same filename in different folders will collide.
- **`heroImage` must be absolute `/uploads/...`.** The Zod schema in `content.config.ts` enforces it via regex. Sveltia writes these directly. Background: ADR-014 / issue #264 — relative or `src/assets/` paths break under our nested `path:` template.
- **Dark-first via class, not data-attribute.** `.dark` on `<html>`, switched by `ThemeToggle.svelte`. Tailwind 4 wires this via `@custom-variant dark` in `global.css`. Do not introduce `[data-theme]` selectors.
- **Custom CSS classes use the `gvns-` prefix.** Component-scoped styles live in the `<style>` block of the `.astro` file; shared widget styles in `src/styles/`.
- **Verb-form route names** (ADR-010): `/posts`, `/read`, `/listen`, `/watch`, `/code`. Nav labels match.
- **Components are PascalCase** (`BookList.astro`, `ThemeToggle.svelte`). Pages, routes, utils, content files are **kebab-case**. See `COMPONENT-CONVENTIONS.md` for rationale.
- **CI runs on PRs, deploys are separate.** GitHub Actions runs `ci.yml` for build checks on PRs. Deploys are handled by Workers Builds' native Git integration (no `deploy` step in Actions). Scheduled data-fetching workflows commit to `src/data/` and push, triggering a rebuild.

---

## Useful commands

```bash
npm run dev          # localhost:4321
npm run build        # build to ./dist
npm run preview      # preview production build
npm run wikilinks    # convert Obsidian [[wikilinks]] to /posts/<slug>/ (stdin → stdout)
npm run syndicate    # POSSE — push posts to configured platforms
```

---

*Refresh this file when the working agreement, repo shape, or gotchas change. State that decays fast — branches, issues, in-flight work — does not belong here.*
