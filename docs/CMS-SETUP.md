# CMS Setup

Sveltia CMS is mounted at `gvns.ca/admin`. Auth is brokered by the `auth.gvns.ca` Worker, backed by a **GitHub App** (`gvns-ca-cms[bot]`). The App is the actor on every CMS commit, which keeps it distinct from the human's `git push` and lets branch protection on `main` allow CMS commits while still requiring PRs from a CLI session (#263).

## Auth flow

The Worker runs the standard GitHub web flow with the App's `client_id` / `client_secret`. The shape is identical to OAuth Apps with two differences:

1. **No `scope` param** on `/login/oauth/authorize` — App permissions are fixed at App definition.
2. **Tokens expire** ("Expire user authorization tokens" enabled on the App). The Worker passes `refresh_token` and `expires_in` through to Sveltia in the success postMessage and exposes a `POST /refresh` endpoint that proxies refresh-token exchanges to GitHub. Sveltia drives the refresh client-side.

The Worker uses **user-to-server** tokens only — no JWTs, no installation tokens, no private key. A user can only commit to repos where (a) the App is installed AND (b) the user has access. Both hold for `ggfevans/gvns.ca`.

### Worker secrets (`workers/sveltia-auth`)

```bash
wrangler secret put GITHUB_CLIENT_ID         # App's Client ID (Iv23...)
wrangler secret put GITHUB_CLIENT_SECRET     # App's Client Secret (generate from App settings)
wrangler secret put AUTH_ALLOWED_ORIGINS     # https://gvns.ca[,https://<preview>...]
```

The App's **Callback URL** must be `https://auth.gvns.ca/callback` (matches the route the Worker handles).

### Re-rotating from OAuth App to GitHub App

If you ever need to rotate or replace the backing identity:

1. Create / update the GitHub App; install on `ggfevans/gvns.ca`.
2. Update the three secrets above with `wrangler secret put`.
3. Redeploy the Worker (`npm run deploy` in `workers/sveltia-auth`).
4. Test `gvns.ca/admin` login end-to-end before flipping branch protection.

## Branch protection posture

`main` is protected via a **ruleset**: PRs required, Workers Builds status check required, with the GitHub App on the **bypass list**. The CMS publishes directly to `main` (Sveltia does not support editorial workflow); the human user is *not* on the bypass list, so `git push origin main` from a CLI session is rejected and must go through a PR. See [#263](https://github.com/ggfevans/gvns.ca/issues/263) for context.

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

The schema for `posts.heroImage` is Astro's [`image()`](https://docs.astro.build/en/guides/images/#images-in-content-collections) helper, which auto-imports the file from the entry's directory. At render time `<Image>` from `astro:assets` uses the `@unpic/astro` service (configured in `astro.config.mjs` with `fallbackService: "cloudflare"` and the adapter set to `imageService: "custom"`), producing Cloudflare Image Transformations URLs.

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

## Render-time hero optimisation

Heroes are served through **Cloudflare Image Transformations** at render time. The pipeline:

1. The CMS uploads (and pre-transforms — WebP @ q85, max 2048px) the hero into the post's bundle directory as a sibling of `index.md`.
2. `posts.heroImage` is an Astro `image()` ESM import; the markdown frontmatter holds a bare filename (`heroImage: hero.webp`).
3. At render, `<Image>` from `astro:assets` runs through the [`@unpic/astro`](https://unpic.pics/img/astro/) image service (configured in `astro.config.mjs` with `fallbackService: "cloudflare"`), which rewrites every `src` and `srcset` entry to `/cdn-cgi/image/width=<n>,f=auto,fit=cover/_astro/<hash>.<ext>`.
4. Cloudflare's edge serves AVIF/WebP per the request's `Accept` header (`f=auto`), caches each unique output per zone, and bills per unique output per month with cache hits free (free tier: 5,000/month).

The `@astrojs/cloudflare` adapter is configured with `imageService: "custom"` so it doesn't override `image.service`. If you later swap unpic for Sharp or the adapter's built-in service, update the adapter's `imageService` to `"compile"` (Sharp) or `"cloudflare"` (the adapter's built-in CF Image Transformations service) accordingly.

Cloudflare Image Transformations must be enabled on the zone (Speed → Optimization → Image Transformations). See ADR-018.

## History

- ADR-014 — original survey, kept absolute `/uploads/...` as the baseline due to a Sveltia regression on entry-relative bundles.
- ADR-015 — supersedes ADR-014's decision #1; switches `posts` to bundle layout now that Sveltia v0.157.1 has the entry-relative fix.
- ADR-018 — adopts `@unpic/astro` + Cloudflare Image Transformations for render-time hero optimisation.
