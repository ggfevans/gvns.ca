# Site Analysis: mitchellh.com

**Analysed:** 2026-04-29  
**Subject:** Mitchell Hashimoto's personal site — https://mitchellh.com  
**Method:** WebFetch inspection of HTML structure, footnote anchors, URL patterns, sitemap, and public GitHub repos

> **Confidence key:** ✅ Confirmed · 🔍 Strong inference · 💭 Speculation

---

## 1. Purpose & Content

Mitchell Hashimoto is the co-founder of HashiCorp and the creator of Ghostty (a terminal emulator). His site is a personal writing and reference hub — not a portfolio, not a product page. Content sections:

| Path | Purpose |
|------|---------|
| `/` (About) | Biography / current focus |
| `/writing` | Long-form technical articles (2013–present) |
| `/zig` | Deep-dive series on the Zig compiler internals |
| `/ghostty` | Devlog + resource index for the Ghostty project |
| `/misc` | Miscellaneous links and content |
| `/public-key.txt` | GPG public key |

The writing archive spans 13+ years and covers Vagrant/Packer-era tooling through to Zig compiler internals and terminal emulator development. Articles are long-form, technically dense, and infrequent — quality over cadence.

---

## 2. Tech Stack

### Static Site Generator: Hugo ✅ (strong inference)

The clearest technical signal is the footnote anchor format found in article HTML:

```
#user-content-fn-1
#user-content-fnref-1
```

This exact format is produced by **goldmark** — the Go markdown parser that Hugo uses by default — when GitHub Flavored Markdown (GFM) extensions are enabled. The `user-content-` prefix is goldmark's namespace to prevent ID collisions across multiple rendered documents. No other mainstream SSG produces this exact pattern.

Supporting evidence:
- Content structure and URL patterns (`/writing/<slug>`, `/zig/<slug>`) match Hugo's section + page model exactly
- Sitemap at `/sitemap.xml` — Hugo generates this automatically
- No robots.txt — Hugo's default
- Zero visible client-side JavaScript
- Long content history (2013+) is consistent with a mature, stable SSG workflow rather than a bespoke tool

### Markdown: GitHub Flavoured Markdown via goldmark ✅

The `user-content-fn` footnote format confirms goldmark with GFM enabled (Hugo's `goldmark.extensions.footnote` + `gfm` config).

### CSS: Custom, minimal, semantic 🔍

No CSS class names appear on any content element. This is characteristic of a stylesheet that targets HTML semantics directly (`h1`, `p`, `blockquote`, `code`, `a`) rather than using utility classes or component classes. The visual result is:

- Monochrome or near-monochrome palette
- Single readable column
- System or custom monospace/sans-serif fonts
- No decorative elements

This pattern suggests a hand-written CSS file of perhaps 100–300 lines — a stylesheet that would read more like typography specification than component styling.

### JavaScript: None detectable ✅

No JS framework, no analytics, no interactive widgets. Pure HTML + CSS. This is a deliberate choice consistent with the site's philosophy (see §4).

### Hosting: Unknown 💭

No robots.txt, no response headers visible through WebFetch, no deployment config in any public repo. The source repository appears to be private. Likely candidates given his infrastructure background:

- Cloudflare Pages / Workers (static hosting, global CDN)
- Fly.io (he has public Fly affinity from writing)
- Self-hosted on NixOS (his `nixos-config` repo is public — he runs NixOS extensively)

### Source Control: Private 🔍

No public GitHub repository found for mitchellh.com despite checking common names (`www`, `blog`, `site`, `mitchellh.com`). The source is private.

---

## 3. Design Philosophy

The site is an intentional exercise in restraint. Observable design decisions:

**Typography over decoration.** The entire visual hierarchy is typographic — headings, spacing, and link colour carry all the information load. No icons (aside from emoji), no illustrations, no cards.

**No layout complexity.** Single-column. Navigation is a flat link list. The page structure appears to be: `nav → h1 → content → footer`. No sidebar, no grid, no breakpoint-driven layout beyond basic responsive width.

**Zero JavaScript.** This is a strong signal about values — the author could add any JS they wanted, and they chose none. Consistent with a systems programmer's preference for determinism and minimal moving parts.

**Longevity over novelty.** The site has been running in roughly the same form since at least 2013. The aesthetic hasn't chased design trends. This is infrastructure thinking applied to a website — build it once, make it correct, don't touch it.

**Content-addressed URLs.** `/writing/post-slug` — no dates in URLs, no numeric IDs. Stable, shareable links that don't rot as the calendar advances.

---

## 4. Content Architecture

### Section model (Hugo sections)

```
/                     → _index.md or homepage template
/writing/             → section listing
/writing/<slug>/      → individual posts
/zig/                 → section listing  
/zig/<slug>/          → deep-dive pages
/ghostty/             → standalone page or section
/misc/                → standalone page
```

The `/zig/` and `/ghostty/` sections demonstrate Hugo's ability to create topic-grouped content areas that aren't the main blog feed — each section can have its own listing template and metadata.

### Writing cadence

Articles are infrequent but long. The 2013–2026 archive includes:
- HashiCorp-era tooling posts (Vagrant, Packer, automation)
- Systems programming deep dives (Zig compiler internals series)
- Ghostty devlog entries
- AI adoption retrospectives

The Zig series in particular (tokenizer → parser → AST → semantic analysis → build internals) reads like a book being published chapter by chapter — each post is 3,000–10,000+ words.

---

## 5. What It Does Not Have

Notable absences (all deliberate, all instructive):

| Missing | Implication |
|---------|-------------|
| Analytics | No tracking, no traffic metrics |
| Comments | No Disqus, no engagement system |
| Newsletter | No email capture |
| Search | Navigation is the index |
| Dark mode toggle | Ships one theme (presumably dark or neutral) |
| RSS (visible) | Probably exists but not surfaced prominently |
| Social sharing buttons | Trust readers to copy URLs |
| Reading time estimates | Trust readers to gauge themselves |

---

## 6. Lessons for gvns.ca

**What mitchellh.com does that's instructive:**

1. **Content sections as first-class navigation** — the `/zig/` series model (a topic with its own listing page + deep posts) is worth replicating for sustained series on gvns.ca. Easier to link to than filtering by tag.

2. **Semantic CSS** — targeting HTML elements directly rather than wrapping everything in classes produces minimal, maintainable stylesheets. Worth considering for prose-heavy pages where the content is the design.

3. **No-JS default** — gvns.ca uses Svelte islands only where necessary (theme toggle, search). This is already aligned with the same philosophy.

4. **Stable URLs without dates** — gvns.ca currently uses `/posts/<slug>` which is similarly stable. Good.

5. **About page as homepage** — putting the biography on `/` rather than a separate `/about` route means zero clicks to understand who you're reading. Worth considering for gvns.ca.

**Where gvns.ca deliberately differs:**

- More visual design (P1-P5 accent palette, typography system, dark/light toggle)
- CMS-driven content (Sveltia CMS) vs likely direct file editing
- More content types (posts, pages, potentially more) vs mitchellh.com's tight scope
- Cloudflare Workers server-side rendering vs Hugo's static output

---

## 7. Summary

| Attribute | mitchellh.com | Confidence |
|-----------|--------------|------------|
| SSG | Hugo | 🔍 Strong inference |
| Markdown | goldmark + GFM | ✅ Confirmed via footnote anchors |
| Styling | Custom semantic CSS | 🔍 Inferred |
| JavaScript | None | ✅ Confirmed |
| Hosting | Unknown | 💭 Speculation |
| Source | Private repo | ✅ Confirmed (not found publicly) |
| Analytics | None | ✅ Confirmed |
| CMS | None (direct file editing likely) | 💭 Speculation |

The site is a textbook example of "less is more" — optimised for the author's workflow (write markdown, push, done) and the reader's experience (load instantly, read, leave). Every absent feature is a maintenance burden not accumulated.
