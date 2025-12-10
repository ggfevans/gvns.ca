# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog and portfolio site for gvns.ca. Currently in documentation/planning phase with a January 2026 target launch.

## Tech Stack

- **Framework**: Astro 5.x with Svelte 5 islands for interactivity
- **Styling**: Tailwind CSS 4.x with Dracula theme colour palette
- **Content**: Astro Content Collections (type-safe markdown)
- **Hosting**: Linode Nanode (rsync deploy via GitHub Actions)
- **Analytics**: Self-hosted Umami

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
│   ├── blog/       # Markdown posts organised by date (YYYY/MM/)
│   └── config.ts   # Content collection schemas
├── layouts/        # BaseLayout, PostLayout, PageLayout
├── pages/          # Route files including blog/[slug].astro
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
`src/content/blog/2024/12/my-post.md` → `/blog/my-post/`

## Design System

Based on Dracula theme. Key semantic tokens:
- `--color-bg-primary`, `--color-bg-secondary`
- `--color-text-primary`, `--color-text-secondary`
- `--color-link`, `--color-accent-primary`

Uses system font stack (no external fonts). Code highlighting via Shiki with Dracula theme.

## Deployment

GitHub Actions workflow on push to main:
1. `npm ci` → `npm run build`
2. rsync `./dist` to Linode:/var/www/gvns
3. Purge Cloudflare cache

## Documentation

Detailed specs in `/docs/`:
- `ARCHITECTURE.md` - Full tech stack and file organisation
- `CONTENT-SCHEMA.md` - Frontmatter fields and tag taxonomy
- `DESIGN-SYSTEM.md` - Colours, typography, spacing, components
- `INFRASTRUCTURE.md` - Server config, Caddy, Umami, CI/CD
- `DECISIONS.md` - Architecture Decision Records
