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
│   analytics.gvns.ca ──► Hetzner VPS (Umami)        │
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
- `Content-Security-Policy` (allowlists `analytics.gvns.ca` for Umami tracker)
- `Strict-Transport-Security` with preload
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Analytics: Umami (Self-Hosted)

### Server Specification

| Spec | Value |
|------|-------|
| **Provider** | Hetzner |
| **Plan** | CAX11 (ARM64) |
| **Cost** | ~€3.50/month |
| **CPU** | 2 Ampere Altra cores |
| **RAM** | 4 GB |
| **Storage** | 40 GB SSD |
| **Transfer** | 20 TB/month |
| **OS** | Ubuntu 24.04 LTS |

### Stack

- **Caddy** reverse proxy for `analytics.gvns.ca` → Umami :3000
- **Umami** Docker container (PostgreSQL variant)
- **PostgreSQL 15** Docker container

### Docker Compose

Location: `/opt/umami/docker-compose.yml`

```yaml
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: umami
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      DATABASE_URL: postgresql://umami:${POSTGRES_PASSWORD}@db:5432/umami
      DATABASE_TYPE: postgresql
      APP_SECRET: ${APP_SECRET}
      DISABLE_TELEMETRY: 1
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - umami-network

  db:
    image: postgres:15-alpine
    container_name: umami-db
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U umami"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - umami-network

networks:
  umami-network:
    driver: bridge
```

### Tracked Sites

| Site | Website ID |
|------|-----------|
| gvns.ca | `658b4ad8-cda9-4b91-b341-36e6e8148538` |

### Tracker Integration

Script tag in `src/components/BaseHead.astro`:
```html
<script defer src="https://analytics.gvns.ca/script.js" data-website-id="658b4ad8-cda9-4b91-b341-36e6e8148538"></script>
```

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
| A | `analytics` | `<hetzner-ip>` | Proxied |

## Backups

| What | How | Frequency | Retention |
|------|-----|-----------|-----------|
| Umami DB | `pg_dump` via cron | Daily 3:00 AM | 7 days local |
| Umami DB (offsite) | rsync to Backrest | Daily 4:00 AM | Per Backrest policy |
| Site content | Git repo is source of truth | N/A | N/A |

## Cost Summary

| Item | Monthly |
|------|---------|
| Cloudflare Pages | $0 |
| Hetzner CAX11 (Umami) | ~€3.50 |
| Domain | ~$1 (amortised) |
| **Total** | **~€4.50/month** |

---

*Last updated: 2026-02-03*
