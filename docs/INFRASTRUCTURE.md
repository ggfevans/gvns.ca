# gvns.ca Infrastructure

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Cloudflare                        │
│                                                     │
│   gvns.ca ──────────► Workers (Static Assets + SSR) │
│                                                     │
│   www.gvns.ca ────► 301 → gvns.ca (CF Redirect Rule) │
│                                                     │
└─────────────────────────────────────────────────────┘

GitHub Actions (scheduled):
  fetch-reading.yml  → src/data/reading.json   → push → Workers Builds rebuild
  fetch-listening.yml → src/data/listening.json → push → Workers Builds rebuild
  fetch-github.yml   → src/data/github.json    → push → Workers Builds rebuild
  fetch-comments.yml → src/data/comments/*.json → push → Workers Builds rebuild
  refresh-threads-token.yml → refreshes THREADS_ACCESS_TOKEN secret (twice monthly)
```

## Site Hosting: Cloudflare Workers

| Setting | Value |
|---------|-------|
| **Provider** | Cloudflare Workers (Static Assets + SSR) |
| **Adapter** | `@astrojs/cloudflare` (`output: 'server'`, all current routes prerendered) |
| **Build command** | `npm run build` |
| **Output** | `dist/client/` (static assets) + `dist/server/` (SSR Worker bundle) |
| **Worker config (root)** | `wrangler.jsonc` — assets binding + compat flags |
| **Worker config (deploy)** | `dist/server/wrangler.json` — adapter-generated, includes resolved `main` |
| **Node version** | 20 (via `.nvmrc`) |
| **Production branch** | `main` |
| **Preview deploys** | Non-`main` branches deploy via `wrangler versions upload` (versioned URL, no prod promotion) |

### Custom Domains

| Domain | Purpose |
|--------|---------|
| `gvns.ca` | Primary (apex) — bound to `gvns-ca` Worker |
| `www.gvns.ca` | Redirects to apex via a Cloudflare Redirect Rule (see below) |

### How Deploys Work

Workers Builds runs a different deploy command for the production branch (`main`) than for every other branch. `main` promotes to production; other branches produce a versioned preview URL without touching `gvns.ca`.

Configured in **Cloudflare → Workers & Pages → gvns-ca → Builds → Build configuration**:

| Field | Value |
|-------|-------|
| Build command | `npm run build` |
| Deploy command (production branch only) | `npx wrangler deploy --config dist/server/wrangler.json` |
| Non-production branch deploy command | `npx wrangler versions upload --config dist/server/wrangler.json` |
| Path | `/` |
| Production branch | `main` |

- **Push to `main`** → `wrangler deploy` promotes the build to the live `gvns-ca` Worker (`gvns.ca`).
- **Push to any other branch** → `wrangler versions upload` returns a versioned preview URL of the form `<hash>-gvns-ca.<account>.workers.dev`. Production is unaffected.
- **PR check** surfaces the preview URL in the Workers Builds log.
- **Scheduled GH Actions** fetch external data → commit JSON → push to `main` → triggers a normal production build.

Before this change, the non-production deploy command was also `wrangler deploy`, so every branch overwrote production — discovered during #247 (CMS adoption). See #262 for context.

No deploy workflow needed in `.github/workflows/`. No Cloudflare secrets in GitHub — Workers Builds uses the native git integration.

### Local Worker Development

```bash
npm run build
./node_modules/.bin/wrangler dev --config dist/server/wrangler.json
```

The `--config dist/server/wrangler.json` flag points wrangler at the adapter-generated config (which has the resolved `main: entry.mjs` and `assets.directory: ../client`). The root `wrangler.jsonc` intentionally omits `main` because `@cloudflare/vite-plugin` validates that path during `astro build` before the SSR bundle exists.

### www → Apex Redirect

Configured as a Cloudflare **Redirect Rule** (Rules → Redirect Rules), not in `_redirects`:

| Field | Value |
|---|---|
| If: | `Hostname` equals `www.gvns.ca` |
| Then | Static redirect, `301`, target: `concat("https://gvns.ca", http.request.uri.path)` |
| Preserve query string | ✓ |

Workers Static Assets rejects absolute URLs in `_redirects` (validation error 10021), so the previous `https://www.gvns.ca/* https://gvns.ca/:splat 301` rule could not be carried forward. A path-only `/*` rule in `_redirects` would also fire on apex requests since both hostnames route to the same Worker, breaking `gvns.ca`. Cloudflare Redirect Rules run at the edge before the Worker sees the request, which is the correct layer for hostname-based redirects.

`public/_redirects` is retained for any future *path-relative* redirects.

### Security Headers

Served via `_headers` file (copied from `public/` to `dist/client/` during build):
- `Content-Security-Policy`
- `Strict-Transport-Security` with preload
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Migration History

Migrated from Cloudflare Pages to Workers in 2026-04 (issue #249). Pages project retained for a 2-week soak window post-cutover, then archived.

## CI/CD

### GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR to `main` | Build check |
| `fetch-reading.yml` | Daily schedule | Fetch Hardcover data (future) |
| `fetch-listening.yml` | Daily schedule | Fetch ListenBrainz data (future) |
| `fetch-github.yml` | Daily schedule | Fetch GitHub activity (future) |
| `fetch-comments.yml` | Hourly schedule | Fetch Threads replies for syndicated posts |
| `refresh-threads-token.yml` | Twice monthly | Refresh Threads long-lived access token |
| `syndicate.yml` | Push to main (writing changes) | Cross-post new writing to Bluesky, Mastodon, Threads |

### Required Secrets (GitHub Actions)

| Secret | Used by | Purpose |
|--------|---------|---------|
| `HARDCOVER_TOKEN` | fetch-reading | Hardcover API auth (future) |
| `HARDCOVER_USER_ID` | fetch-reading | Hardcover user (future) |
| `LISTENBRAINZ_USERNAME` | fetch-listening | LB user (future) |
| `THREADS_USER_ID` | syndicate, fetch-comments | Threads user ID |
| `THREADS_ACCESS_TOKEN` | syndicate, fetch-comments | Long-lived token (refreshed by workflow) |
| `THREADS_APP_ID` | refresh-threads-token | Threads app ID for token refresh |
| `THREADS_APP_SECRET` | refresh-threads-token | Threads app secret for token refresh |
| `BLUESKY_HANDLE` | syndicate | Bluesky handle |
| `BLUESKY_APP_PASSWORD` | syndicate | Bluesky app password |
| `MASTODON_INSTANCE` | syndicate | Mastodon instance URL |
| `MASTODON_TOKEN` | syndicate | Mastodon access token |
| `GH_PAT` | all data workflows, syndicate | GitHub PAT for pushing and secret management |
| `WHOOP_CLIENT_ID` | fetch-daily (whoop step) | Whoop OAuth client ID (`e888c435-…`) |
| `WHOOP_CLIENT_SECRET` | fetch-daily (whoop step) | Whoop OAuth client secret (1Password) |
| `WHOOP_REFRESH_TOKEN` | fetch-daily (whoop step) | Whoop refresh token — rotated on every workflow run |
| `WHOOP_ACCESS_TOKEN` | fetch-daily (whoop step) | Whoop access token — also rotated each run (script can re-derive from refresh) |

No Cloudflare secrets needed in GitHub — deploys are handled by Workers Builds' native git integration.

### In-repo fetch pattern (Whoop = first instance)

`scripts/fetch-whoop.mjs` is the prototype of the consolidated in-repo fetch shape that will eventually replace the `*-json-bourne` sibling repos (steam / github / hardcover / listenbrainz / trakt). Key conventions:

- **Script lives in `scripts/`**, written as Node ESM, dependency-free where possible (uses native `fetch`, `node:child_process`, `node:fs/promises`).
- **Refresh-first, rotate-immediately.** OAuth refresh tokens that rotate per use (Whoop, Threads) must be persisted back to the GH secret before any subsequent fetch can fail — otherwise the chain breaks and bootstrap is required. See `scripts/fetch-whoop.mjs` §4 of the spec.
- **Pipe secrets via stdin** to `gh secret set --body-file -` to keep them out of `argv`, workflow logs, and shell history.
- **Failure surfacing as issues.** Any error opens or comments on an open issue titled `[<integration>-auth] …` so failures are visible in normal triage rather than only in workflow logs.
- **`continue-on-error: true`** on each fetch step so one integration's outage doesn't fail the whole daily run; the final summary block surfaces per-step status.

If/when the `*-json-bourne` migrations land, the composite-action shape under `.github/actions/fetch-*/` will probably replace this simpler "script + run" form. For now the Whoop integration's flow is the template for any *new* in-repo fetcher.

## DNS Records (Cloudflare)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `gvns.ca` | (managed by CF — Worker custom domain) | Proxied |
| CNAME | `www` | (managed by CF — Worker custom domain) | Proxied |

## Backups

| What | How | Frequency | Retention |
|------|-----|-----------|-----------|
| Site content | Git repo is source of truth | N/A | N/A |

## Cost Summary

| Item | Monthly |
|------|---------|
| Cloudflare Workers (Free tier) | $0 |
| Domain | ~$1 (amortised) |
| **Total** | **~$1/month** |

---

*Last updated: 2026-04-27*
