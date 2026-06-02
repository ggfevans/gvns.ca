# gvns.ca Content Schema

## Writing Post Frontmatter

### Required Fields

```yaml
---
title: "Your Post Title"
description: "A compelling 1-2 sentence summary for SEO and social sharing."
pubDate: 2024-12-09
tags: ["homelab", "docker"]
---
```

### Optional Fields

```yaml
---
title: "Your Post Title"
description: "A compelling summary."
pubDate: 2024-12-09
updatedDate: 2024-12-15          # Shows "Updated" badge
tags: ["homelab", "docker"]
draft: true                      # Excludes from build
heroImage: "cover.jpg"           # Bare filename — sits beside index.md in the post bundle
heroImageAlt: "Short description of the hero image"
---
```

> **Posts vs work:** the `posts` collection uses Astro's bundle layout — `heroImage` is a bare filename resolved relative to the post's `index.md` and validated through Astro's `image()` helper. The `work` collection still writes absolute `/uploads/...` paths (Sveltia uploads to `public/uploads/`). See ADR-014 / ADR-015 in `docs/DECISIONS.md` for rationale.

### Field Specifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✓ | Post title, used in `<title>` and `<h1>` |
| `description` | string | ✓ | 150-160 chars ideal for SEO |
| `pubDate` | date | ✓ | Publication date (YYYY-MM-DD) |
| `updatedDate` | date | | Last significant update |
| `tags` | string[] | ✓ | 1-4 tags from taxonomy |
| `draft` | boolean | | Default: false |
| `heroImage` | string | | **Posts:** bare filename (e.g. `cover.jpg`) sitting next to `index.md`, validated by Astro's `image()` helper. **Work:** absolute `/uploads/...` URL written by Sveltia. |
| `heroImageAlt` | string | | Alt text for the hero image (max 250 chars). Recommended whenever `heroImage` is set. |
| `canonicalUrl` | string | | Canonical URL for SEO |
| `syndication` | object[] | | Array of cross-post records |
| `syndication[].platform` | enum | ✓ (if syndication) | One of: `bluesky`, `mastodon`, `threads`, `linkedin` |
| `syndication[].url` | string | ✓ (if syndication) | URL of the cross-posted content |
| `syndication[].syndicatedAt` | date | ✓ (if syndication) | Date of cross-post |
| `syndication[].mediaId` | string | | Threads-specific media ID for API lookups |
| `syndication[].shortcode` | string | | Threads-specific shortcode for reply intent links |

## Tag Taxonomy

### Primary Categories

Use **one primary tag** per post, plus 1-3 secondary tags.

#### Tech & Homelab
| Tag | Description |
|-----|-------------|
| `homelab` | Self-hosting, home infrastructure |
| `docker` | Containers, Docker Compose |
| `linux` | Linux administration, CLI |
| `networking` | DNS, VPNs, firewalls |
| `automation` | Scripts, CI/CD, cron |
| `web-dev` | Frontend, backends, frameworks |

#### Movement & Training
| Tag | Description |
|-----|-------------|
| `bjj` | Brazilian Jiu-Jitsu |
| `movement` | General movement practice |
| `training` | Programming, methodology |

#### Productivity & Life
| Tag | Description |
|-----|-------------|
| `adhd` | ADHD strategies, accommodations |
| `productivity` | Systems, tools, workflows |
| `pkm` | Personal knowledge management |

#### Meta & Essays
| Tag | Description |
|-----|-------------|
| `essay` | Long-form opinion/analysis |
| `tutorial` | Step-by-step guide |
| `til` | Today I Learned (short) |
| `meta` | Site updates, behind-the-scenes |

### Tag Rules

1. **Minimum 1, maximum 4** tags per post
2. **First tag** is primary (used for filtering, RSS categories)
3. **Use existing tags** before creating new ones
4. **Kebab-case only**: `web-dev` not `webDev` or `Web Dev`
5. **No plurals**: `tutorial` not `tutorials`

> **Adding new tags:** The Sveltia CMS tag field is a free-form `list` widget, so
> editors can type any tag — the build only validates count (1–4), not values.
> The taxonomy above is the *recommended* set, not a hard constraint. Prefer an
> existing tag; if you must add one, follow the kebab-case / no-plurals rules
> above and add it to both this taxonomy and the `hint:` for the tags field in
> `public/admin/config.yml` so future authors are nudged toward reusing it.

## Content Organisation

### File Structure

```
src/content/posts/
├── 2024/
│   ├── 12/
│   │   └── my-first-post/        # Bundle directory (== slug)
│   │       ├── index.md          # Post body + frontmatter
│   │       ├── cover.jpg         # heroImage (bare filename in frontmatter)
│   │       └── diagram.png       # Inline image, referenced as ./diagram.png
│   └── ...
└── ...
```

### Naming Conventions

- **Bundle directory**: `kebab-case-slug/` — the directory name becomes the URL slug.
- **Post body**: always `index.md` inside the bundle.
- **Images**: bare filename in frontmatter (`heroImage: cover.jpg`); inline images use entry-relative paths (`![alt](./diagram.png)`).

### URL Generation

Posts generate URLs from the bundle directory name (Sveltia is configured with `path: "{{year}}/{{month}}/{{slug}}/index"`):
- `src/content/posts/2024/12/my-first-post/index.md` → `/posts/my-first-post/`
- Date folders are for organisation only, not in URL

## Content Guidelines

### Post Length

| Type | Target | Range |
|------|--------|-------|
| TIL | 200-500 words | Quick insight |
| Tutorial | 1000-2000 words | Complete guide |
| Essay | 1500-3000 words | Deep exploration |

### Writing Style

Based on GVNS Brand Guide voice attributes:

| Attribute | Meaning | Example |
|-----------|---------|---------|
| **Direct** | Lead with the point, then riff | "This solves X. Yes, I'm rather proud of that name." |
| **Technical** | Precise terminology, accessibly delivered | Explain the thing, then joke about the thing |
| **Warm** | Genuinely friendly, not corporate-friendly | First person, contractions, personality |
| **Witty** | Puns, wordplay, dry observations | Earned, not forced — quality over quantity |
| **Self-aware** | Can laugh at yourself | Acknowledge absurdity when it's there |

**The "Gareth Test"**: Before publishing, ask *"Would I actually say this to someone?"*
- If it sounds like a LinkedIn post → rewrite
- If it sounds like a Discord message to a technical friend → ship it

**Mechanics:**
- **Perspective**: First person ("I discovered..." not "One discovers...")
- **Contractions**: Yes, always
- **Spelling**: Canadian (colour, organisation, behaviour)
- **Oxford comma**: Yes
- **Exclamation marks**: Rarely, one at a time max
- **Code**: Always include context, explain non-obvious parts
- **Links**: Prefer inline links over reference-style

**Humour calibration by context:**

| Context | Level | Notes |
|---------|-------|-------|
| Writing posts | Full | Puns, metaphors, tangents, personality |
| Tutorials | Medium | Dry wit, occasional asides |
| Error states | Permission granted | "Well, that didn't work" > "An error occurred" |

### Code Blocks

````markdown
```typescript title="src/utils/date.ts" {3-5}
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```
````

Supports:
- Language identifier (required)
- `title` attribute for filename
- Line highlighting with `{3-5}` syntax

### Images

**Sveltia CMS is the canonical authoring path for posts.** When you upload a hero image or drop an inline image into the editor, Sveltia writes the file into the post's bundle directory (next to `index.md`) and references it using a bare filename (hero) or an entry-relative path (inline). The `validate-image-refs.mjs` prebuild check rejects manually-authored `/uploads/...` paths in the `posts` collection — drafting frontmatter by hand with absolute paths is **not supported** for posts.

```markdown
![Alt text describing the image](./diagram.png)
```

- **Hero image**: bare filename in frontmatter (e.g. `heroImage: cover.jpg`); the file sits next to `index.md`. Astro's `image()` helper validates it and runs the asset pipeline.
- **Inline images**: entry-relative paths (`./filename.ext`) inside the bundle directory.
- **Alt text**: inline `![alt](...)` markdown alt text is required and should be descriptive. For the hero image, set `heroImageAlt` in frontmatter — optional, but recommended whenever `heroImage` is set.
- **Format**: WebP preferred, PNG for screenshots, JPG for photos.
- **Size**: Max 1200px wide, optimised for web.

**Why bundles?** ADR-015 (`docs/DECISIONS.md`) — Sveltia's entry-relative upload path goes with the grain of the CMS once `{{slug}}` is in the path template. ADR-014 documents the earlier `/public/uploads/` baseline and why decision #1 was superseded.

The `work` collection still uses absolute `/uploads/...` URLs (validated by `UPLOADS_PATH_REGEX` in `src/uploads-path.mjs`); that flow has not migrated to bundles.

## Zod Schema Reference

Excerpted from `src/content.config.ts` (the live source — check the file for the full version with `preprocess` helpers and the `glob` loader configuration).

```typescript
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { UPLOADS_PATH_REGEX } from './uploads-path.mjs';

// Work-collection media: Sveltia writes absolute /uploads/... URLs.
const uploadsPathSchema = z
  .string()
  .regex(UPLOADS_PATH_REGEX, 'heroImage must be an absolute /uploads/... path')
  .optional();

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  // Posts use the bundle layout (ADR-015): heroImage is a bare filename
  // resolved by Astro's image() helper relative to the post's index.md.
  schema: ({ image }) =>
    z.object({
      title: z.string().max(100),
      description: z.string().max(200),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).min(1).max(4),
      draft: z.boolean().default(false),
      heroImage: image().optional(),
      heroImageAlt: z.string().max(250).optional(),
      canonicalUrl: z.string().url().optional(),
      syndication: z
        .array(
          z.object({
            platform: z.enum(['bluesky', 'mastodon', 'threads', 'linkedin']),
            url: z.string().url(),
            syndicatedAt: z.coerce.date(),
            mediaId: z.string().optional(),
            shortcode: z.string().optional(),
          })
        )
        .optional(),
    }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/work' }),
  // Work entries still use absolute /uploads/... URLs written by Sveltia.
  schema: () =>
    z.object({
      title: z.string().max(100),
      description: z.string().max(200),
      url: z.string().url().optional(),
      repo: z.string().url().optional(),
      status: z.enum(['active', 'maintained', 'archived']),
      tags: z.array(z.string()).min(1).max(6),
      heroImage: uploadsPathSchema,
      heroImageAlt: z.string().max(250).optional(),
      featured: z.boolean().default(false),
    }),
});

export const collections = { posts, work };
```

---

*Last updated: 2026-04-28*
