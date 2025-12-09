# gvns.ca Infrastructure

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloudflare                              │
│                   (DNS + CDN Proxy)                         │
│                                                             │
│    gvns.ca ──────────────► Linode VPS (45.79.xxx.xxx)      │
│                                   │                         │
│    analytics.gvns.ca ─────────────►│                        │
└─────────────────────────────────────┼───────────────────────┘
                                      │
                                ┌─────┴─────┐
                                │   Caddy   │
                                │  :80/:443 │
                                └─────┬─────┘
                                      │
                  ┌───────────────────┼───────────────────┐
                  │                   │                   │
            /var/www/gvns       Umami:3000          PostgreSQL
            (static files)      (analytics)         (Umami DB)
```

## Server Specification

### Linode Nanode

| Spec | Value |
|------|-------|
| **Plan** | Nanode 1GB |
| **Cost** | $5/month (covered by credits until Feb 2026) |
| **CPU** | 1 shared core |
| **RAM** | 1 GB |
| **Storage** | 25 GB SSD |
| **Transfer** | 1 TB/month |
| **OS** | Ubuntu 24.04 LTS |
| **Region** | Toronto, CA (ca-central) |

### Why Linode?

- Existing account with ~$100 credits expiring Feb 2026
- Simple, predictable pricing
- Canadian data centre for low latency
- Good enough for a personal blog

## Domain Configuration

### DNS Records (Cloudflare)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `gvns.ca` | `45.79.xxx.xxx` | ✓ Proxied |
| A | `analytics` | `45.79.xxx.xxx` | ✓ Proxied |
| CNAME | `www` | `gvns.ca` | ✓ Proxied |

### Cloudflare Settings

| Setting | Value |
|---------|-------|
| **SSL/TLS** | Full (strict) |
| **Always Use HTTPS** | On |
| **Auto Minify** | JS, CSS, HTML |
| **Brotli** | On |
| **Cache Level** | Standard |
| **Browser Cache TTL** | 1 month |

## Caddy Configuration

### `/etc/caddy/Caddyfile`

```caddyfile
# Main site - static files
gvns.ca {
    root * /var/www/gvns
    file_server
    encode gzip zstd
    
    # Cache static assets
    @static {
        path *.css *.js *.ico *.gif *.jpg *.jpeg *.png *.svg *.woff *.woff2
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
    
    # Security headers
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    
    # Handle SPA-style routing (if needed)
    try_files {path} {path}/ /index.html
}

# WWW redirect
www.gvns.ca {
    redir https://gvns.ca{uri} permanent
}

# Analytics subdomain - reverse proxy to Umami
analytics.gvns.ca {
    reverse_proxy localhost:3000
}
```

## Umami Analytics

### Docker Compose

**Location**: `/opt/umami/docker-compose.yml`

```yaml
version: '3'
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

### Environment File

**Location**: `/opt/umami/.env`

```bash
POSTGRES_PASSWORD=<generate-strong-password>
APP_SECRET=<generate-32-char-secret>
```

### Umami Setup Checklist

- [ ] Create website in Umami dashboard
- [ ] Copy tracking script to BaseHead.astro
- [ ] Verify data collection
- [ ] Set up basic dashboard views

### Tracking Script

```html
<!-- In BaseHead.astro -->
<script 
  defer 
  src="https://analytics.gvns.ca/script.js" 
  data-website-id="<your-website-id>"
></script>
```

## Deployment

### GitHub Actions Workflow

**Location**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Linode

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build site
        run: npm run build
      
      - name: Deploy to Linode
        uses: burnett01/rsync-deployments@6.0.0
        with:
          switches: -avzr --delete
          path: dist/
          remote_path: /var/www/gvns/
          remote_host: ${{ secrets.LINODE_HOST }}
          remote_user: ${{ secrets.LINODE_USER }}
          remote_key: ${{ secrets.LINODE_SSH_KEY }}
      
      - name: Purge Cloudflare cache
        run: |
          curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CF_ZONE_ID }}/purge_cache" \
            -H "Authorization: Bearer ${{ secrets.CF_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}'
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `LINODE_HOST` | Server IP address |
| `LINODE_USER` | SSH username (deploy user) |
| `LINODE_SSH_KEY` | Private SSH key for deploy user |
| `CF_ZONE_ID` | Cloudflare zone ID for gvns.ca |
| `CF_API_TOKEN` | Cloudflare API token with cache purge permission |

## Server Setup Checklist

### Initial Server Setup

- [ ] Create Linode Nanode in Toronto
- [ ] SSH in and update system (`apt update && apt upgrade`)
- [ ] Create non-root user with sudo
- [ ] Configure SSH (disable password auth)
- [ ] Set up UFW firewall (allow 22, 80, 443)
- [ ] Install Docker and Docker Compose
- [ ] Install Caddy

### Application Setup

- [ ] Create `/var/www/gvns` directory
- [ ] Set up Umami in `/opt/umami`
- [ ] Configure Caddyfile
- [ ] Test HTTPS certificates
- [ ] Verify Umami at analytics.gvns.ca

### CI/CD Setup

- [ ] Create deploy SSH key pair
- [ ] Add public key to server's authorized_keys
- [ ] Add private key to GitHub secrets
- [ ] Create Cloudflare API token
- [ ] Add all secrets to GitHub repository
- [ ] Test deployment pipeline

## Maintenance

### Updating Umami

```bash
cd /opt/umami
docker compose pull
docker compose up -d
```

### Viewing Logs

```bash
# Caddy logs
journalctl -u caddy -f

# Umami logs
docker compose -f /opt/umami/docker-compose.yml logs -f

# Nginx access (if using)
tail -f /var/log/caddy/access.log
```

### Backups

| What | How | Frequency |
|------|-----|-----------|
| Umami DB | `pg_dump` via cron | Daily |
| Site content | Git repo is source of truth | N/A |
| Server config | Document in repo's `/docs` | As changed |

## Cost Summary

### Current (Through Feb 2026)

| Item | Monthly |
|------|---------|
| Linode Nanode | $5 (credits) |
| Cloudflare | $0 |
| Domain | ~$1 (amortised) |
| **Total** | **$0** out of pocket |

### After Feb 2026

| Item | Monthly |
|------|---------|
| Linode Nanode | $5 |
| Cloudflare | $0 |
| Domain | ~$1 |
| **Total** | **~$6/month** |

---

*Last updated: 2024-12-09*
