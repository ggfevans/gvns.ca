# Obsidian Setup for gvns.ca

This guide configures Obsidian for frictionless blog post authoring with correctness guarantees.

## Recommended Plugins

### obsidian-astro-composer (Core)

Handles slug generation, frontmatter templates, and wikilink conversion automatically.

**Installation:**
1. Open Obsidian Settings → Community plugins → Browse
2. Search for "Astro Composer" by davidvkimball
3. Install and enable

**Configuration:**
```yaml
# Settings → Astro Composer

# Frontmatter template (Property Template)
title: ""
description: ""
pubDate: {{date:YYYY-MM-DD}}
tags: []
draft: true

# File settings
Blog Folder: src/content/writing
Use Date Folders: true
Date Folder Format: YYYY/MM
```

### Templater (Optional)

For more complex templates with dynamic content.

**Post template location:** `templates/post.md`

### Git (Recommended)

For publishing directly from Obsidian.

**Workflow:**
- `Ctrl+Shift+S` — Commit and push (publish)
- `Ctrl+S` — Save only (with Custom Save if using Astro Composer)

## Vault Setup

### Option A: Separate Vault for Blog

Create an Obsidian vault at the repository root:

```text
gvns.ca/
├── .obsidian/          # Obsidian config
├── src/content/writing/ # Posts live here
├── templates/          # Post templates
└── ...
```

### Option B: Symlink into Existing Vault

If you have a main PKM vault, symlink the content folder:
```bash
ln -s /path/to/gvns.ca/src/content/writing ~/obsidian-vault/blog
```

## Writing Workflow

### Creating a New Post

**With Astro Composer:**
1. `Ctrl+N` to create new note
2. Plugin auto-generates frontmatter from template
3. Title becomes slug automatically
4. File moves to correct `YYYY/MM/` folder on save

**Manual / Zed users:**
```bash
npm run new-post
# or
npm run new-post -- "My Post Title"
```

### Ingesting Bare Markdown

For files written elsewhere without proper frontmatter:
```bash
npm run ingest -- path/to/file.md
```

The CLI:
1. Extracts title from first H1 or filename
2. Suggests tags based on content keywords
3. Prompts for missing fields
4. Moves file to correct location

### Publishing

1. Remove `draft: true` (or set to `false`)
2. Commit and push to main branch
3. Cloudflare Pages auto-deploys

## Tag Taxonomy

Use 1-4 tags per post. First tag is primary (used for filtering, RSS).

### Tech & Homelab
| Tag | Description |
|-----|-------------|
| `homelab` | Self-hosting, home infrastructure |
| `docker` | Containers, Docker Compose |
| `linux` | Linux administration, CLI |
| `networking` | DNS, VPNs, firewalls |
| `automation` | Scripts, CI/CD, cron |
| `web-dev` | Frontend, backends, frameworks |

### Movement & Training
| Tag | Description |
|-----|-------------|
| `bjj` | Brazilian Jiu-Jitsu |
| `movement` | General movement practice |
| `training` | Programming, methodology |

### Productivity & Life
| Tag | Description |
|-----|-------------|
| `adhd` | ADHD strategies, accommodations |
| `productivity` | Systems, tools, workflows |
| `pkm` | Personal knowledge management |

### Meta & Essays
| Tag | Description |
|-----|-------------|
| `essay` | Long-form opinion/analysis |
| `tutorial` | Step-by-step guide |
| `til` | Today I Learned (short) |
| `meta` | Site updates, behind-the-scenes |

## Frontmatter Reference

### Required Fields

```yaml
---
title: "Your Post Title"          # max 100 chars
description: "SEO summary"        # max 200 chars (aim for 150-160)
pubDate: 2026-02-04              # YYYY-MM-DD
tags: ["homelab", "docker"]      # 1-4 tags from taxonomy
---
```

### Optional Fields

```yaml
---
updatedDate: 2026-02-15          # Shows "Updated" badge
draft: true                      # Excludes from production build
heroImage: "./images/hero.jpg"   # Relative to post file
---
```

## Troubleshooting

### Post not appearing on site

1. Check `draft: true` is removed
2. Verify file is in `src/content/writing/YYYY/MM/`
3. Check frontmatter syntax (no trailing commas in YAML)
4. Run `npm run build` locally to see errors

### Wikilinks not converting

Ensure Astro Composer is enabled and configured for your content folder.

### Tags not showing

- Verify tags are from the valid taxonomy (kebab-case only)
- Check you have 1-4 tags (min 1, max 4)

---

*Last updated: 2026-02-04*
