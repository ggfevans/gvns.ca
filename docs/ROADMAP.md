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
- [ ] Add 301 redirects for old URLs (deferred to Phase 7 — Cloudflare `_redirects`)

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
**Status**: 🔴 Not Started
**Depends on**: —
**Closes**: #90

Migrate from Linode self-hosted deployment to Cloudflare Pages.

### 7.1 Cloudflare Pages Setup
- [ ] Create Cloudflare Pages project linked to GitHub repo
- [ ] Configure build settings (Node 20, `npm run build`, output `dist/`)
- [ ] Configure custom domain `gvns.ca`
- [ ] Verify automatic deploy on push to main
- [ ] Verify preview deploys on pull requests

### 7.2 GitHub Actions Update
- [ ] Replace `deploy.yml` workflow (remove rsync, Linode, Cloudflare cache purge)
- [ ] Keep `ci.yml` for PR build verification (or let Cloudflare Pages handle it)
- [ ] Remove unused secrets (SSH keys, Linode references) from repo settings

### 7.3 Analytics Migration
- [ ] Evaluate Counterscale as Umami replacement (Cloudflare Workers-based)
- [ ] Set up analytics solution on Cloudflare
- [ ] Update `BaseHead.astro` analytics script
- [ ] Verify analytics data collection

### 7.4 DNS & Cleanup
- [ ] Update Cloudflare DNS records if needed
- [ ] Verify HTTPS enforced on custom domain
- [ ] Decommission Linode Nanode (after confirming everything works)
- [ ] Update `docs/INFRASTRUCTURE.md` to reflect new setup

---

## Phase 8: Writing Enhancements
**Status**: 🔴 Not Started
**Depends on**: Phase 6 (route renames)
**Closes**: #37, #38, #41, #42, #43, #44

Features that improve the blog/writing experience. Existing implementation plan: `docs/plans/2026-02-02-issues-37-52-features.md` (Tasks 1–6). Plan needs update for new palette and route names before execution.

### 8.1 SEO Quick Wins
- [ ] Add RSS feed autodiscovery `<link>` in `BaseHead.astro` (#37)
- [ ] Create `public/robots.txt` with sitemap reference (#38)

### 8.2 Breadcrumb Navigation (#43)
- [ ] Create `Breadcrumb.astro` component with semantic `<nav>` markup
- [ ] Integrate into `PostLayout.astro` (Home → Write → [title])
- [ ] Add breadcrumb JSON-LD schema
- [ ] Style with P1-P5 design tokens

### 8.3 Reading Progress Indicator (#44)
- [ ] Create `ReadingProgress.svelte` island
- [ ] Track scroll position relative to article content
- [ ] Fixed bar at viewport top with violet accent
- [ ] Respect `prefers-reduced-motion`

### 8.4 Table of Contents (#41)
- [ ] Install `rehype-slug` for heading IDs
- [ ] Create `TableOfContents.svelte` island
- [ ] Extract h2/h3 headings client-side
- [ ] Highlight active section via IntersectionObserver
- [ ] Collapsible on mobile, visible on desktop
- [ ] Only render for posts with 3+ headings

### 8.5 Search with Pagefind (#42)
- [ ] Install `@pagefind/default-ui`
- [ ] Update build script: `astro build && npx pagefind --site dist`
- [ ] Create `Search.svelte` dialog component
- [ ] Cmd/Ctrl+K keyboard shortcut
- [ ] Add search trigger to `Header.astro`
- [ ] Style Pagefind UI with brand tokens

---

## Phase 9: Activity Pages
**Status**: 🔴 Not Started
**Depends on**: Phase 6 (design system), Phase 7 (Cloudflare for env vars)

Build the Now dashboard and dedicated activity pages from the site spec. Each activity section uses its assigned accent colour.

### 9.1 Now Dashboard (/now)
- [ ] Create `src/pages/now/index.astro`
- [ ] 12-column grid layout with mixed card sizes
- [ ] Widget components (all use card pattern with coloured left accent):
  - [ ] Code widget (violet) — latest GitHub activity
  - [ ] Read widget (rose) — currently reading book
  - [ ] Listen widget (emerald) — recent track
  - [ ] Watch widget (amber) — recent watch
  - [ ] Write widget (amber) — latest blog post
  - [ ] Status widget (sky) — availability indicator
- [ ] Uppercase verb labels: "CODE", "READ", "LISTEN", "WATCH", "WRITE"
- [ ] Footer links: "View Full Activity →" to dedicated pages

### 9.2 Read Page (/read) — Hardcover Integration (#52)
- [ ] Rewrite `src/pages/read/index.astro` (was `/reading`)
- [ ] Create `BookCard.astro` component (cover, title, author, rating, progress)
- [ ] Create `BookList.astro` component (section wrapper)
- [ ] Fetch from Hardcover GraphQL API at build time
- [ ] Sections: Currently Reading, Finished, Want to Read
- [ ] Graceful fallback when API unavailable
- [ ] Rose accent throughout
- [ ] Breadcrumb: Now → Read

### 9.3 GitHub Action — Data Fetching
- [ ] Create workflow for Hardcover data → `src/data/reading.json`
- [ ] Create workflow for ListenBrainz data → `src/data/listening.json`
- [ ] Create workflow for GitHub activity → `src/data/github.json`
- [ ] Schedule: daily at midnight UTC
- [ ] Trigger site rebuild on data update
- [ ] Store API tokens as GitHub/Cloudflare secrets

### 9.4 Listen Page (/listen) — ListenBrainz Integration
- [ ] Create `src/pages/listen/index.astro`
- [ ] Fetch from ListenBrainz API (or read `src/data/listening.json`)
- [ ] Display recent tracks, top artists, stats
- [ ] Album art thumbnails (64×64)
- [ ] Emerald accent throughout
- [ ] Breadcrumb: Now → Listen

### 9.5 Code Page (/code) — GitHub Activity
- [ ] Create `src/pages/code/index.astro`
- [ ] Read `src/data/github.json` (populated by GitHub Action)
- [ ] Activity timeline with commit messages
- [ ] Contribution stats and repository highlights
- [ ] Violet accent throughout
- [ ] Breadcrumb: Now → Code

### 9.6 Watch Page (/watch) — TBD Source
- [ ] Determine data source (Letterboxd, Trakt, or similar)
- [ ] Create `src/pages/watch/index.astro`
- [ ] Poster/thumbnail display
- [ ] Amber accent throughout
- [ ] Breadcrumb: Now → Watch

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
- [ ] Comments (giscus via GitHub Discussions)
- [ ] Newsletter signup
- [ ] Webmentions integration
- [ ] Now page history/archive

### Not Planned
- CMS integration
- i18n
- Complex animations
- User accounts

---

*Last updated: 2026-02-03*
