# CMS Setup

Sveltia CMS is mounted at `gvns.ca/admin`. Auth is brokered by the `auth.gvns.ca` Worker (GitHub OAuth).

## Posts use the bundle layout

Each post is its own folder. The post body is `index.md`; uploaded images sit beside it as siblings:

```
src/content/posts/2026/04/<slug>/
├── index.md
├── hero.webp
└── inline-figure.webp
```

The CMS writes `path: "{{year}}/{{month}}/{{slug}}/index"` to enforce this shape (`public/admin/config.yml`).

## Media uploads

There is no top-level `media_folder` configured. Sveltia's default entry-relative resolution puts every uploaded file (hero **and** inline body images) into the post's bundle directory.

### Hero image

The Hero image field writes a bare filename into frontmatter:

```yaml
heroImage: hero.webp
```

The schema for `posts.heroImage` is Astro's [`image()`](https://docs.astro.build/en/guides/images/#images-in-content-collections) helper, which auto-imports the file from the entry's directory and runs it through the build-time image pipeline (Sharp via the Cloudflare adapter's `imageService: "compile"`). At render time `<Image>` from `astro:assets` produces fingerprinted, responsive variants under `/_astro/...`.

### Inline body images

Inline images can be inserted three ways — all behave identically:

1. **Image button** in the markdown toolbar.
2. **Drag-and-drop** from your OS file picker onto the editor.
3. **Paste from clipboard** (e.g. a screenshot).

Sveltia uploads the file to the bundle directory, then writes `![alt](filename.webp)` at the cursor — a bare relative ref that Astro's markdown image transform also auto-resolves and optimises because the asset sits beside the entry.

Pasting a *remote* image URL (rather than image bytes) embeds the external `https://...` URL directly without uploading. Useful for embedding third-party images; bypasses the build-time image pipeline.

### Pre-commit transforms

Configured globally under `media_libraries.default.config` in `public/admin/config.yml`:

- Raster uploads (`.jpg`, `.png`, `.gif`) are converted to **WebP at quality 85** and resized to **max 2048px** on the long edge, in the browser, before commit. The committed filename has its extension rewritten — `screenshot.png` becomes `screenshot.webp`.
- SVGs are not transformed; they commit as-is.
- Filenames are slugified — `My Photo.jpg` becomes `my-photo.webp`. No URL-encoding ever appears in markdown refs.

If the in-browser transform fails for a given file, Sveltia falls back to committing the original bytes with the original filename. Rare; it should not produce a `.jpg` containing WebP-encoded data.

## Validator backstop

`scripts/validate-image-refs.mjs` runs as `prebuild` (see `package.json`). It walks every post's `heroImage` frontmatter and every body `![alt](ref)` and fails the build if any referenced file is missing on disk (case-sensitive — APFS would otherwise mask casing bugs). URL-encoded refs are decoded before lookup. The validator also catches legacy `/uploads/...` heroImage values in posts and prints a hint to drop the leading slash.

## The `work` collection

The `work` collection still uses the legacy `/uploads/...` absolute pattern (`uploadsPathSchema` in `src/content.config.ts`). Work entries are not authored via the CMS in the same flow. Migrate to the bundle pattern in a future PR if that changes.

## History

- ADR-014 — original survey, kept absolute `/uploads/...` as the baseline due to a Sveltia regression on entry-relative bundles.
- ADR-015 — supersedes ADR-014's decision #1; switches `posts` to bundle layout now that Sveltia v0.157.1 has the entry-relative fix.
