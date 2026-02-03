# gvns.ca Architecture Decision Records

## About This Document

This is a log of significant technical decisions made during the gvns.ca rebuild. Each entry captures the context, decision, and rationale for future reference.

Format inspired by [Architecture Decision Records (ADR)](https://adr.github.io/).

---

## ADR-001: Use Astro as the Framework

**Date**: 2024-12-07  
**Status**: Accepted

### Context
Needed to choose a framework for a content-first writing/work site. Candidates considered:
- Astro
- SvelteKit
- Hugo
- Next.js (current site)

### Decision
Use **Astro 5.x** with Svelte for interactive islands.

### Rationale
- Zero JavaScript by default — perfect for a content site
- Content Collections provide type-safe markdown handling
- Islands architecture allows Svelte where needed without shipping unnecessary JS
- Excellent build performance
- Growing ecosystem and good documentation

### Consequences
- Need to learn Astro-specific patterns
- Limited to static or hybrid rendering (no full SSR needed anyway)
- Svelte knowledge transfers to islands

---

## ADR-002: Self-Host on Linode with Caddy

**Date**: 2024-12-07  
**Status**: Accepted

### Context
Needed hosting solution. Candidates:
- Vercel (current)
- Cloudflare Pages
- Linode VPS
- Netlify

### Decision
Use **Linode Nanode** with **Caddy** as web server.

### Rationale
- Have ~$100 Linode credits expiring Feb 2026
- Need a VPS anyway for Umami analytics
- Caddy provides automatic HTTPS and simple config
- More control than platform hosting
- Learning opportunity for self-hosting content

### Consequences
- Responsible for server maintenance
- Need to set up CI/CD pipeline
- More initial setup work
- Lower ongoing cost ($5/mo vs $0 for Vercel free tier, but credits cover it)

---

## ADR-003: Use Umami for Analytics

**Date**: 2024-12-07  
**Status**: Accepted

### Context
Want privacy-respecting analytics. Candidates:
- Umami (self-hosted)
- Plausible (paid or self-hosted)
- Fathom (paid)
- No analytics

### Decision
Self-host **Umami** on the same Linode VPS.

### Rationale
- Privacy-focused, GDPR compliant without cookie banners
- Lightweight (~2KB script)
- Already have server capacity
- Free (self-hosted)
- Open source, good community

### Consequences
- Additional Docker container to manage
- Need PostgreSQL for Umami data
- Responsible for backups
- analytics.gvns.ca subdomain needed

---

## ADR-004: GVNS Brand Guide Palette

**Date**: 2024-12-09  
**Status**: Accepted

### Context
Needed a colour palette and design direction. Options:
- Custom palette from brand guide
- Existing theme (Dracula, Nord, Catppuccin, etc.)
- Minimal/monochrome

### Decision
Use the **GVNS Brand Guide** palette (forest green + brass accents) with semantic token mappings.

### Rationale
- Brand-aligned and distinctive
- Purpose-built for long-form reading and code
- Consistent dark/light tokens
- Clear accent hierarchy (green primary, brass warm)

### Consequences
- Site reflects GVNS identity and tone
- Requires token maintenance across components
- Custom theme needed for code highlighting

---

## ADR-005: Self-Hosted Brand Fonts

**Date**: 2024-12-09  
**Status**: Accepted

### Context
Needed to choose typography approach. Options:
- Self-hosted web fonts
- Google Fonts CDN
- System font stack only

### Decision
Use **IBM Plex Sans** (400/500/600) and **JetBrains Mono** (400), self-hosted via @fontsource.

### Rationale
- Brand-aligned typography
- Local hosting avoids third-party requests
- Predictable rendering across platforms
- Compatible with performance targets using `font-display: swap`

### Consequences
- Additional font assets in build
- Must monitor page weight and FCP
- Requires occasional font updates

---

## ADR-006: Documentation Storage Strategy

**Date**: 2024-12-09  
**Status**: Accepted

### Context
Needed to decide where project documentation lives. Options:
- A: All in Obsidian (gVault)
- B: All in GitHub repo
- C: Obsidian for tracking, repo for specs
- D: Repo as source, Claude project as cache

### Decision
Use **Option D**: GitHub repo (`/docs/`) as source of truth, upload stable docs to Claude project knowledge for fast access. Obsidian for project tracking only.

### Rationale
- Technical specs should be version controlled with code
- Claude project knowledge provides instant access without MCP calls
- Obsidian's strength is personal knowledge management, not technical specs
- Clear separation: specs in repo, progress in Obsidian

### Consequences
- Need to sync Claude project knowledge when docs change
- Two places to check for information
- Cleaner separation of concerns

---

## Template for New Decisions

```markdown
## ADR-XXX: [Title]

**Date**: YYYY-MM-DD  
**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXX

### Context
[What is the issue we're addressing?]

### Decision
[What did we decide?]

### Rationale
[Why did we make this decision?]

### Consequences
[What are the results of this decision?]
```

---

*Last updated: 2024-12-09*
