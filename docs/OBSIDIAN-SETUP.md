# Obsidian Setup for gwilym.ca

Write posts in Obsidian, publish via the ingest CLI. No plugins required.

## Vault Structure

```
~/notes/gVault/
└── blog-drafts/       ← Write posts here
```

Create the drafts folder if it doesn't exist:

```bash
mkdir -p ~/notes/gVault/02-AREAS/writing/drafts
```

## Writing Workflow

### 1. Draft in Obsidian

Create a markdown file in `~/notes/gVault/02-AREAS/writing/drafts/`. Use normal Obsidian features including wikilinks — they'll be converted at ingest time.

### 2. Ingest into the site

```bash
npm run ingest -- ~/notes/gVault/02-AREAS/writing/drafts/my-post.md
```

The CLI will:
1. Extract title from the first `# heading` (or filename)
2. Convert `[[wikilinks]]` to standard markdown links (`/write/slug/`)
3. Suggest tags based on content keywords
4. Prompt for title, description, tags, and slug
5. Write the post to `src/content/writing/YYYY/MM/slug.md` with frontmatter

If you omit the path, pass any `.md` file — it doesn't have to be in the vault.

### 3. Preview locally

```bash
npm run dev
# Visit http://localhost:4321/write/your-slug/
```

### 4. Publish

1. Remove `draft: true` from frontmatter (or set to `false`)
2. Commit and push to `main`
3. Cloudflare Pages auto-deploys

## Wikilink Handling

The ingest script converts Obsidian wikilinks to standard markdown:

| Obsidian syntax | Output |
|-----------------|--------|
| `[[Hello World]]` | `[Hello World](/write/hello-world/)` |
| `[[Hello World\|custom text]]` | `[custom text](/write/hello-world/)` |

Links resolve against existing post slugs in `src/content/writing/`. Unresolved links become plain text with a console warning, so you can fix them before publishing.

## Alternative: CLI Post Creation

For posts not written in Obsidian:

```bash
npm run new-post              # Interactive prompts
npm run new-post -- "Title"   # With title pre-filled
```

## Tag Taxonomy

Use 1–4 tags per post from the defined taxonomy:

### Tech & Homelab
`homelab` · `docker` · `linux` · `networking` · `automation` · `web-dev`

### Movement & Training
`bjj` · `movement` · `training`

### Productivity & Life
`adhd` · `productivity` · `pkm`

### Meta & Essays
`essay` · `tutorial` · `til` · `meta`

## Frontmatter Reference

### Required

```yaml
---
title: "Your Post Title"          # max 100 chars
description: "SEO summary"        # max 200 chars
pubDate: 2026-02-04              # YYYY-MM-DD
tags: ["homelab", "docker"]      # 1-4 from taxonomy
---
```

### Optional

```yaml
updatedDate: 2026-02-15          # Shows "Updated" badge
draft: true                      # Excludes from production
heroImage: "./images/hero.jpg"   # Relative to post file
```

## Troubleshooting

**Post not appearing:** Check `draft: true` is removed, file is in `src/content/writing/YYYY/MM/`, and frontmatter has no syntax errors. Run `npm run build` to see errors.

**Tags not showing:** Verify tags are from the taxonomy above (kebab-case only), 1–4 per post.

---

*Last updated: 2026-02-18*
