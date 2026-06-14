# gvns.ca Roadmap

## Completed: MVP (Phases 1–5)

The original MVP shipped in January 2026. Phases 1–5 covered infrastructure setup (Linode), Astro scaffolding, design implementation, content creation, and initial deployment. All tasks complete.

---

## Phase 6: Design System Migration
**Status**: ✅ Complete
**Depends on**: —
**Closes**: #1, #2

Bring the codebase in line with the site spec and updated documentation. The docs now describe the target state — this phase makes the code match.

### 6.1 Font Swap — IBM Plex Sans → Inter ✅
- [x] Install `@fontsource/inter` (weights: 400, 500, 600, 700)
- [x] Remove `@fontsource/ibm-plex-sans` from dependencies
- [x] Update `src/styles/global.css` font imports
- [x] Update `--font-sans` CSS variable to reference Inter
- [x] Verify font rendering across pages

### 6.2 Colour Palette — Forest Green/Gold → P1-P5 + Zinc Neutrals ✅
- [x] Replace CSS custom property colour values in `global.css`
- [x] Update `src/styles/shiki-gvns.json` syntax theme for new palette
- [x] Update any component-scoped styles referencing old colours
- [x] Remove legacy `--color-*` aliases

### 6.3 Light Theme — [data-theme] CSS Vars → Tailwind `dark:` Class ✅
- [x] Configure `@custom-variant dark` for Tailwind 4
- [x] Update `BaseLayout.astro` theme init script: toggle `dark` class on `<html>`
- [x] Update `ThemeToggle.svelte` to add/remove `dark` class
- [x] Migrate `global.css` light theme from `[data-theme="light"]` to `:root:not(.dark)`

### 6.4 Route Renames — Verb-Based URLs ✅
- [x] Rename `src/pages/writing/` → `src/pages/write/`
- [x] Rename `src/pages/reading/` → `src/pages/read/`
- [x] Update all internal links across components and pages
- [x] Update `@astrojs/rss` feed configuration
- [x] Add 301 redirects for old URLs (shipped 2026-06 — index-level rules in `public/_redirects`, see ADR-010)

### 6.5 Navigation Restructure ✅
- [x] Update `Header.astro` nav links: About, Work, Write, Now
- [x] MobileNav receives navItems from Header (automatically updated)
- [x] Update `Footer.astro` links: GitHub, Threads, LinkedIn, Email, RSS

### 6.6 Housekeeping ✅
- [x] Update `CLAUDE.md` to reflect new font, palette, URLs, nav, and deploy target
- [x] Update `shiki-gvns.json` to use P1-P5 colours
- [x] Verify `npm run build` succeeds with all changes
- [ ] Update `package.json` name field (currently "temp") — minor, deferred

---

## Phase 7: Infrastructure Migration
**Status**: ✅ Complete
**Closes**: #90

Shipped: migrated off the Linode Nanode to Cloudflare — first Pages (ADR-007, 2026-02), then Cloudflare Workers via Workers Builds with native git integration (#249, 2026-04). Umami analytics retired with the VPS; no replacement. See `docs/INFRASTRUCTURE.md`.

---

## Phase 8: Writing Enhancements
**Status**: ✅ Complete
**Closes**: #37, #38, #41, #42, #43, #44

Shipped: RSS autodiscovery + `robots.txt`, breadcrumb navigation, reading progress indicator, table of contents, and site search (astro-pagefind, ADR-012).

---

## Phase 9: Activity Pages
**Status**: ✅ Complete

Shipped: `/now` bento dashboard (ADR-017) plus `/read`, `/listen`, `/code`, `/watch`, and `/move` activity pages, fed by scheduled GitHub Actions (`fetch-daily.yml` et al.) committing JSON to `src/data/`.

---

## Phase 10: Polish & Content
**Status**: 🔴 Not Started
**Depends on**: Phases 6–9

Final pass to bring everything together.

### 10.1 Home Page Redesign
- [ ] Hero introduction section
- [ ] Featured work grid (3–4 projects)
- [ ] Recent writing (latest 2–3 posts)
- [ ] CTA links to Write, Work, Now sections

### 10.2 Content Expansion
- [ ] Write 3–5 additional blog posts
- [ ] Add portfolio projects to work collection
- [ ] Update About page with current bio, social links, contact info

### 10.3 Performance & Accessibility
- [ ] Lighthouse audit (target: >95 all categories)
- [ ] First Contentful Paint < 1.5s
- [ ] Images: WebP format, lazy loaded below fold
- [ ] Fonts: preload critical weights
- [ ] WCAG 2.1 AA compliance check
- [ ] Keyboard navigation testing
- [ ] Screen reader testing

### 10.4 SEO & Social
- [ ] Open Graph images for all pages (not just posts)
- [ ] JSON-LD structured data on activity pages
- [ ] Verify canonical URLs with new route structure
- [ ] Test social card previews

---

## Backlog (Future)

### Nice to Have
- [ ] Copy code button for code blocks
- [ ] Year in review page (annual stats across all activities)
- [ ] RSS feeds for activity streams (beyond blog)

### Maybe Later
- [ ] Series navigation for multi-part posts (`series`/`seriesOrder` fields)
- [x] ~~Comments (giscus via GitHub Discussions)~~ → Shipped as Threads comments via Graph API (ADR-013)
- [ ] Newsletter signup
- [ ] Webmentions integration
- [ ] Now page history/archive

### Not Planned
- CMS integration
- i18n
- Complex animations
- User accounts

---

*Last updated: 2026-06-11*
