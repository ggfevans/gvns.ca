# gvns.ca Roadmap

## MVP Target: January 15, 2026

---

## Phase 1: Infrastructure Setup
**Status**: 🔴 Not Started

- [ ] Provision Linode Nanode (Ubuntu 24.04, Toronto)
- [ ] Initial server hardening
  - [ ] Create non-root user with sudo
  - [ ] Configure SSH (key-only auth)
  - [ ] Set up UFW firewall
- [ ] Install Docker and Docker Compose
- [ ] Install Caddy
- [ ] Deploy Umami
  - [ ] Create docker-compose.yml
  - [ ] Generate secrets
  - [ ] Start containers
- [ ] Configure Caddyfile
- [ ] Configure Cloudflare DNS
  - [ ] Point gvns.ca to Linode
  - [ ] Point analytics.gvns.ca to Linode
  - [ ] Enable proxy (orange cloud)
- [ ] Verify HTTPS working for both domains
- [ ] Create website in Umami dashboard

---

## Phase 2: Astro Site Scaffold
**Status**: 🔴 Not Started

- [ ] Initialize fresh Astro project
  - [ ] `npm create astro@latest`
  - [ ] Select: Empty, TypeScript (strict), Install deps
- [ ] Configure project
  - [ ] Set up path aliases in tsconfig.json
  - [ ] Add Tailwind CSS integration
  - [ ] Add Svelte integration (for islands)
  - [ ] Configure Shiki with Dracula theme
- [ ] Create base layout structure
  - [ ] `BaseHead.astro` (meta, fonts, Umami script)
  - [ ] `BaseLayout.astro` (HTML wrapper, skip link)
  - [ ] `Header.astro` (navigation)
  - [ ] `Footer.astro`
- [ ] Set up content collections
  - [ ] Create `src/content/config.ts` with blog schema
  - [ ] Create sample blog post for testing
- [ ] Create page templates
  - [ ] `PostLayout.astro` (blog post wrapper)
  - [ ] `PageLayout.astro` (static pages)
- [ ] Create core pages
  - [ ] Home (`/`)
  - [ ] Blog listing (`/blog/`)
  - [ ] Blog post (`/blog/[slug]/`)
  - [ ] About (`/about/`)
- [ ] Add utility functions
  - [ ] Date formatting
  - [ ] Reading time calculation

---

## Phase 3: Design Implementation
**Status**: 🔴 Not Started

- [ ] Set up design tokens
  - [ ] Create `global.css` with CSS variables
  - [ ] Configure Tailwind with Dracula colours
- [ ] Implement dark theme (default)
- [ ] Add light theme toggle (Svelte island)
- [ ] Style components
  - [ ] Typography (prose styling)
  - [ ] Links
  - [ ] Buttons
  - [ ] Cards
  - [ ] Tags
  - [ ] Code blocks
- [ ] Responsive testing
  - [ ] Mobile (375px)
  - [ ] Tablet (768px)
  - [ ] Desktop (1280px)

---

## Phase 4: Content & Features
**Status**: 🔴 Not Started

- [ ] Write homepage content
- [ ] Create About/Resume page
  - [ ] Bio section
  - [ ] Skills/experience
  - [ ] Contact info
- [ ] Write 2-3 launch blog posts
- [ ] Implement tag system
  - [ ] Tag listing page (`/blog/tags/`)
  - [ ] Tag filter page (`/blog/tags/[tag]/`)
- [ ] Add RSS feed (`/rss.xml`)
- [ ] Add sitemap (`/sitemap.xml`)

---

## Phase 5: Polish & Deploy
**Status**: 🔴 Not Started

- [ ] SEO checklist
  - [ ] Meta descriptions on all pages
  - [ ] Open Graph tags
  - [ ] robots.txt
  - [ ] Canonical URLs
- [ ] Accessibility audit
  - [ ] Keyboard navigation
  - [ ] Screen reader testing
  - [ ] Colour contrast check
- [ ] Performance testing
  - [ ] Lighthouse audit (target: >95)
  - [ ] Check bundle size
- [ ] Set up GitHub Actions deploy
  - [ ] Create workflow file
  - [ ] Add secrets to repo
  - [ ] Test deployment
- [ ] Final testing on production
- [ ] 🚀 **Launch!**

---

## Post-MVP (Future)

### Nice to Have
- [ ] Projects page
- [ ] Series navigation for multi-part posts
- [ ] Reading progress indicator
- [ ] Copy code button
- [ ] Table of contents for long posts

### Maybe Later
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

*Last updated: 2024-12-09*
