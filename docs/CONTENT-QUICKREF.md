# Content Authoring Quick Reference

A one-page distillation of `CONTENT-SCHEMA.md` and `OBSIDIAN-SETUP.md` — for getting a post or work entry written and published without bouncing between docs.

> **Need the full reference?** `CONTENT-SCHEMA.md` for the schema spec, `OBSIDIAN-SETUP.md` for the drafting pipeline. This file is the cheat sheet.

---

## Three ways to start a post

```bash
# 1. Interactive scaffold — fastest for posts not drafted in Obsidian
npm run new-post
npm run new-post -- "My Post Title"

# 2. Obsidian draft → ingest
npm run ingest -- ~/notes/gVault/02-AREAS/writing/drafts/my-draft.md

# 3. Manual — create the file directly at:
#    src/content/writing/YYYY/MM/my-post.md
```

The ingest script extracts the title from the first `# heading`, converts `[[wikilinks]]` to `/write/<slug>/` links, suggests tags, and prompts for the rest.

---

## Frontmatter — required

```yaml
---
title: "Your Post Title"               # max 100 chars
description: "1–2 sentences for SEO."  # max 200 chars (~150–160 ideal)
pubDate: 2026-04-24                    # YYYY-MM-DD
tags: ["adhd", "productivity"]         # 1–4 from the taxonomy below
---
```

## Frontmatter — optional

```yaml
updatedDate: 2026-04-30                # Shows "Updated" badge
draft: true                            # Excludes from production build
heroImage: "./images/hero.jpg"         # Relative to the post file
canonicalUrl: "https://example.com/x"  # If post is syndicated FROM elsewhere
syndication:                           # POSSE — populated by `npm run syndicate`
  - platform: bluesky                  # Don't fill manually
    url: "https://bsky.app/..."
    syndicatedAt: 2026-04-25T10:00:00Z
```

---

## URL routing — important

Post URL is derived from the **filename only**, not the folder.

```
src/content/writing/2024/12/hello-world.md   →  /write/hello-world/
src/content/writing/2026/02/code-mockup.md   →  /write/code-mockup/
```

The `YYYY/MM/` folders are organisation only. Two posts with the same filename in different folders will collide — choose unique slugs.

---

## Tag taxonomy

Use **one primary** + 1–3 secondary tags. Kebab-case only.

| Group | Tags |
|---|---|
| **Tech & Homelab** | `homelab` · `docker` · `linux` · `networking` · `automation` · `web-dev` |
| **Movement & Training** | `bjj` · `movement` · `training` |
| **Productivity & Life** | `adhd` · `productivity` · `pkm` |
| **Meta & Essays** | `essay` · `tutorial` · `til` · `meta` |

> Adding a new tag is a content-architecture decision — propose it (and the rationale) before using it.

---

## Voice and style

- **Canadian spelling** — colour, organise, optimise, behaviour.
- **Verb-form section names** — "Write", "Read", "Listen", never the gerund.
- **Brand persona** (from site spec): minimal, refined, technical; information-dense but scannable; developer-focused with design sensibility. "Serious work, questionable puns" is the README's framing.
- **Conversational but precise.** Site-spec example:
  - ✅ "Tracking my music discovery via ListenBrainz"
  - ❌ "My music listening stats powered by ListenBrainz API"

---

## Writing flow (recommended)

1. **Draft** in Obsidian (`~/notes/gVault/02-AREAS/writing/drafts/`) or via `npm run new-post`. Wikilinks are fine — ingest converts them.
2. **Ingest** if drafted in Obsidian: `npm run ingest -- <path>`. Confirm the suggested title, slug, and tags at the prompts.
3. **Preview** locally: `npm run dev`, hit `http://localhost:4321/write/<slug>/`.
4. **Iterate** in `src/content/writing/YYYY/MM/<slug>.md` — the file is the source of truth from this point.
5. **Publish:** remove `draft: true`, commit, push to `main`. Cloudflare Pages auto-deploys.
6. **Syndicate** (optional): `npm run syndicate` posts to configured platforms and writes the `syndication` array back to the post.

---

## Work entries

`src/content/work/<project>.md` with this schema:

```yaml
---
title: "Project Name"
description: "1–2 sentences."
url: "https://example.com"            # optional — live URL
repo: "https://github.com/..."        # optional — source repo
status: active                        # active | maintained | archived
tags: ["Astro", "Svelte", "Tailwind"] # 1–6, free-form (not the post taxonomy)
heroImage: "./images/hero.jpg"        # optional
featured: true                        # optional — surfaces on home + work index
---

Body — short narrative about the project. Used on the work detail page.
```

Work entries route as `/work/<filename>/` (no nested folders).

---

## Common gotchas

- **Post not appearing?** Check `draft: true` is removed, file is in `src/content/writing/YYYY/MM/`, frontmatter parses cleanly. `npm run build` will surface schema errors.
- **Tag rejected?** It's not in the taxonomy or it's not kebab-case. Either fix the tag or propose adding it.
- **Image not loading?** `heroImage` paths are **relative to the post file**, not the project root. Co-locate images with the post: `src/content/writing/2026/04/post.md` + `src/content/writing/2026/04/images/hero.jpg`.
- **Wikilink didn't resolve?** The ingest script logs a warning when `[[Foo]]` doesn't match an existing post slug — the link becomes plain text. Either fix the link or accept it before publishing.
- **Description over 200 chars?** Schema validation will fail the build. Trim to ~150–160 for the social-card sweet spot.

---

*Last updated: 2026-04-24*
