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

The trade-off: hero images bypass Astro's per-image optimisation. We mitigate this on two fronts:

1. **At upload (in this PR):** Sveltia converts raster uploads to WebP @ q85 and resizes to max 2048px in the browser before commit. Config lives under `media_libraries.default.config.transformations.raster_image` in `public/admin/config.yml`. SVGs are untouched.
2. **At render (planned, follow-up):** add `@unpic/astro` with the Cloudflare provider so `<Image src="/uploads/...">` is rewritten to `/cdn-cgi/image/...` URLs, giving responsive srcset + format=auto at the edge (free up to 5K unique transforms/month on Cloudflare's free tier).

### Schema

`heroImage` is validated as a string starting with `/uploads/` (see `src/content.config.ts`):

```ts
const uploadsPathSchema = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\/uploads\/.+/).optional()
);
// ...
heroImage: uploadsPathSchema,
```

Empty strings written by the CMS for unset fields are coerced to `undefined`.
