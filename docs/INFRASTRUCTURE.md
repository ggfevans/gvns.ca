# gvns.ca Infrastructure

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Cloudflare                        │
│                                                     │
│   gvns.ca ──────────► Workers (Static Assets + SSR) │
│                                                     │
│   www.gvns.ca ────────► 301 → gvns.ca (_redirects) │
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
| **Preview deploys** | Enabled (auto on PRs via Workers Builds) |

### Custom Domains

| Domain | Purpose |
|--------|---------|
| `gvns.ca` | Primary (apex) — bound to `gvns-ca` Worker |
| `www.gvns.ca` | Redirects to apex via `_redirects` |

### How Deploys Work

1. Push to `main` → Workers Builds auto-builds and deploys.
2. PR opened → Workers Builds creates a preview deploy on a unique URL.
3. Scheduled GH Actions fetch external data → commit JSON → push → triggers Workers Builds rebuild (same model as the previous Pages setup).

No deploy workflow needed in `.github/workflows/`. No Cloudflare secrets in GitHub — Workers Builds uses the native git integration.

### Local Worker Development

```bash
npm run build
./node_modules/.bin/wrangler dev --config dist/server/wrangler.json
```

The `--config dist/server/wrangler.json` flag points wrangler at the adapter-generated config (which has the resolved `main: entry.mjs` and `assets.directory: ../client`). The root `wrangler.jsonc` intentionally omits `main` because `@cloudflare/vite-plugin` validates that path during `astro build` before the SSR bundle exists.

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

No Cloudflare secrets needed in GitHub — deploys are handled by Workers Builds' native git integration.

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

*Last updated: 2026-04-26*
