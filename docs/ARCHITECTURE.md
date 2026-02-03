# gvns.ca Architecture

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Astro 5.x | Content-first, zero JS default, islands architecture |
| **UI Framework** | Svelte 5 | Islands only when interactivity needed |
| **Styling** | Tailwind CSS 4.x | Utility-first, design tokens via CSS variables |
| **Content** | Astro Content Collections | Type-safe markdown with frontmatter validation |
| **Code Highlighting** | Shiki | Built into Astro |
| **Fonts** | Inter + JetBrains Mono | Self-hosted via @fontsource |

## Site Structure

```
gvns.ca/
├── /                   # Home — intro + recent posts
├── /write/             # Write index — all posts, filterable by tag
├── /write/[slug]/      # Individual post
├── /write/tags/        # Tag listing page
├── /write/tags/[tag]/  # Posts filtered by tag
├── /work/              # Project showcase
├── /work/[project]/    # Project detail
├── /about/             # About
├── /resume/            # Resume + PDF download
├── /read/              # Reading list (Hardcover)
├── /now/               # Now dashboard
├── /listen/            # Listening activity (future)
├── /watch/             # Watching activity (future)
├── /code/              # Code activity (future)
├── /rss.xml            # RSS feed
└── /sitemap.xml        # Auto-generated sitemap
```

## File Organisation

```
src/
├── components/
│   ├── BaseHead.astro      # <head> with meta, fonts, Umami
│   ├── Header.astro        # Site navigation
│   ├── Footer.astro        # Site footer
│   ├── PostCard.astro      # Writing post preview card
│   ├── TagList.astro       # Tag display component
│   └── ThemeToggle.svelte  # Dark/light toggle (island)
│
├── content/
│   ├── writing/            # Writing posts (markdown)
│   │   └── *.md
│   ├── work/               # Work entries (markdown)
│   │   └── *.md
│   └── config.ts           # Content collection schemas
│
├── layouts/
│   ├── BaseLayout.astro    # HTML wrapper, theme, skip links
│   ├── PostLayout.astro    # Writing post with metadata
│   └── PageLayout.astro    # Static pages (about, work)
│
├── pages/
│   ├── index.astro         # Home
│   ├── about/              # About
│   ├── resume/             # Resume
│   ├── work/               # Work index + detail
│   ├── writing/
│   │   ├── index.astro     # Writing listing
│   │   ├── [slug].astro    # Dynamic post pages
│   │   └── tags/
│   │       ├── index.astro # All tags
│   │       └── [tag].astro # Posts by tag
│   ├── rss.xml.ts          # RSS feed endpoint
│   └── 404.astro           # Custom 404
│
├── styles/
│   └── global.css          # Tailwind imports + custom styles
│
└── utils/
    ├── date.ts             # Date formatting helpers
    └── reading-time.ts     # Reading time calculation
```

## Content Collections

### Writing Collection Schema

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const writing = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string().max(100),
    description: z.string().max(200),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).min(1).max(4),
    draft: z.boolean().default(false),
    heroImage: image().optional(),
  }),
});

const work = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string().max(100),
    description: z.string().max(200),
    url: z.string().url().optional(),
    repo: z.string().url().optional(),
    status: z.enum(['active', 'maintained', 'archived']),
    tags: z.array(z.string()).min(1).max(6),
    heroImage: image().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { writing, work };
```

See `CONTENT-SCHEMA.md` for full frontmatter specification and tag taxonomy.

## Build & Deploy

### Local Development

```bash
npm run dev      # Start dev server at localhost:4321
npm run build    # Build to ./dist
npm run preview  # Preview production build
```

### Production Deploy

**Method**: Cloudflare Pages (automatic on push to main)

```
GitHub Push
    │
    ▼
Cloudflare Pages
    ├── npm ci
    ├── npm run build
    └── Deploy to edge network
    │
    ▼
Live at gvns.ca
```

See `INFRASTRUCTURE.md` for server configuration details.

## Key Conventions

### Naming

- **Files**: `kebab-case.astro`, `kebab-case.md`
- **Components**: `PascalCase.astro` or `PascalCase.svelte`
- **CSS classes**: Tailwind utilities; custom classes use `gvns-` prefix

### Imports

```typescript
// Prefer path aliases
import BaseLayout from '@layouts/BaseLayout.astro';
import { formatDate } from '@utils/date';

// Astro path aliases (tsconfig.json)
{
  "paths": {
    "@components/*": ["src/components/*"],
    "@layouts/*": ["src/layouts/*"],
    "@utils/*": ["src/utils/*"],
    "@styles/*": ["src/styles/*"]
  }
}
```

### Component Patterns

- **Astro components**: Default choice for static content
- **Svelte islands**: Only for client-side interactivity (theme toggle, search)
- **Props**: Destructure with defaults in frontmatter

```astro
---
interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Default description' } = Astro.props;
---
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | > 95 |
| First Contentful Paint | < 1.0s |
| Time to Interactive | < 1.5s |
| Total Page Weight | < 200KB (initial) |
| JavaScript | 0KB default (islands only) |

## Accessibility

- Semantic HTML throughout
- Skip link to main content
- ARIA labels on interactive elements
- Colour contrast meets WCAG AA
- Keyboard navigation for all features
- Reduced motion support via `prefers-reduced-motion`

---

*Last updated: 2026-02-02*
