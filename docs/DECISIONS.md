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
Use **verb-based URLs**: `/read`, `/listen`, `/watch`, `/code`. Exception: the writing section uses `/posts` for clarity.

### Rationale
- Consistent voice across the entire site
- Shorter, punchier URLs
- Activity pages use verbs as brand identity — "Read" not "Reading" or "Books"
- `/posts` exception chosen over `/write` because "Posts" reads more naturally as a section name

### Consequences
- Existing `/writing` routes redirect to `/posts`; `/reading` redirects to `/read`
- Internal links updated across all components and content
- RSS feed items link to `/posts/...`
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

## ADR-013: Threads Comments via Graph API

**Date**: 2026-04-25
**Status**: Accepted

### Context
The site needed a comments system for writing posts. Options considered included giscus (GitHub Discussions), Disqus, and native social media APIs. The site already syndicates posts to Threads, Bluesky, and Mastodon via POSSE.

### Decision
Fetch Threads replies at build time via the Graph API using the denim library. Comments render as static HTML populated from JSON files in `src/data/comments/`, refreshed hourly by a GitHub Action. No client-side JavaScript. Reply CTA uses Threads' intent URL deep-link.

### Rationale
- Follows the existing build-time data-fetching pattern (reading, listening, GitHub activity)
- No new architectural primitives — same workflow shape, same commit-via-pr pattern
- No CSP relaxation needed (no browser-side API calls)
- No token exposure in the browser
- Threads-only for v1; extensible to Bluesky/Mastodon replies later
- Open firehose moderation acceptable for personal site traffic levels

### Consequences
- New secrets required: `THREADS_USER_ID`, `THREADS_ACCESS_TOKEN`, `THREADS_APP_ID`, `THREADS_APP_SECRET`
- Token refresh workflow runs twice monthly to prevent 60-day expiry
- Comments are up to 1 hour stale (acceptable for a personal blog)
- Spam replies on Threads appear until muted on the platform

---

## ADR-014: Sveltia CMS Image Handling — Survey & Status Quo

**Date**: 2026-04-27
**Status**: Decision #1 superseded by ADR-015 (2026-04-28); decisions #2 and #3 still in force

### Context
After landing the `/public/uploads/` workaround for #264 (broken `heroImage` resolution under our nested `path: "{{year}}/{{month}}/{{slug}}"` template), we needed to know whether the Astro+Sveltia community had already solved the same problems before committing to the inline-image spike (#278) or the validation work (#279). Survey was time-boxed to 90 minutes (issue #282).

Eight repos surveyed plus the Sveltia upstream issue tracker. Key data:

| Repo | path template | media_folder | slugify_filename | transformations | image() pipeline |
|---|---|---|---|---|---|
| ggfevans/gvns.ca (us) | `{{year}}/{{month}}/{{slug}}` | `public/uploads` (abs) | not set | WebP/q85/2048 | bypassed |
| thiagopaixao/astro_sveltia | flat | `public/uploads` (abs) | **true** | not set | bypassed |
| Snugug/sveltia-cms-astro-demo | flat | `public/media` (abs) | not set | not set | bypassed |
| majesticostudio/astro-sveltia-cms | flat | `@assets/images/post` (alias) | not set | not set | attempted (underbaked) |
| MattFM/giveback-guide | flat | `public/images/blog` (abs) + Cloudinary | **true** | not set (Cloudinary) | bypassed |
| shiomiyan/blog | `{{slug}}/index` (bundle) | `public/media` (abs) | not set | not set | bypassed |
| makmonty/makmonty.com | flat | `public/images/cms` (abs) | not set; uses top-level `slug.encoding: ascii` | not set | bypassed |
| yacosta738/astro-cms | `{{year}}/{{month}}/{{day}}/{{slug}}` | `src/assets/images` | not set; uses top-level `slug.encoding: ascii` | not set | **used** (Sharp on `src/assets/`) |

**Upstream finding (most consequential):** the #264 symptom is a known regression — Sveltia issue [#672](https://github.com/sveltia/sveltia-cms/issues/672), introduced in v0.140.4, fixed in **v0.146.7**. We're pinned at **v0.157.1** (`public/admin/sveltia-cms-0.157.1.js`), so the bug should already be resolved in our setup. Sveltia's recommended pattern for nested-path collections is entry-relative bundles: `media_folder: ""` + `public_folder: ""`, which co-locates uploads with the entry and auto-deletes them on entry removal. `slugify_filename` defaults to `false` in Sveltia (diverges from Decap).

### Decision
1. **Keep the current `/public/uploads/` absolute pattern** as the baseline. The spike (#278) should still validate the entry-relative bundle approach now that v0.157.1 has the #672 fix, but we don't pre-emptively switch — the absolute pattern is stable, predictable, and officially supported.
2. **Add `media_libraries.default.config.slugify_filename: true`** in a small standalone PR before #278. This eliminates URL-encoded filenames (e.g. `No%20Ragrets...png`) at upload time and is independent of any inline-image architecture choice.
3. **Defer the `@assets/`-alias / Astro `image()` pipeline approach** (yacosta738's pattern) to #278's evaluation. It's the only surveyed pattern that keeps `image()` benefits with a nested path, but adoption requires schema, Vite alias, and CMS-preview plumbing changes that are out of scope for a one-line config tweak.

### Rationale
- We're not the first to hit nested-path media bugs; we're the first to keep the nested path AND the absolute-uploads workaround. Two of three real-world blogs sidestep nested paths entirely (date-in-filename or `{{slug}}/index` bundles); only yacosta738 keeps deep nesting and pairs it with `src/assets/`-rooted media.
- Our `media_libraries.transformations` (WebP/q85/2048) is ahead of every surveyed config — no prior art for gotchas, but no cautionary tales either.
- `slugify_filename: true` is the canonical fix per upstream (#422) and is already in production use in two surveyed repos (thiagopaixao, MattFM). Low blast radius: only affects new uploads with non-ASCII / spaced names.
- The upstream maintainer (kyoshino) is responsive on regressions (#666 was fixed within a day), so re-testing entry-relative on v0.157.1 in #278 is cheap and de-risked.

### Consequences
- A small follow-up PR adds `slugify_filename: true` under `media_libraries.default.config` in `public/admin/config.yml`. New uploads with spaces or accents will arrive on disk slugified; existing files unchanged.
- #278 spike scope expands to include a re-test of entry-relative (`media_folder: ""`) on v0.157.1. If it works cleanly, #278 may produce a follow-up ADR that supersedes this one.
- #279 (validation) is unaffected — Zod schema work is orthogonal to the media-folder decision.
- #277 (tracking) is partially mitigated: `slugify_filename: true` removes one class of bug, narrowing what tracking needs to surface.
- We deliberately do NOT adopt the alias-based `@assets/...` pattern. yacosta738/astro-cms is the only surveyed repo using it under a nested path, and the surveyed config did not include the matching Vite/tsconfig alias plumbing — suggests the pattern is fragile in practice.

### Survey artefacts
Raw findings and per-repo notes captured in this ADR; no separate research file. Sveltia upstream issues referenced: [#672](https://github.com/sveltia/sveltia-cms/issues/672), [#666](https://github.com/sveltia/sveltia-cms/issues/666), [#422](https://github.com/sveltia/sveltia-cms/issues/422), [#728](https://github.com/sveltia/sveltia-cms/issues/728), [#735](https://github.com/sveltia/sveltia-cms/issues/735).

---

## ADR-015: Bundle Layout for Posts + Entry-Relative Media

**Date**: 2026-04-28
**Status**: Accepted
**Supersedes**: ADR-014 decision #1 (the `/public/uploads/` absolute baseline)

### Context
Issue [#278](https://github.com/ggfevans/gvns.ca/issues/278) — spike on the Sveltia inline-image workflow. Browser testing on Sveltia v0.157.1 with the existing `path: "{{year}}/{{month}}/{{slug}}"` template revealed an asymmetry between the two upload entry points:

| Path | Saved frontmatter / markdown ref | File location |
|---|---|---|
| `heroImage` (image widget) | `/uploads/fine.webp` (absolute) | `public/uploads/fine.webp` ✅ |
| Body inline (button / drag / paste) | `![](rusty.webp)` (bare) | `src/content/posts/2026/04/<slug>/rusty.webp` |

Cause: Sveltia's [`getAssetLibraryFolderMap`](https://github.com/sveltia/sveltia-cms/blob/main/src/lib/services/contents/fields/file/helper.js) iterates `field → entry → file → collection → global` and stops at the first enabled slot. With `{{slug}}` in our path template, `entry.enabled = true` (`hasTemplateTags`), so inline images go entry-relative regardless of the global `media_folder`. The image widget for `heroImage` evidently routes through a different selection path in `file-editor.svelte` and lands at the global folder. ADR-014 sidestepped this by keeping the global pattern only (heroImage worked, body was undefined territory).

This produced two unsolved problems for #278:
1. **Bare refs didn't resolve.** Post at `<dir>/<slug>.md`; asset at `<dir>/<slug>/file.webp`; ref `![](file.webp)` resolves to `<dir>/file.webp`. Image broken.
2. **Two media-flow shapes** doubled the validator surface and forced a split mental model.

Source-code findings that informed the fix:
- WebP transform DOES rewrite the file extension on success ([`transformFile`](https://github.com/sveltia/sveltia-cms/blob/main/src/lib/services/integrations/media-libraries/default/index.js)) — `risk.jpg` → `risk.webp`. Confirmed in browser.
- Per-widget `media_folder` overrides on the markdown editor's image component ([sveltia/sveltia-cms#497](https://github.com/sveltia/sveltia-cms/issues/497), closed 2025-11-02) only apply to user-configured widgets, not to the hardcoded `IMAGE_COMPONENT.src` field inside the markdown editor. Not user-configurable.
- All three insertion paths share one code path (`insertImages` in `rich-text-editor.svelte`), so identical behaviour for button / drag-drop / paste. Confirmed in browser.

### Decision
Switch the `posts` collection to **bundle layout**: `path: "{{year}}/{{month}}/{{slug}}/index"`. Each post is `<...>/<slug>/index.md` and any uploaded assets land beside it as siblings. Drop the global `media_folder` / `public_folder` from `public/admin/config.yml`. `heroImage` becomes a bare-filename frontmatter field, validated through Astro's `image()` schema helper, which auto-resolves the file relative to the entry's directory and runs it through the build-time image pipeline. Inline body images Just Work because the bare `![](file.webp)` ref Sveltia writes resolves correctly when post and asset share a directory.

Scope: `posts` collection only. The `work` collection retains `uploadsPathSchema` and the `/uploads/...` absolute pattern; it is not currently CMS-managed in the same flow.

### Rationale
- **One shape everywhere.** Both `heroImage` and body inline images use the same bare-relative ref pattern. The validator has one rule. The author has one mental model.
- **Goes with the grain of Sveltia.** v0.157.1 has the #672 fix; entry-relative bundles are now reliable. ADR-014's blocker (the v0.140.4–v0.146.6 regression) is gone.
- **Astro's `image()` pipeline is now in scope for hero images** for free — width/height come from the schema, no more dim-cache probe (`src/utils/image-dims.ts` retired).
- **Clean source layout.** Browse `src/content/posts/2026/04/<slug>/` and see the post and all of its assets together. Delete the directory and the post is gone with no orphans in `public/uploads/`.
- **No new validator complexity.** `scripts/validate-image-refs.mjs:79-84` already resolves bare refs against the post's directory; no change needed.

### Consequences
- The 4 throwaway test posts (`testy.md`, `heroimage.md`, `jvcc.md`, `inline-image-probe.md`) and `public/uploads/risk.jpg` are deleted as part of this change. No real content was migrated.
- `public/uploads/` is retained (with `.gitkeep`) for any ad-hoc absolute uploads outside the CMS flow.
- `src/utils/image-dims.ts`, `src/data/uploads-dims.json`, and the validator's dim-cache writer are retired — `image()` schema replaces them.
- `getPostSlug` in `src/utils/content.ts` now strips a trailing `index` segment so post URLs remain `/posts/<slug>/`, not `/posts/<slug>/index/`.
- `image-size` remains as a `package.json` dep but is no longer imported. Prune in a follow-up.
- `editor.preview: true` is left as a separate follow-up — independent UX decision.
- The `work` collection migration is deferred. When `work` is brought into the CMS, a follow-up ADR can extend the bundle pattern.
- ADR-014 decisions #2 (`slugify_filename: true`) and #3 (defer `@assets/`-alias) remain in force. The body inline images don't need the alias because Astro's default markdown image transform optimises relative refs that sit beside the entry.

### Verification
The end-to-end browser checklist is captured in the implementation PR. Critical confirmations:
- Inline body image upload → file at `<bundle>/file.webp`, ref `![](file.webp)`, resolves and renders.
- heroImage upload → file at `<bundle>/file.webp`, frontmatter `heroImage: file.webp`, schema validates, `<Image>` renders fingerprinted variant.
- Sveltia round-trips the saved post correctly when re-opened.

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

*Last updated: 2026-04-28*
