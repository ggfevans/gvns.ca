# gvns.ca Roadmap

## MVP Target: January 15, 2026

---

## Phase 1: Infrastructure Setup
**Status**: ✅ Complete

- [x] Provision Linode Nanode (Ubuntu 24.04, Toronto)
- [x] Initial server hardening
  - [x] Create non-root user with sudo
  - [x] Configure SSH (key-only auth)
  - [x] Set up UFW firewall
- [x] Install Docker and Docker Compose
- [x] Install Caddy
- [x] Deploy Umami
  - [x] Create docker-compose.yml
  - [x] Generate secrets
  - [x] Start containers
- [x] Configure Caddyfile
- [x] Configure Cloudflare DNS
  - [x] Point gvns.ca to Linode
  - [x] Point analytics.gvns.ca to Linode
  - [x] Enable proxy (orange cloud)
- [x] Verify HTTPS working for both domains
- [x] Create website in Umami dashboard

---

## Phase 2: Astro Site Scaffold
**Status**: ✅ Complete

- [x] Initialize fresh Astro project
  - [x] `npm create astro@latest`
  - [x] Select: Empty, TypeScript (strict), Install deps
- [x] Configure project
  - [x] Set up path aliases in tsconfig.json
  - [x] Add Tailwind CSS integration
  - [x] Add Svelte integration (for islands)
  - [x] Configure Shiki with GVNS theme
- [x] Create base layout structure
  - [x] `BaseHead.astro` (meta, fonts, Umami script)
  - [x] `BaseLayout.astro` (HTML wrapper, skip link)
  - [x] `Header.astro` (navigation)
  - [x] `Footer.astro`
- [x] Set up content collections
  - [x] Create `src/content/config.ts` with writing/work schemas
  - [x] Create sample writing post for testing
- [x] Create page templates
  - [x] `PostLayout.astro` (writing post wrapper)
  - [x] `PageLayout.astro` (static pages)
- [x] Create core pages
  - [x] Home (`/`)
  - [x] Writing listing (`/writing/`)
  - [x] Writing post (`/writing/[slug]/`)
  - [x] About (`/about/`)
- [x] Add utility functions
  - [x] Date formatting
  - [x] Reading time calculation

---

## Phase 3: Design Implementation
**Status**: ✅ Complete

- [x] Set up design tokens
  - [x] Create `global.css` with CSS variables
  - [x] Configure Tailwind with GVNS colours
- [x] Implement dark theme (default)
- [x] Add light theme toggle (Svelte island)
- [x] Style components
  - [x] Typography (prose styling)
  - [x] Links
  - [x] Buttons
  - [x] Cards
  - [x] Tags
  - [x] Code blocks
- [x] Responsive testing
  - [x] Mobile (375px)
  - [x] Tablet (768px)
  - [x] Desktop (1280px)

---

## Phase 4: Content & Features
**Status**: ✅ Complete

- [x] Write homepage content
- [x] Create About/Resume page
  - [x] Bio section
  - [x] Skills/experience
  - [x] Contact info
- [x] Write 2-3 launch writing posts
- [x] Implement tag system
  - [x] Tag listing page (`/writing/tags/`)
  - [x] Tag filter page (`/writing/tags/[tag]/`)
- [x] Add RSS feed (`/rss.xml`)
- [x] Add sitemap (`/sitemap.xml`)

---

## Phase 5: Polish & Deploy
**Status**: ✅ Complete

- [x] SEO checklist
  - [x] Meta descriptions on all pages
  - [x] Open Graph tags
  - [x] robots.txt
  - [x] Canonical URLs
- [x] Accessibility audit
  - [x] Keyboard navigation
  - [x] Screen reader testing
  - [x] Colour contrast check
- [x] Performance testing
  - [x] Lighthouse audit (target: >95)
  - [x] Check bundle size
- [x] Set up GitHub Actions deploy
  - [x] Create workflow file
  - [x] Add secrets to repo
  - [x] Test deployment
- [x] Final testing on production
- [x] 🚀 **Launch!**

---

## Post-MVP (Future)

### Nice to Have
- [ ] Projects page
- [ ] Reading progress indicator
- [ ] Copy code button
- [ ] Table of contents for long posts

### Maybe Later
- [ ] Series navigation for multi-part posts (`series`/`seriesOrder` fields)
- [ ] Search functionality
- [ ] Comments (giscus?)
- [ ] Newsletter signup
- [ ] Analytics dashboard embed

### Not Planned
- CMS integration
- i18n
- Complex animations
- User accounts

---

*Last updated: 2026-02-02*
