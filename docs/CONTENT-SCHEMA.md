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
series: "homelab-from-scratch"   # Links related posts
seriesOrder: 1                   # Position in series (1-indexed)
draft: true                      # Excludes from build
heroImage: "./images/hero.jpg"   # Relative to post file
---
```

### Field Specifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✓ | Post title, used in `<title>` and `<h1>` |
| `description` | string | ✓ | 150-160 chars ideal for SEO |
| `pubDate` | date | ✓ | Publication date (YYYY-MM-DD) |
| `updatedDate` | date | | Last significant update |
| `tags` | string[] | ✓ | 1-4 tags from taxonomy |
| `series` | string | | Series slug (kebab-case) |
| `seriesOrder` | number | | Position in series |
| `draft` | boolean | | Default: false |
| `heroImage` | string | | Path to hero image |

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

## Series Configuration

### When to Use Series

- Multi-part tutorials (3+ posts)
- Progressive learning paths
- Project build logs

## Content Organisation

### File Structure

```
src/content/writing/
├── 2024/
│   ├── 12/
│   │   ├── my-first-post.md
│   │   └── my-first-post/
│   │       └── images/
│   │           └── hero.jpg
│   └── ...
└── ...
```

### Naming Conventions

- **Post files**: `kebab-case-title.md`
- **Image folders**: Same name as post file (without `.md`)
- **Images**: Descriptive kebab-case (`docker-compose-diagram.png`)

### URL Generation

Posts generate URLs from filename:
- `src/content/writing/2024/12/my-first-post.md` → `/writing/my-first-post/`
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

```markdown
![Alt text describing the image](./images/screenshot.png)
```

- **Alt text**: Required, descriptive
- **Format**: WebP preferred, PNG for screenshots, JPG for photos
- **Size**: Max 1200px wide, optimised for web

## Zod Schema Reference

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

---

*Last updated: 2026-02-02*
