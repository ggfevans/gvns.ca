# CMS Setup

Sveltia CMS is mounted at `gvns.ca/admin`. Auth is brokered by the `auth.gvns.ca` Worker (GitHub OAuth).

## Media uploads

All CMS-uploaded media (currently just `heroImage`) lands in `/public/uploads/` and is referenced by absolute URL in frontmatter:

```yaml
heroImage: /uploads/my-photo.jpg
```

Config (`public/admin/config.yml`):

```yaml
media_folder: public/uploads
public_folder: /uploads
```

### Why not co-located images via Astro's `image()` pipeline?

We tried `media_folder_relative: true` with a per-collection nested layout. Sveltia's entry-folder resolution treats `path: "{{year}}/{{month}}/{{slug}}"` as a folder (not a file path), so uploads always nest under a slug-named subdirectory and the public path Sveltia writes does not match where the file lands. See issue #264.

The trade-off: hero images bypass Astro's per-image optimisation. If we want optimised heroes later, options are:

- Run a build step that copies `public/uploads/*` through `astro:assets` and rewrites frontmatter, or
- Restructure post collections to folder-style (`{slug}/index.md`) so Sveltia's relative resolution lines up — at the cost of breaking the current URL-from-filename convention.

### Schema

`heroImage` is validated as a string starting with `/uploads/` (see `src/content.config.ts`):

```ts
heroImage: z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\/uploads\//).optional()
)
```

Empty strings written by the CMS for unset fields are coerced to `undefined`.
