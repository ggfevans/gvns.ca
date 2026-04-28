# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal writing + work site for gvns.ca. Brand guide aligned and in active build phase.

## Tech Stack

- **Framework**: Astro 6.x with Svelte 5 islands for interactivity
- **Styling**: Tailwind CSS 4.x with P1-P5 accent palette (violet/rose/emerald/amber/sky) + zinc neutrals
- **Components**: Starwind UI Pro (shadcn-style, copied into `src/components/starwind/`; add via `npx starwind@latest add <component>`)
- **Content**: Astro Content Collections (type-safe markdown)
- **Hosting**: Cloudflare Workers via Workers Builds (auto-deploy from GitHub); `@astrojs/cloudflare` adapter in `output: 'server'` mode with all current routes prerendered
- **Analytics**: None (Umami removed)

## Development Commands

```bash
npm run dev          # Dev server at localhost:4321
npm run build        # Build to ./dist
npm run preview      # Preview production build
npm run wikilinks    # Convert Obsidian [[wikilinks]] to /posts/<slug>/ links (stdin → stdout)
```

**Authoring posts:** use the Sveltia CMS at `gvns.ca/admin` (works on mobile). For Obsidian-drafted content, pipe through `npm run wikilinks` before pasting into the CMS.

## Architecture

### File Structure

```
src/
├── components/     # Astro components (.astro) and Svelte islands (.svelte)
├── content/
│   └── posts/      # Markdown posts organised by date (YYYY/MM/)
├── content.config.ts  # Content collection schemas (Zod)
├── layouts/        # BaseLayout, PostLayout, PageLayout
├── pages/          # Route files including posts/[slug].astro
├── styles/         # global.css with Tailwind imports
└── utils/          # Helpers (date formatting, reading time)
```

### Path Aliases

```typescript
@components/* → src/components/*
@layouts/*    → src/layouts/*
@utils/*      → src/utils/*
@styles/*     → src/styles/*
```

### Component Conventions

- **Astro components**: Default for static content
- **Svelte islands**: Only for client-side interactivity (theme toggle, search)
- Custom CSS classes use `gvns-` prefix

### Naming

- **Components and layouts** (`src/components/**/*.astro`, `*.svelte`, `src/layouts/*.astro`): `PascalCase` (e.g. `BookList.astro`, `ThemeToggle.svelte`, `BaseLayout.astro`). Matches Astro/Svelte community norm and Starwind UI Pro output; layouts are imported and consumed exactly like components.
- **Pages, routes, utils, content, styles**: `kebab-case` (e.g. `src/pages/read/index.astro`, `src/utils/reading-time.ts`). Keeps URLs and import paths clean.

See `docs/COMPONENT-CONVENTIONS.md` for full rationale and examples.

## Content Schema

Blog posts require:
- `title`, `description`, `pubDate`, `tags` (1-4 from defined taxonomy)

Optional: `updatedDate`, `draft`, `heroImage`, `canonicalUrl`

Post URLs derive from filename, not folder structure:
`src/content/posts/2024/12/my-post.md` → `/posts/my-post/`

## Design System

P1-P5 accent palette with zinc neutrals. Key semantic tokens:
- `--colour-bg-primary` (#0a0a0a), `--colour-bg-secondary` (zinc-900), `--colour-bg-tertiary` (zinc-800)
- `--colour-text-primary` (zinc-100), `--colour-text-secondary` (zinc-400)
- `--colour-accent-primary` (violet-500 `#8b5cf6`)
- P1 Violet (code), P2 Rose (read), P3 Emerald (listen), P4 Amber (write/watch), P5 Sky (status)

Uses Space Grotesk (600/700) for h1-h3 headings, Inter (400/500/600/700) for body text, and JetBrains Mono (400) for code — all self-hosted via @fontsource. Code highlighting via Shiki.

Dark-first with `.dark` class toggle (Tailwind `dark:` variant via `@custom-variant`).

## Deployment

Cloudflare Workers (via Workers Builds) auto-deploys on push to main using its native Git integration (no GH Actions deploy step). PR pushes generate preview deploy URLs. Worker config lives in `wrangler.jsonc` (root) plus the adapter-generated `dist/server/wrangler.json`.

GitHub Actions runs `ci.yml` for build checks on PRs only. Scheduled data-fetching workflows commit to `src/data/` and push, triggering Workers Builds rebuilds.

## Documentation

**Read first:** `docs/SESSION-START.md` — orientation brief for any new Claude session (working agreement, what's in flight, repo map, common gotchas).

Detailed specs in `/docs/`:
- `ARCHITECTURE.md` - Full tech stack and file organisation
- `COMPONENT-CONVENTIONS.md` - Patterns for components, pages, widgets
- `CONTENT-SCHEMA.md` - Frontmatter fields and tag taxonomy
- `CONTENT-QUICKREF.md` - One-page authoring cheat sheet
- `DESIGN-SYSTEM.md` - Colours, typography, spacing, components
- `INFRASTRUCTURE.md` - Server config, CI/CD
- `DECISIONS.md` - Architecture Decision Records
- `CMS-SETUP.md` - Sveltia CMS at `gvns.ca/admin` + `auth.gvns.ca` Worker
- `OBSIDIAN-SETUP.md` - Optional drafting in Obsidian → `npm run wikilinks` → paste into CMS
- `ROADMAP.md` - Phases 6–10, what's done vs not
