# Home + /now redesign — April 2026

**Status:** Spec, awaiting implementation
**Drafted:** 2026-04-29
**Revised:** 2026-04-30 (a) — featured-card pattern (selectable text + inline expand), hero dropped, navbar redesigned.
**Revised:** 2026-04-30 (b) — first branding pass: masthead extras (stripe + tagline) + footer signature with wordmark/swatches.
**Revised:** 2026-04-30 (c) — branding tightened after mockup review: stripe-only masthead (no tagline), brutalist top-stripe Featured card, minimal footer with gradient line + dual-licence legal. (b) is **superseded** by (c).
See §11 Revision history.
**Companion docs:** `docs/research/personal-blog-inspiration.md`, `docs/research/mitchellh-com-analysis.md`
**Mockups referenced:** B1 (home, compact widget strip) + C2 (`/now`, short prose intro + bento). The hero portion of B1 is **superseded by §2 of this spec** — see §11.

---

## 1. Decision summary

| Question | Decision |
|---|---|
| Home pairing | **B1, hero-less variant with stripe-only masthead.** No identity hero; page leads with Featured post. Brand work happens at two touchpoints: a 2px P1–P5 stripe directly below the nav (site-wide), and a closing 80×2px gradient line in the footer. 3-up recent, compact 4-up widget strip, footer below the Featured. See §4 (masthead) and §10 (footer). |
| Branding strategy | **Two visual touchpoints, no on-page tagline.** Above-the-fold: 2px P1–P5 stripe directly under the nav (site-wide). Below-the-fold: short P1–P5 gradient line in the footer that visually rhymes with the masthead stripe. The mid-page activity bar is **removed** (one stripe, repurposed). No tagline rendered anywhere on-page — the bio sentence ships only in `<head>` meta and `/about`. Identity work is carried by the navbar (avatar + name) and the palette signature. |
| Featured card pattern | **Brutalist top-stripe, selectable text, inline expand.** Filled card with 2px rose **top** stripe (not left border), zero radius. Eyebrow row: muted tag + ISO date — no "Featured" word, the stripe carries the signal. 22px title with -0.012em tracking. Excerpt at 14px capped at 60ch. Hairline footer divider with reading time (mono, muted) on the left and `keep reading ↓` (mono, rose) on the right. Title is a real link to `/posts/<slug>/`; `<details>` trigger expands the card in place. See §2.3. |
| Recent post cards | **Same pattern site-wide.** Drop the absolute stretched-link from `HorizontalPostCard` and any new `MiniPostCard`. Title links to the post; the surrounding card hover-styles via `:has(a:hover)`. Text always selectable. See §2.4. |
| `/now` pairing | **C2** — short prose intro + freshness date, existing bento layout preserved below. |
| Navbar | **Justified three-cluster layout.** Left: avatar 24px + "Gareth Evans" wordmark (replaces "GVNS"). Centre: existing nav links. Right: status pill · theme toggle · search. Status pill collapses to dot-only below 1024px. See §4. |
| Status pill | **Nav, right-cluster.** Sky dot + "Open to freelance work" text, 1px zinc-700 border, faint sky-tinted bg. **Clickable, links to `/contact`.** Site-wide, persists on post pages where centre-of-nav is breadcrumbs. Below 1024px: dot-only with an `aria-label`. |
| `/about` | Stays separate. With the home hero removed, `/about` is the canonical identity page. Self-description drift fix still applies (see §5). |
| `/now` archive | Single mutable page for this round. **Harper-style dated content collection deferred** to a follow-up issue (see §6). |
| Bio prose policy | Bio / `/now` intro / `/about` prose stays human-written. Live data only via widgets, never interpolated into prose. (See `feedback_gvns_bio_static.md` in Claude memory.) |
| Self-description | Standardised on **"Tech tinkerer · Qualicum Beach"** across `/about` Profile, BaseLayout meta description, OG/Twitter cards. (Home hero removed — no longer rendered visually on `/`, but lives in head meta.) |

Decision rationale lives in the inspiration scan (`docs/research/personal-blog-inspiration.md`, §3 Recommendations), the conversation transcript that produced this spec, and the 2026-04-30 follow-up critique (§11).

---

## 2. Home page — `src/pages/index.astro`

### 2.1 Layout (top to bottom)

1. **Header (nav)** — existing component, **redesigned** (see §4.1–4.5). Three-cluster justified nav with avatar + name, links, status pill + tools.
2. **Masthead stripe (site-wide)** — 2px P1–P5 stripe directly below the nav (see §4.6). Visual brand mark, no text. Renders on every page, not just `/`.
3. **Featured post** — single most recent published post. Brutalist top-stripe pattern, selectable text, inline-expandable. See §2.3.
4. **Recent (3-up row)** — posts 2–4 (i.e. `posts.slice(1, 4)` after sorting). Same selectable-text rule. See §2.4.
5. **Compact widget strip (4-up)** — Read, Listen, Watch, Code in a row. Mobile: 2×2. See §2.5.
6. **Footer** — **rewritten** (see §10). Existing 5-icon row + 80×2px P1–P5 gradient line + dual-licence legal line.

**Hero is removed.** No "Hi, I'm Gareth", no avatar block, no intro paragraph rendered on `/`. Identity cues come from three places now: the navbar (avatar + name), the masthead stripe (visual brand mark, site-wide), and the footer's closing gradient line (visual rhyme with the masthead). The bio sentence still ships in `<head>` meta description and OG/Twitter tags.

**Mid-page activity bar removed.** The previous draft kept a mid-page `ActivityBar` between recent posts and the widget strip and added a separate masthead stripe — two stripes doing two jobs. After mockup review, that was tightened to one stripe in the masthead position. The transition between recent posts and widget strip is now handled by spacing, with no horizontal divider.

### 2.2 Container widths

Use `--width-content` for the entire `<main>`. The current `--width-wide` outer + `--width-content` inner mismatch is a bug; this redesign closes it. The Featured card, 3-up row, and widget strip all fit comfortably in `--width-content`.

### 2.3 Featured post card — pattern

**Goals:** text is selectable, the user can read ~500 chars without clicking through, and they can expand the full body in place. Visual treatment is **brutalist top-stripe** — filled card, zero radius, 2px rose top accent (not left border), hairline footer divider. The 2px stripe carries the "this is the featured post" signal so the eyebrow drops the word "Featured" entirely.

**Markup contract (excerpt outside `<details>`; summary is the expand trigger):**

```astro
<article class="gvns-featured" data-post-slug={slug}>
  <header class="gvns-featured__header">
    <span class="gvns-featured__tag">{primaryTag}</span>
    <time datetime={pubDate.toISOString()} class="gvns-featured__date">
      {formattedDate}
    </time>
  </header>

  <h2 class="gvns-featured__title">
    <a href={`/posts/${slug}`}>{title}</a>
  </h2>

  <p class="gvns-featured__excerpt">{excerpt500}</p>

  <details class="gvns-featured__body">
    <summary class="gvns-featured__expand">
      <span class="gvns-featured__reading-time">{readingTime} min read</span>
      <span class="gvns-featured__cue">
        <span data-when="closed">keep reading ↓</span>
        <span data-when="open">collapse ↑</span>
      </span>
    </summary>
    <div class="gvns-featured__expanded prose">
      <Content />
      <p class="gvns-featured__permalink">
        <a href={`/posts/${slug}`}>Read full post →</a>
      </p>
    </div>
  </details>
</article>
```

**Why this shape:**

- The excerpt sits **outside** `<details>` so selecting text inside it doesn't toggle the disclosure (the click-up that ends a selection-drag would otherwise expand the card — a known `<summary>` UX gotcha).
- The `<summary>` is the entire footer row (reading time + expand cue) — clicking anywhere along that row toggles the card. The inner spans are styled with a top hairline `border-top: 1px solid var(--colour-border)` so the footer reads as a divided meta strip, not an obvious button.
- When `<details>` is open, `<Content />` re-renders the same opening paragraphs the excerpt showed. Hide the standalone excerpt with CSS: `.gvns-featured:has(details[open]) .gvns-featured__excerpt { display: none; }`. `:has()` has solid 2026 support; with no fallback, the duplication is cosmetic and tolerable.
- The eyebrow is just **tag + date** — "Featured" word is gone because the 2px rose top stripe is the unambiguous featured signal.

**Implementation notes:**

- **Excerpt source.** Render the first ~500 characters of `post.body` (Markdown), stripped of frontmatter, clamped to the nearest paragraph or sentence boundary so we never cut a word mid-stream. Helper: `src/utils/excerpt.ts` (new) — `getExcerpt(markdown: string, maxChars = 500): string`. Reuse for any future preview surface.
- **Full body.** Use Astro 6's content layer `render()`: `const { Content } = await render(post)`. The rendered `<Content />` lives inside the `<details>` expanded block. Markdown's existing styles (headings, code blocks, etc.) need to scope to the homepage prose context — wrap in `.prose` and apply the same prose tokens used by `PostLayout.astro`.
- **No JS required.** `<details>` handles open/close, keyboard, ARIA. The "keep reading ↓ / collapse ↑" labels are pure CSS, swapped via `details[open] [data-when="closed"] { display: none }` and its inverse. Strip the default disclosure marker with `summary { list-style: none } summary::-webkit-details-marker { display: none }`.
- **Selectable text.** Removing the absolute stretched anchor (in `HorizontalPostCard.astro` and any new card) is the entire fix. `user-select` defaults to `auto` everywhere; nothing to toggle.
- **Hover affordance for the card.** Use `:has()` so the card subtly emphasises when the title or summary is hovered: `.gvns-featured:has(:is(a:hover, summary:hover)) .gvns-featured__title a { color: var(--colour-p2-rose-hover); }`. The card itself stays still — the type does the talking.
- **SEO/duplication guardrail.** The post's canonical URL stays on `/posts/<slug>/`. Don't claim `BlogPosting` schema on the homepage Featured — wrap the homepage card in `<article itemscope itemtype="https://schema.org/CreativeWork">` and let the post page own the `BlogPosting` markup. Signals "showcase, see canonical" to crawlers.

**Visual specification:**

- Container: `background: var(--colour-bg-secondary)`, `border-top: 2px solid var(--colour-p2-rose)`. **No radius**, no other borders. `padding: 1.25rem 1.5rem` (20px 24px) desktop, `1rem 1.125rem` mobile.
- Eyebrow row: flex with `justify-content: space-between`, `align-items: baseline`, `margin-bottom: 0.875rem`.
  - Tag: muted caps. `font-size: 11px`, `font-weight: 500`, `letter-spacing: 0.08em`, `text-transform: uppercase`, `color: var(--colour-text-secondary)`. **No "Featured" prefix** — just the tag.
  - Date: ISO format (`YYYY-MM-DD`), JetBrains Mono, `font-size: 11px`, `color: var(--colour-text-muted)`, `letter-spacing: 0.02em`. Reading time moves to the footer row.
- Title: Space Grotesk 500, 22px desktop / 20px mobile, line-height 1.22, `letter-spacing: -0.012em`, `margin: 0 0 0.875rem`. Title link inherits primary text colour; hover migrates to `--colour-p2-rose-hover`.
- Excerpt: Inter 400, 14px, line-height 1.65, `color: var(--colour-text-secondary)`, `max-width: 60ch`, `margin: 0 0 1rem`.
- Footer (`<summary>`): flex, `justify-content: space-between`, `align-items: baseline`, `padding-top: 0.875rem`, `border-top: 1px solid var(--colour-border)`. `cursor: pointer`.
  - Reading time: JetBrains Mono, 11px, `color: var(--colour-text-muted)`, left side.
  - Expand cue: JetBrains Mono, 12px, `font-weight: 500`, `color: var(--colour-p2-rose-hover)`, right side. "keep reading ↓" / "collapse ↑".
- Expanded prose: respects `PostLayout` typography tokens. Top spacing of 1rem above the rendered content.
- Permalink: muted Inter 400, P2 rose accent. Sits at the bottom of the expanded body with `padding-top: 0.625rem; border-top: 1px solid var(--colour-border)`.

**Mobile-specific tweaks:**

- Padding tightens (`1rem 1.125rem`).
- Title scales to 20px.
- Eyebrow date drops to a separate line below the tag — too tight at narrow widths to keep them on one row at small font sizes.

### 2.4 Recent posts (3-up) — pattern

The same "no stretched anchor, title-as-link" rule applies. Each card:

- `bg-secondary`, full 1px border, radius 6px, padding ~12px.
- Tag pill (Starwind `Badge` `variant="ghost"`).
- Title: Inter 500, 13–14px (slightly larger than the previous spec's 12–13px to keep the tap target comfortable). The `<h3>` wraps an `<a href={…}>`.
- Date in mono 10px muted.
- Hover: `:has(a:hover)` lifts border to `--colour-border-hover` and brightens the title.
- No description/excerpt at this size — title + tag + date is sufficient.
- Mobile: stack to one column.

> **Open question — visual harmony with Featured.** Featured is now zero-radius brutalist; recent cards keep `border-radius: 6px`. The contrast might read as deliberate (Featured is the loud one, recents are quieter cards) or as accidental (radii drift). Worth a riff before PR 6 ships — see follow-up issue. If recent cards adopt zero-radius too, drop the radius and the visual rhythm becomes: stripe → Featured (top stripe + zero radius) → 3 mini cards (zero radius) → widget strip (4 cards with 2px coloured top accents and zero-radius bottoms). One coherent rectangular language.

### 2.5 Compact widget strip (4-up) — unchanged

- Each cell: `bg-secondary`, full border, **2px top accent in the activity colour** (rose / emerald / amber / violet), radius `0 0 4px 4px` (square top, rounded bottom — top accent reads as a colour bar, not a border).
- Content: tiny caps label (e.g. "READING"), Inter 500 11px primary text (item title), Inter 400 10px secondary (subtitle).
- The `compact` prop already exists in the production home page — confirm each widget honours it; tighten if the rendered output is too tall.
- Mobile: 2×2.

### 2.6 Files

| File | Action |
|---|---|
| `src/pages/index.astro` | Rewrite — drop hero, lead with `<FeaturedPostCard>`, then `<RecentPostsRow>`, then widget strip. **Mid-page `<ActivityBar />` removed** — masthead stripe takes its place |
| `src/components/Hero.astro` | **Do not create** — no longer in the design |
| `src/components/FeaturedPostCard.astro` | **New** — brutalist top-stripe card (filled, zero radius, 2px rose top, hairline footer divider). `<details>` expand wired to Astro 6 `render()`. Internally bespoke (the `<details>` semantics rule out a stock Starwind `Card` wrapper). |
| `src/components/RecentPostsRow.astro` | **New** — 3-up grid wrapper for `MiniPostCard` |
| `src/components/MiniPostCard.astro` | **New** — small card variant. Title-as-link, no stretched anchor. Radius pending the harmony question in §2.4. |
| `src/components/HorizontalPostCard.astro` | Edit — drop the absolute stretched-link pattern (`<a class="absolute inset-0">`). Title becomes the link; hover state migrates to `:has(a:hover)`. Used on `/posts` listing. |
| `src/components/ActivityBar.astro` | **No longer rendered on `/`** — but stays available for any other page that wants a section divider. The masthead stripe in `Header.astro` consumes the same `--gvns-activity-gradient` variable so the look stays unified. |
| `src/components/widgets/{Read,Listen,Watch,Code}Widget.astro` | Verify `compact` mode renders to spec; adjust if needed |
| `src/utils/excerpt.ts` | **New** — `getExcerpt(markdown: string, maxChars = 500): string` helper |

---

## 3. `/now` page — `src/pages/now/index.astro`

### Layout

1. **Header** — existing.
2. **Page heading row** — `<h1>` "Now" (Space Grotesk 700, 32px) on the left; "Updated DD Month YYYY" in JetBrains Mono muted on the right. Same baseline.
3. **Prose intro** — 2 paragraphs in Inter, ~80–100 words total. First paragraph in primary text colour; second in `--colour-text-secondary`.
   - Source: `src/data/now-intro.md` (new file). Frontmatter: `lastUpdated: YYYY-MM-DD`. Body: 2 paragraphs of Markdown.
   - The page imports the file at build time, renders the body, and uses `lastUpdated` for the freshness date in the heading row.
   - **CMS wiring is a follow-up.** For this round, edit the file directly. (Issue: add `now-intro` as a Sveltia collection in `public/admin/config.yml`.)
4. **Bento grid** — existing `gvns-now__bento` markup preserved. CodeWidget 2×2, Read+Listen wide 2×1, Write/Watch/Status normal 1×1.
5. **Footer** — existing.

### Files

| File | Action |
|---|---|
| `src/pages/now/index.astro` | Modify — add heading row + prose intro section above bento |
| `src/data/now-intro.md` | **New** — Markdown content for prose intro |
| `src/content.config.ts` | No change (data file, not collection) |

---

## 4. Navbar redesign — `src/components/Header.astro`

The navbar is the new home for site identity (since the homepage hero is gone) and the working canvas for status, theme, and search. Three-cluster justified layout, designed to use the full `--width-content` width.

### 4.1 Layout (desktop, ≥1024px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [avatar] Gareth Evans   About  Posts  Now   ● Open to freelance work  ☼ ⌕   │
└─────────────────────────────────────────────────────────────────────────────┘
   left cluster (brand)      centre cluster      right cluster (status + tools)
```

- **Left cluster (brand).** 24×24 circular avatar (sourced from `/avatar.webp` with `/avatar.jpg` fallback, `loading="eager"`, `decoding="async"`) followed by "Gareth Evans" wordmark in Inter 600 14px. Both wrapped in a single `<a href="/">` with `aria-label="Home"`. Replaces the current "GVNS" wordmark.
- **Centre cluster (nav).** Existing nav links (`About`, `Posts`, `Now`) preserved. On post pages where breadcrumbs render, the centre cluster swaps to breadcrumbs as today. No change to the link list — keep the top-level nav at three items so the centre stays uncluttered.
- **Right cluster (tools).** Status pill · `ThemeToggle` · `Search`. The pill is the new addition; theme + search exist today.

### 4.2 Layout (tablet, 768–1023px)

- Status pill collapses to **dot-only** (6×6 sky dot inside the pill chrome, label text hidden via `display: none`). The link target and `aria-label` stay intact, so the pill remains clickable and accessible.
- Brand cluster: avatar + name remain visible.
- Centre nav stays at 3 links.

### 4.3 Layout (mobile, <768px)

- Existing `MobileNav` pattern preserved.
- Brand cluster (mobile bar): avatar + "Gareth Evans" replaces the current "GVNS" wordmark — same swap as desktop.
- Status pill **moves into the mobile menu** as a top item (full-width pill with label, since space is no longer at a premium inside the menu).

### 4.4 Status pill — markup + styling

```html
<a class="gvns-status-pill" href="/contact" aria-label="Open to freelance work — contact me">
  <span class="gvns-status-pill__dot" aria-hidden="true"></span>
  <span class="gvns-status-pill__label">Open to freelance work</span>
</a>
```

- `display: inline-flex; align-items: center; gap: 0.375rem`
- `padding: 0.1875rem 0.625rem`
- `border: 1px solid var(--colour-border)`; `border-radius: 9999px`
- Background: `rgb(14 165 233 / 0.06)` (sky-tinted)
- Label colour: `var(--colour-text-secondary)`; on hover, transition to `var(--colour-text-primary)`
- Dot: 6×6 circle, `background: var(--colour-p5-sky)`
- **Tablet collapse:** at `(max-width: 1023px)`, hide `.gvns-status-pill__label` and tighten `padding` to `0.25rem`. The pill becomes a circular dot-pill, ~22px diameter.
- **Suppression:** Renders only when status is `open` (initial state). When status is anything else, the pill is **suppressed entirely** — avoid the awkward "closed for work" pill.

### 4.5 Brand cluster — markup sketch

```astro
<a href="/" class="gvns-navbar__brand" aria-label="Home — Gareth Evans">
  <picture class="gvns-navbar__avatar">
    <source srcset="/avatar.webp" type="image/webp" />
    <img src="/avatar.jpg" alt="" width="24" height="24" loading="eager" decoding="async" />
  </picture>
  <span class="gvns-navbar__wordmark">Gareth Evans</span>
</a>
```

- Avatar `alt=""` because the wordmark is the accessible name; the avatar is decorative within the link.
- Wordmark hides at very narrow widths (<640px) — avatar only on the smallest mobile bar to save space, full name returns from 640px up.

### 4.6 Masthead stripe — site-wide

A single 2px P1–P5 stripe rendered directly below the nav, on every page. Visual brand mark, no text. This **replaces** the previous mid-page `ActivityBar` rather than duplicating it — one stripe doing one job (brand), positioned at the masthead so it announces the site instead of dividing content.

**Markup:**

```astro
<header class="gvns-navbar">
  <nav>...</nav>
  <div class="gvns-masthead-stripe" aria-hidden="true"></div>
</header>
```

**Stripe (`gvns-masthead-stripe`):**

- Height: 2px. Width: 100%, edge-to-edge (full viewport, ignores `--width-content`).
- Background: 5-stop linear-gradient using P1–P5 tokens, hard stops at 20/40/60/80 %, no blending. Reuses the existing `ActivityBar` colour logic — extract that gradient into a CSS variable so the masthead stripe, the footer gradient line (§10), and any standalone `ActivityBar` instance share one source of truth. Helper: add `--gvns-activity-gradient` to `global.css`.
- `aria-hidden="true"` — pure decoration, no semantic content.
- Renders site-wide: home, `/about`, `/now`, `/posts`, individual post pages, `/contact`. On post pages the centre nav still swaps to breadcrumbs as today; the stripe sits below regardless.

**No tagline.** Earlier drafts of this spec proposed a 1-line tagline alongside the stripe. After mockup review, the tagline was dropped from the page render — the bio sentence ships only in `<head>` meta description and `/about`. See §11 revision history (c) for the why.

**No JS, no island.** Static markup + CSS.

### 4.7 Data source for status

Hardcode `status: "open"` in `Header.astro` (or pass via prop from `BaseLayout`) for now. When `StatusWidget` becomes the canonical source of truth, the pill subscribes to the same data — see `StatusWidget.astro`. Do **not** duplicate two separate "current status" stores; pick one and have both surfaces read from it.

### 4.8 Files

| File | Action |
|---|---|
| `src/components/Header.astro` | Rewrite — three-cluster nav layout, brand swap, status pill, masthead stripe below the nav |
| `src/components/MobileNav.svelte` | Edit — accept `statusOpen` prop, render the status pill as the top mobile menu item when true |
| `src/styles/global.css` | Add `--gvns-activity-gradient` CSS variable so the masthead stripe (§4.6), footer gradient line (§10), and any remaining `ActivityBar` consumer share one source of truth |
| `src/components/ActivityBar.astro` | Refactor to consume `--gvns-activity-gradient` (no visual change; deduplication only). Component still exists for any non-home page that wants a mid-page section divider. |
| `public/avatar.webp` / `public/avatar.jpg` | No change — already exists, reused at 24px |

---

## 5. Self-description drift fix

With the homepage hero removed and **no on-page tagline** rendered (see §4.6 and §10), the bio sentence lives in two places only: head meta (BaseLayout default + OG/Twitter cards) and `/about`. One canonical string covers both.

- **Site bio sentence:** *"Tech tinkerer in Qualicum Beach. I write about homelab, self-hosting, networking, and BJJ."*
- Housed as `SITE_BIO` in `src/utils/site.ts` — single source of truth so a future copy edit happens in one file.

| Location | Current | New |
|---|---|---|
| `src/pages/index.astro` hero | "Tech Tinkerer based in Qualicum Beach, Canada. I write about homelab, self-hosting, networking, BJJ, and the occasional life observation." | **Removed from page render.** No replacement on `/` — see §2.1 (hero deleted). |
| `src/pages/index.astro` `<BaseLayout description={…}>` | "Personal site for writing and shipped work. Serious work, questionable puns." | `SITE_BIO` |
| `src/pages/about/index.astro` Profile `jobTitle` | "Web developer · Vancouver Island" | "Tech tinkerer · Qualicum Beach" |
| `src/pages/about/index.astro` body prose | "Hi, I'm Gareth — a web developer based on Vancouver Island, Canada." | Rewrite paragraph to lead with "tech tinkerer" framing. (Keep BJJ, homelab, etc. content as-is.) |
| `BaseLayout` default meta description | (review for consistency) | `SITE_BIO` (used as fallback only; pages that pass an explicit `description` prop continue to override) |
| OG/Twitter card description | (review for consistency) | `SITE_BIO` |

---

## 6. Out of scope for this round

- **Harper-style dated `/now` archive.** A `now` content collection alongside `posts`, with `/now/YYYY-MM-DD/` per snapshot and a `<details>` archive on `/now`. File a follow-up issue once the single-mutable `/now` is stable. Recommended for a 2026-Q3 pass.
- **Brandur-style content-type taxonomy** (Atoms / Fragments / Articles). Worth considering when gvns.ca grows multiple writing kinds; currently posts are one bucket and that's fine.
- **apenwarr-style "Related / Unrelated" footer link clusters** on posts. Nice serendipity move; separate from the home/now redesign.
- **Lee Robinson's inline last-played sentence in bio.** Considered and declined — bio prose stays static, widgets carry live signal (see `feedback_gvns_bio_static.md`).
- **Animated `<details>` disclosure** (CSS `interpolate-size: allow-keywords` + `::details-content`). Nice polish, browser support still uneven as of 2026-04. Default snap-open is acceptable for v1.
- **Smart greeting / time-of-day variants in nav.** A previous draft considered "Welcome back" on returning visits. Skipped — the avatar-and-name brand cluster already does the recognition work without state.

---

## 7. Acceptance criteria

The redesign ships when:

1. `/` leads with the Featured post (no hero rendered). 3-up recent posts, compact 4-up widget strip, footer below. All within `--width-content`. No production mismatches between outer/inner widths. **No mid-page activity bar** — the masthead stripe replaces it.
2. **Featured card (brutalist top-stripe).** Filled card with `border-top: 2px solid var(--colour-p2-rose)`, zero radius. Eyebrow is muted tag + ISO date (no "Featured" word). 22px Space Grotesk title with -0.012em tracking, real `<a>` link to `/posts/<slug>/`. 14px excerpt at `max-width: 60ch`, selectable text via `getExcerpt(post.body)` ≈500 chars. Hairline footer divider with mono reading time + `keep reading ↓` cue. `<details>` expand reveals the full body via Astro 6 `render()` and a `Read full post →` permalink. No JS island used. Keyboard tab-order: title link → summary toggle → permalink (when open).
3. **Recent post cards.** No absolute stretched anchor. Title links to the post; text inside the card is selectable. `HorizontalPostCard` updated in place; `MiniPostCard` follows the same rule from inception. Radius pending §2.4 follow-up.
4. **Navbar.** Three-cluster justified layout: avatar 24px + "Gareth Evans" wordmark on the left; existing nav links centred; status pill · theme toggle · search on the right. Status pill collapses to dot-only at 768–1023px, hides entirely when status is not `open`. On post pages, breadcrumbs replace the centre cluster as today.
5. **Masthead stripe (site-wide).** A 2px P1–P5 stripe renders directly below the nav on every page. Sources its gradient from `--gvns-activity-gradient`. `aria-hidden="true"`. **No on-page tagline** under the stripe — bio sentence ships only in head meta.
6. **Footer.** Existing 5-icon row preserved. Below the icons: an 80×2px P1–P5 gradient line (uses the same gradient variable as the masthead stripe). Below that: a single legal line in JetBrains Mono 11px reading `© {currentYear} Gareth Evans · code MIT · words CC BY 4.0`. No wordmark, no tagline, no swatch circles. See §10.
7. `/now` matches C2: heading row with mono date, 2-paragraph prose intro from `src/data/now-intro.md`, existing bento preserved below. Updated date is sourced from frontmatter, not hardcoded.
8. **Self-description drift** is resolved: `SITE_BIO` lives in `src/utils/site.ts`; all consumers (BaseLayout default meta, homepage `description` prop, OG/Twitter cards) read from it. `/about` Profile + body prose match the "Tech tinkerer · Qualicum Beach" framing. Verify OG/Twitter card unfurls render the new sentence.
9. **Accessibility.** `axe-core` clean run on `/` and `/now`. Featured `<details>` operable by keyboard. Status pill has accurate `aria-label`. Avatar in nav has empty `alt` (decorative within a labelled link). Masthead stripe and footer gradient line both have `aria-hidden="true"`.
10. **No regression.** Lighthouse (or equivalent) shows no regression in performance, accessibility, best-practices vs current production. Bundle size for `/` shrinks (no Hero, no JS for expand).
11. All changes pass `npm run build` cleanly. No new console warnings.

---

## 8. Implementation order (suggested)

PR 1 — **`SITE_BIO` + self-description drift** (`src/utils/site.ts` with `SITE_BIO`, plus `/about` profile + prose updates and BaseLayout meta wiring). Pure copy + a tiny utility module; low risk.
PR 2 — **Activity gradient extraction + LICENSE file** (`--gvns-activity-gradient` in `global.css`; `ActivityBar.astro` consumes it; commit a top-level `LICENSE` (MIT) file so the footer's "code MIT" claim is truthful when PR 5 ships). No visual change. Tiny PR.
PR 3 — **Navbar redesign + masthead stripe** (`Header.astro` rewrite, `MobileNav.svelte` update, status pill, brand swap, 2px masthead stripe below the nav). Visible site-wide change. Depends on PR 2 (consumes the gradient variable).
PR 4 — **`/now` prose intro** (additive, doesn't change the bento). Independent of the others.
PR 5 — **Footer rewrite** (see §10). Adds 80×2px gradient line below the existing icon row; updates the legal line to `© {year} Gareth Evans · code MIT · words CC BY 4.0`. Depends on PR 2 (gradient variable + LICENSE file).
PR 6 — **Featured card pattern + excerpt utility** (`FeaturedPostCard.astro` with brutalist top-stripe treatment, `src/utils/excerpt.ts`). Visual review against a draft post.
PR 7 — **Recent post cards refactor** (`MiniPostCard.astro`, drop stretched-link in `HorizontalPostCard.astro`). Touches `/posts` listing too — call it out in the PR description. **Resolve §2.4 radius question** before this lands.
PR 8 — **Home page rebuild** (`src/pages/index.astro`). Drops hero, wires PR 6 + PR 7 components, removes mid-page `<ActivityBar />`, sets the new `BaseLayout description` prop.
PR 9 — **CMS wiring for `now-intro.md`** (quality-of-life follow-up; can ship after the page is live).

Each step is small enough to be its own PR. Branching off `main`, expected to take ~1–2 dev sessions per item depending on widget polish.

**Dependency graph:**
- PR 1 (`SITE_BIO`) is consumed by PR 8 (BaseLayout description).
- PR 2 (gradient + LICENSE) is consumed by PRs 3 and 5.
- PR 6 → PR 7 → PR 8 is the home-page chain.
- PR 4 (`/now` intro) and PR 9 (CMS wiring) form their own little track.

**Recommended landing order:** 1 → 2 → 3 (early site-wide brand win) → 5 → 4 → 6 → 7 → 8 → 9.

---

## 9. Astro 6 + Starwind UI Pro notes

Things this redesign deliberately uses (or deliberately avoids) from the platform:

- **Astro 6 `render()` for inline post bodies.** `import { render } from 'astro:content'` then `const { Content } = await render(post)`. Replaces the older `post.render()` instance method removed in Astro 5/6. Used in `FeaturedPostCard.astro`.
- **Prerender stays on for `/`.** `export const prerender = true;` at the top of `src/pages/index.astro` — Astro 6 runs in `output: 'server'` for this site; the home is fully static at build time, no SSR needed.
- **No JS island for the Featured expand.** `<details>/<summary>` is the right primitive — keyboard-accessible by default, zero hydration cost, plays nicely with Astro 6's static-by-default ethos. We don't use Svelte for this.
- **Excerpt lives outside `<details>`** (see §2.3). Two reasons: putting selectable text inside `<summary>` makes the click-up that ends a selection toggle the disclosure; and `<summary>`'s content model is phrasing content + headings, so a `<p>` inside it would be invalid HTML anyway. The standalone excerpt is hidden via `:has(details[open])` when the card is expanded, to avoid duplication with `<Content />`.
- **Starwind primitives leaned on:**
  - `@/components/starwind/card` for the recent post mini-cards (`Card` wrapper; `MiniPostCard` composes it).
  - `@/components/starwind/badge` for tag pills (`variant="ghost"`).
  - `@/components/starwind/button` — the `<summary>` itself is the trigger, not a Starwind `<Button>`. (A `<button>` inside `<summary>` is invalid HTML; we just style the `<summary>` to look button-ish via the `gvns-featured__expand` class.)
  - `@/components/starwind/separator` optionally between Featured and the 3-up row.
  - The Featured card itself is bespoke (the `<details>` semantics rule out a stock `Card` wrapper for the expand region) — that's why §2.3 specifies the markup directly.
- **Adding more Starwind blocks if needed.** New blocks come in via `npx starwind@latest add <component>` per `CLAUDE.md`. We don't anticipate needing any new ones for this redesign — the existing primitives cover the surface.
- **Tailwind 4 + CSS variables.** Stay in the existing token system (`--colour-bg-secondary`, `--colour-p2-rose`, etc). No new ad-hoc colour values.
- **`gvns-` prefix** for component-scoped classes (per `docs/COMPONENT-CONVENTIONS.md`).

---

## 10. Footer

Minimal session-end footer. Restraint over signature. The existing icon row stays unchanged; one new visual element (a short P1–P5 gradient line) and a tightened legal line are the only additions. The line visually rhymes with the masthead stripe at the top of every page — bookending the page with the same colour signature, sized differently.

### 10.1 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│              [GH]   [Th]   [Li]   [@]   [RSS]                      │
│                                                                    │
│                       ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                              │
│                                                                    │
│      © 2026 Gareth Evans · code MIT · words CC BY 4.0              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Three rows inside `--width-content`, centred:

1. **Icon row** — existing `Footer.astro` link list. GitHub, Threads, LinkedIn, Email (→ `/contact`), RSS. Same icons, same order, same external/internal handling. **Unchanged**.
2. **Gradient line** — 80×2px P1–P5 strip. New. Visual rhyme with the masthead stripe (§4.6). `aria-hidden="true"`.
3. **Legal line** — single line in JetBrains Mono 11px, tertiary text colour. New copy: `© {currentYear} Gareth Evans · code MIT · words CC BY 4.0`. Replaces the current `© {currentYear} Gareth Evans` text.

No wordmark added. No tagline added. No swatch circles. The footer's job is shortcuts to the person elsewhere (icons), one piece of brand callback (gradient line), and licence/copyright. That's it.

### 10.2 Markup sketch

```astro
<footer class="gvns-footer">
  <div class="gvns-footer__inner">
    <ul class="gvns-footer-links" aria-label="Off-site presence">
      ...existing icon links unchanged...
    </ul>

    <div class="gvns-footer__gradient" aria-hidden="true"></div>

    <p class="gvns-footer__legal">
      © {currentYear} Gareth Evans · code MIT · words CC BY 4.0
    </p>
  </div>
</footer>
```

### 10.3 Styling notes

- Container: existing `padding-block` and `border-top: 1px solid var(--colour-border)` preserved.
- `.gvns-footer__inner`: flex column, `align-items: center`, `gap: 0.875rem` (~14px between icon row → gradient line → legal line).
- Gradient line: `width: 80px; height: 2px; background: var(--gvns-activity-gradient);` — same variable the masthead stripe consumes (§4.6, set up in PR 2).
- Legal line: `font-family: var(--font-mono); font-size: 11px; color: var(--colour-text-muted); letter-spacing: 0.02em; margin: 0;`. Use a real `·` (middle dot, U+00B7) between segments, not pipes.
- Mobile: same vertical stack, same proportions. Gradient line and legal line both fit comfortably in narrow viewports without wrapping.

### 10.4 Files

| File | Action |
|---|---|
| `src/components/Footer.astro` | Edit — keep the existing icon link list verbatim. Add the `<div class="gvns-footer__gradient">` and rewrite the `<p>` legal line copy. Component-scoped CSS picks up the new gradient + legal line styles. |
| `src/utils/site.ts` | No new constants needed — the legal line is short enough to live inline in the template; year is computed from `new Date().getFullYear()` as today |
| `LICENSE` (repo root) | **New** — commit a standard MIT LICENSE file before this PR ships, so the "code MIT" claim in the footer is truthful. Tracked as PR 2. |

### 10.5 Open question — content licence anchor

The legal line states "words CC BY 4.0" but doesn't link anywhere. Decide before PR 5 ships whether to:

- (a) Leave the claim unlinked. The text is authoritative on its own.
- (b) Add a `/licence` page that explains the licence, link to it from the footer line.
- (c) Document the licence in `/about` instead and point to it.

Default for the spec: **(a)** — leave unlinked, ship the line as-is. Revisit if a reader asks for clarification in the wild.

---

## 11. Revision history

**2026-04-30 (c) — branding tightened after mockup review.** *(Supersedes (b).)*

A round of visual mockups in conversation surfaced that the 2026-04-30 (b) direction (masthead with stripe + tagline; footer with wordmark, swatches, signature line, dual-tagline strings) was over-built relative to the rest of the site's restraint. This revision walks the brand work back toward minimal — one stripe at the top, one rhyming gradient line at the bottom, no on-page tagline anywhere. A separate riff on the Featured card landed the brutalist top-stripe direction in the same pass.

What changed from (b):

- **§1** Branding strategy row rewritten: two visual touchpoints (masthead stripe + footer gradient line), no on-page tagline. "Three touchpoints with tagline" framing dropped.
- **§1** Featured card pattern row updated to brutalist top-stripe (filled, zero radius, 2px rose top, hairline footer divider, no "Featured" word).
- **§2.1** Mid-page activity bar **removed** (was previously kept as a section divider). The "two stripes are intentional" justification is gone — there's now one stripe, in the masthead position.
- **§2.3** Featured card markup contract and visual spec rewritten end-to-end. New eyebrow (muted tag + ISO date, no "Featured"), 22px title with -0.012em tracking, 60ch excerpt cap, summary-as-footer with reading time + `keep reading ↓` cue.
- **§2.4** New open question added: recent-card radius harmony with the brutalist Featured. Flagged for resolution before PR 7.
- **§2.6 Files** Reflects mid-page `ActivityBar` removal on `/`; Featured component note updated.
- **§4.6** Masthead extras shrank to **stripe-only**. No tagline. No two-stripe justification. Section title renamed "Masthead stripe".
- **§4.8 Files** Drops `SITE_TAGLINE_SHORT`/`SITE_TAGLINE_FULL` references from the navbar's responsibilities.
- **§5** Self-description drift simplified back to a single string (`SITE_BIO`) housed in `src/utils/site.ts`. The dual-tagline (short + full) framing from (b) is gone. No on-page tagline consumer to feed.
- **§7** Acceptance criteria revised: AC #1 explicitly removes the mid-page activity bar; AC #2 captures the brutalist Featured spec; AC #5 says "stripe only, no tagline"; AC #6 captures the new minimal footer.
- **§8** PR list re-shuffled. PR 1 simplifies (one constant instead of two). PR 2 absorbs the LICENSE file commitment alongside the gradient extraction. PR 3 drops "tagline" wording. PR 5 (footer) shrinks to icon-row + gradient line + legal line — no wordmark, no swatches, no tagline.
- **§10** Footer section fully rewritten to the minimal direction. Three rows: icons, gradient line, legal line. Open question added (10.5) about anchoring the content licence claim.

What stayed the same:

- Featured `<details>` mechanics (selectable excerpt outside details, `:has(details[open])` to hide excerpt when expanded).
- Recent cards "no stretched anchor, title-as-link" rule.
- Navbar three-cluster layout, brand swap, status pill behaviour.
- `/now` design (§3) — short prose intro + bento.
- §6 out-of-scope items.

---

**2026-04-30 (b) — branding strategy: masthead extras + footer signature.** *(Superseded by (c) above.)*

Follow-up to the 2026-04-30 (a) revision below. The "drop the hero" decision was sound but left a brand gap. This revision answered: where does identity show up now? Answer was: stripe + tagline at top, signature + swatches + tagline at bottom. Mockup review for the next round determined that was too much chrome — see (c).

What changed in (b):

- **§1** Added "Branding strategy" decision row.
- **§2.1** Expanded layout to include the masthead extras (stripe + tagline) and call out the rewritten footer. Two stripes (masthead brand + mid-page divider) explicitly justified.
- **§4.6 (new)** Masthead extras: 2px P1–P5 stripe + tagline directly below the nav, site-wide, no JS. Renumbered the rest of §4.
- **§4.8 Files** Added `global.css` + `ActivityBar.astro` refactor to share the gradient via `--gvns-activity-gradient`.
- **§5** Self-description drift now references two strings (`SITE_TAGLINE_SHORT` for rendered surfaces, `SITE_TAGLINE_FULL` for meta), both housed in `src/utils/site.ts`.
- **§7** Added acceptance criteria for masthead extras (#5) and footer signature (#6); renumbered the rest.
- **§8** Implementation order grew from 7 to 9 PRs to absorb the constants + gradient extraction + footer pieces. Dependency graph documented.
- **§10 (new)** Footer signature spec: signature line + palette swatches + key links + legal line.

What stayed the same:

- Featured card pattern, recent cards, nav cluster layout, status pill behaviour, `/now` design.
- "No greeting, no first-person" rule for above-the-fold copy.

---

**2026-04-30 (a) — featured-card pattern + nav redesign + hero drop.**

What changed from the 2026-04-29 draft:

- **Featured post card** rewritten (§2.3). Selectable text, `<details>` inline expand to full body, explicit title link, `Read full post →` permalink. Replaces the previous "card with `description` field + Read more" pattern, which was non-selectable due to the absolute stretched anchor inherited from `HorizontalPostCard`.
- **Recent 3-up cards** now follow the same selectable-text rule (§2.4). Drops the stretched-link pattern site-wide, including `HorizontalPostCard` on `/posts`.
- **Hero deleted** from the homepage (§2.1). The "Hi, I'm Gareth" identity row felt directed at first-time visitors, while the actual traffic skew is returning. Identity moves into the navbar.
- **Navbar redesigned** (§4): three-cluster justified layout, avatar 24px + "Gareth Evans" wordmark replacing "GVNS", status pill in the right cluster, dot-only collapse at tablet widths.
- **Self-description drift** (§5) updated: home hero removed, so the bio sentence now lives in BaseLayout meta + OG/Twitter cards + `/about` only. The `<BaseLayout description>` prop on `/` carries it for unfurls.
- **Acceptance criteria** (§7) and **implementation order** (§8) reshuffled to match.
- **§9 added** — explicit Astro 6 + Starwind UI Pro guidance.
- **§6 (out of scope)** picked up two new deferred items: animated `<details>` disclosure, and time-of-day greeting variants.

What stayed the same:

- `/now` design (§3) — short prose intro + bento.
- Status pill behaviour, link target, suppression rules — but the section is now folded into the broader navbar redesign in §4.
- Container width recommendation — still `--width-content` for the home page.
