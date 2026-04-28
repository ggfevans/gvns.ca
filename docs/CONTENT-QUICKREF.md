# Content Authoring Quick Reference

A one-page distillation of `CONTENT-SCHEMA.md` and `OBSIDIAN-SETUP.md` — for getting a post or work entry written and published without bouncing between docs.

> **Need the full reference?** `CONTENT-SCHEMA.md` for the schema spec, `CMS-SETUP.md` for the Sveltia admin, `OBSIDIAN-SETUP.md` for the drafting pipeline.

---

## Three ways to write a post

1. **Sveltia CMS at `gvns.ca/admin`** (recommended; works on mobile). New Post → fill the form → save. The CMS commits a markdown file to `src/content/posts/YYYY/MM/<slug>.md` via the GitHub backend.
2. **Obsidian draft → wikilinks → CMS.** Draft in your vault, then:
   ```bash
   npm run wikilinks < ~/notes/draft.md | pbcopy
   ```
   Paste into a new Sveltia post. The script converts `[[wikilinks]]` to `/posts/<slug>/` links.
3. **Manual.** Create the file directly at `src/content/posts/YYYY/MM/<slug>.md` with valid frontmatter (schema below). Commit and push.

---

## Frontmatter — required (posts collection)

```yaml
---
title: "Your Post Title"               # max 100 chars
description: "1–2 sentences for SEO."  # max 200 chars
pubDate: 2026-04-27                    # YYYY-MM-DD
tags: ["adhd", "productivity"]         # 1–4 from the taxonomy below
---
```

## Frontmatter — optional

```yaml
updatedDate: 2026-04-30                # Shows "Updated" badge
draft: true                            # Excludes from production build
heroImage: /uploads/foo.jpg            # MUST be absolute /uploads/... — Zod-enforced
canonicalUrl: "https://example.com/x"  # If post is syndicated FROM elsewhere
syndication:                           # POSSE — populated by `npm run syndicate`
  - platform: bluesky                  # one of: bluesky | mastodon | threads | linkedin
    url: "https://bsky.app/..."
    syndicatedAt: 2026-04-25T10:00:00Z
    mediaId: "..."                     # platform-specific (optional)
    shortcode: "..."                   # platform-specific (optional)
```

`heroImage` is validated by regex (`^/uploads/.+`) in `content.config.ts`. Sveltia uploads land at `public/uploads/` and are referenced as `/uploads/<filename>`. Relative or `src/assets/` paths will fail the build — see ADR-014 / issue #264.

---

## URL routing — important

Post URL is derived from the **filename only**, not the folder.

```
src/content/posts/2024/12/hello-world.md   →  /posts/hello-world/
src/content/posts/2026/04/code-mockup.md   →  /posts/code-mockup/
```

The `YYYY/MM/` folders are organisation only. Two posts with the same filename in different folders will collide — choose unique slugs.

---

## Tag taxonomy

Use **one primary** + 1–3 secondary tags. Kebab-case only. The Sveltia CMS exposes the same list as a multi-select with min 1, max 4.

| Group | Tags |
|---|---|
| **Tech & Homelab** | `homelab` · `docker` · `linux` · `networking` · `automation` · `web-dev` |
| **Movement & Training** | `bjj` · `movement` · `training` |
| **Productivity & Life** | `adhd` · `productivity` · `pkm` |
| **Meta & Essays** | `essay` · `tutorial` · `til` · `meta` |

> Adding a new tag is a content-architecture decision — propose it (and the rationale) before using it. Update both `public/admin/config.yml` and `CONTENT-SCHEMA.md`.

---

## Voice and style

- **Canadian spelling** — colour, organise, optimise, behaviour.
- **Verb-form section names** — "Write", "Read", "Listen", "Watch", "Code". ADR-010.
- **Conversational but precise.**
  - ✅ "Tracking my music discovery via ListenBrainz"
  - ❌ "My music listening stats powered by ListenBrainz API"

---

## Work collection (separate from posts)

`src/content/work/` has its own schema with required `status` (`active` / `maintained` / `archived`) and 1–6 tags, plus optional `url`, `repo`, `featured`, and the same `/uploads/...`-validated `heroImage`. URL pattern is `/work/<slug>/`. Authored via the Sveltia CMS.

---

## Publishing flow

1. **Draft** in Sveltia (or Obsidian → wikilinks → Sveltia).
2. **Preview** locally if needed: `npm run dev`, hit `http://localhost:4321/posts/<slug>/`. Set `draft: true` while iterating.
3. **Publish:** remove `draft: true`, save in CMS (or commit if manual). Push to `main` triggers Cloudflare Workers Builds; preview deploys spin up automatically for PR pushes.
4. **Syndicate** (optional): `npm run syndicate` posts to configured platforms and writes the `syndication` array back to the post.

---

## Common fixes

- **"heroImage must be an absolute /uploads/... path"** — you wrote a relative path or pointed at `src/assets/`. Move the image to `public/uploads/` (Sveltia does this automatically) and use `/uploads/<filename>`.
- **Build error on tags** — schema requires 1–4. Empty array or 5+ tags will fail.
- **Post not appearing on the site** — check `draft: false` and that `pubDate` isn't in the future.
- **URL collision** — two posts with the same filename in different `YYYY/MM/` folders. Rename one.
- **Wikilinks rendered as raw `[[text]]`** — you skipped `npm run wikilinks`. Convert before pasting into the CMS.
