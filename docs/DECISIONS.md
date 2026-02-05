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
**Status**: Superseded by ADR-007

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
**Status**: Superseded by ADR-008

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
**Status**: Superseded by ADR-009

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

## ADR-007: Deploy via Cloudflare Pages

**Date**: 2026-02-02  
**Status**: Accepted
**Supersedes**: ADR-002

### Context
The original plan was to self-host on a Linode Nanode with Caddy. The site spec designates Cloudflare Pages as the deployment target, with automatic deploys on push to main and custom domain support.

### Decision
Use **Cloudflare Pages** for hosting and deployment.

### Rationale
- Zero server maintenance — no VPS to patch, monitor, or pay for
- Automatic deploys on push to main
- Built-in CDN with global edge network
- Custom domain with automatic HTTPS
- Free tier covers the site's needs
- Simpler CI/CD — no rsync or SSH keys needed

### Consequences
- No VPS for self-hosted services (Umami needs separate hosting or a managed alternative)
- Less control over server configuration
- Dependent on Cloudflare platform availability
- Build environment constraints (Cloudflare's build system)

---

## ADR-008: P1-P5 Accent Colour Palette

**Date**: 2026-02-02  
**Status**: Accepted
**Supersedes**: ADR-004

### Context
The GVNS Brand Guide v1.0 specified forest green + warm gold. The site spec defines a five-colour accent system (P1-P5) where each activity section has a dedicated colour, enabling visual wayfinding across the site.

### Decision
Use the **P1-P5 accent palette**:
- **Violet** (`#8b5cf6` / `#7c3aed`) — Primary brand, Code activity
- **Rose** (`#f43f5e` / `#e11d48`) — Read section
- **Emerald** (`#10b981` / `#059669`) — Listen section
- **Amber** (`#f59e0b` / `#d97706`) — Write section
- **Sky** (`#0ea5e9` / `#0284c7`) — Status indicators

Dark mode uses `-500` variants, light mode uses `-600` for contrast.

### Rationale
- Each activity section gets a distinct, memorable colour
- Enables visual wayfinding across pages (Read = rose, Code = violet, etc.)
- Zinc-based neutrals provide clean, modern surface hierarchy
- Both dark and light variants tested for WCAG AA compliance

### Consequences
- More colours to maintain consistently
- Colour discipline required — each activity type must use its assigned colour
- Components need both `dark:` and light variants
- Custom Shiki themes needed for both modes

---

## ADR-009: Inter as Primary Typeface

**Date**: 2026-02-02  
**Status**: Accepted
**Supersedes**: ADR-005

### Context
ADR-005 chose IBM Plex Sans. The site spec designates Inter as the primary typeface, paired with JetBrains Mono for code.

### Decision
Use **Inter** (weights: 400, 500, 600, 700) and **JetBrains Mono** (400), self-hosted.

### Rationale
- Inter is purpose-built for screens with excellent legibility at small sizes
- Variable font option keeps payload small
- Extensive weight range (400-700) covers all hierarchy needs
- Strong community adoption and active maintenance
- JetBrains Mono retained for code — proven readability

### Consequences
- Font assets change in build
- IBM Plex Sans removed from dependencies
- Subtle visual shift across all text — Inter has different metrics

---

## ADR-010: Verb-Based URL Naming Convention

**Date**: 2026-02-02  
**Status**: Accepted

### Context
Content pages used gerund-form URLs (`/writing`, `/reading`). The site spec establishes a verb-based naming convention for all pages: present-tense verbs consistently.

### Decision
Use **verb-based URLs**: `/write`, `/read`, `/listen`, `/watch`, `/code`.

### Rationale
- Consistent voice across the entire site
- Shorter, punchier URLs
- Matches nav labels (Write, not Writing)
- Activity pages use verbs as brand identity — "Read" not "Reading" or "Books"

### Consequences
- Existing `/writing` and `/reading` routes need redirects
- Internal links updated across all components and content
- RSS feed URL may change
- SEO: 301 redirects preserve link equity

---

## ADR-011: Class-Based Dark/Light Theme Toggle

**Date**: 2026-02-02  
**Status**: Accepted

### Context
The current implementation uses CSS custom variables with `[data-theme="light"]` selectors. The site spec and light mode spec define a Tailwind `dark:` class-based approach with `darkMode: 'class'`.

### Decision
Use **Tailwind's class-based dark mode** (`darkMode: 'class'`) with a `dark` class on `<html>`.

### Rationale
- Tailwind's `dark:` variant is idiomatic and well-documented
- Co-locates light and dark styles in the same class list
- System preference detection on first visit, localStorage persistence after
- Inline `<head>` script prevents flash of wrong theme

### Consequences
- Components use `dark:` utility classes instead of CSS variable swaps
- Theme toggle adds/removes `dark` class on `<html>`
- Both modes must be tested for every component
- Slightly more verbose class lists but better colocation

---

## ADR-012: astro-pagefind Integration for Search

**Date**: 2026-02-05
**Status**: Accepted

### Context
Site search used a manual Pagefind CLI step (`astro build && npx pagefind --site dist`) with a Svelte island (`Search.svelte`) that loaded the Pagefind UI as an IIFE script via dynamic `import()`. This caused multiple issues:
- CSP blocked WebAssembly compilation (`wasm-unsafe-eval` missing from `script-src`)
- The Svelte component was purely imperative DOM work (show/hide dialog, keydown listener, lazy-load script) — no reactive state justified a Svelte island
- Rollup required an `external` hack to ignore the `/pagefind/pagefind-ui.js` import
- No dev mode search support

### Decision
Replace manual Pagefind CLI + Svelte island with **astro-pagefind** integration + native **Astro component**.

### Rationale
- astro-pagefind automatically indexes pages during `astro build` — no separate CLI step
- Provides proper ES module import (`@pagefind/default-ui`) instead of IIFE script loading
- Search dialog is imperative DOM work (open/close dialog, focus input, keydown handler) — Astro inline `<script>` handles this without shipping a framework runtime
- Dev mode search works with a prior build's index
- Eliminates Vite `rollupOptions.external` workaround

### Consequences
- Search.svelte deleted, Search.astro created with identical UX
- `client:load` removed from Header.astro search usages
- Build script simplified to `astro build`
- CSP updated with `wasm-unsafe-eval` for Pagefind WASM

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

*Last updated: 2026-02-05*
