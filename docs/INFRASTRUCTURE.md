# gvns.ca Infrastructure

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Cloudflare                        │
│                                                     │
│   gvns.ca ──────────► CF Pages (static site)       │
│                                                     │
│   www.gvns.ca ────────► 301 → gvns.ca (_redirects) │
│                                                     │
└─────────────────────────────────────────────────────┘

GitHub Actions (scheduled):
  fetch-reading.yml  → src/data/reading.json   → push → CF Pages rebuild
  fetch-listening.yml → src/data/listening.json → push → CF Pages rebuild
  fetch-github.yml   → src/data/github.json    → push → CF Pages rebuild
```

## Site Hosting: Cloudflare Pages

| Setting | Value |
|---------|-------|
| **Provider** | Cloudflare Pages (free tier) |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |
| **Node version** | 20 (via `.nvmrc`) |
| **Production branch** | `main` |
| **Preview deploys** | Enabled (auto on PRs) |

### Custom Domains

| Domain | Purpose |
|--------|---------|
| `gvns.ca` | Primary (apex) |
| `www.gvns.ca` | Redirects to apex via `_redirects` |

### How Deploys Work

1. Push to `main` → CF Pages auto-builds and deploys
2. PR opened → CF Pages creates preview deploy with unique URL
3. Scheduled GH Actions fetch external data → commit JSON → push → triggers rebuild

No deploy workflow needed. No wrangler. No secrets for deploys.

### Security Headers

Served via `_headers` file:
- `Content-Security-Policy`
- `Strict-Transport-Security` with preload
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## CI/CD

### GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR to `main` | Build check |
| `fetch-reading.yml` | Daily schedule | Fetch Hardcover data (future) |
| `fetch-listening.yml` | Daily schedule | Fetch ListenBrainz data (future) |
| `fetch-github.yml` | Daily schedule | Fetch GitHub activity (future) |

### Required Secrets (GitHub Actions)

| Secret | Used by | Purpose |
|--------|---------|---------|
| `HARDCOVER_TOKEN` | fetch-reading | Hardcover API auth (future) |
| `HARDCOVER_USER_ID` | fetch-reading | Hardcover user (future) |
| `LISTENBRAINZ_USERNAME` | fetch-listening | LB user (future) |

No Cloudflare secrets needed in GitHub — deploys are handled by CF Pages native integration.

## DNS Records (Cloudflare)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `gvns.ca` | `<project>.pages.dev` | Proxied |
| CNAME | `www` | `<project>.pages.dev` | Proxied |

## Backups

| What | How | Frequency | Retention |
|------|-----|-----------|-----------|
| Site content | Git repo is source of truth | N/A | N/A |

## Cost Summary

| Item | Monthly |
|------|---------|
| Cloudflare Pages | $0 |
| Domain | ~$1 (amortised) |
| **Total** | **~$1/month** |

---

*Last updated: 2026-02-03*
