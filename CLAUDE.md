# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal writing + work site for gwilym.ca. Brand guide aligned and in active build phase.

## Tech Stack

- **Framework**: Astro 5.x with Svelte 5 islands for interactivity
- **Styling**: Tailwind CSS 4.x with P1-P5 accent palette (violet/rose/emerald/amber/sky) + zinc neutrals
- **Content**: Astro Content Collections (type-safe markdown)
- **Hosting**: Cloudflare Pages (auto-deploy from GitHub)
- **Analytics**: None (Umami removed)

## Development Commands

```bash
npm run dev      # Dev server at localhost:4321
npm run build    # Build to ./dist
npm run preview  # Preview production build
```

## Architecture

### File Structure

```
src/
├── components/     # Astro components (.astro) and Svelte islands (.svelte)
├── content/
│   ├── writing/    # Markdown posts organised by date (YYYY/MM/)
│   └── config.ts   # Content collection schemas
├── layouts/        # BaseLayout, PostLayout, PageLayout
├── pages/          # Route files including write/[slug].astro
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
- Files: `kebab-case.astro`, components: `PascalCase.astro`

## Content Schema

Blog posts require:
- `title`, `description`, `pubDate`, `tags` (1-4 from defined taxonomy)

Optional: `updatedDate`, `series`, `seriesOrder`, `draft`, `heroImage`

Post URLs derive from filename, not folder structure:
`src/content/writing/2024/12/my-post.md` → `/write/my-post/`

## Design System

P1-P5 accent palette with zinc neutrals. Key semantic tokens:
- `--colour-bg-primary` (#0a0a0a), `--colour-bg-secondary` (zinc-900), `--colour-bg-tertiary` (zinc-800)
- `--colour-text-primary` (zinc-100), `--colour-text-secondary` (zinc-400)
- `--colour-accent-primary` (violet-500 `#8b5cf6`)
- P1 Violet (code), P2 Rose (read), P3 Emerald (listen), P4 Amber (write/watch), P5 Sky (status)

Uses Space Grotesk (600/700) for h1-h3 headings, Inter (400/500/600/700) for body text, and JetBrains Mono (400) for code — all self-hosted via @fontsource. Code highlighting via Shiki.

Dark-first with `.dark` class toggle (Tailwind `dark:` variant via `@custom-variant`).

## Deployment

Cloudflare Pages auto-deploys on push to main via native Git integration (no GH Actions deploy step). PR pushes generate preview deploy URLs.

GitHub Actions runs `ci.yml` for build checks on PRs only. Scheduled data-fetching workflows commit to `src/data/` and push, triggering CF Pages rebuilds.

## Documentation

Detailed specs in `/docs/`:
- `ARCHITECTURE.md` - Full tech stack and file organisation
- `CONTENT-SCHEMA.md` - Frontmatter fields and tag taxonomy
- `DESIGN-SYSTEM.md` - Colours, typography, spacing, components
- `INFRASTRUCTURE.md` - Server config, CI/CD
- `DECISIONS.md` - Architecture Decision Records
