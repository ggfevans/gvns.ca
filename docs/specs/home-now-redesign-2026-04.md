# Home + /now redesign — April 2026

**Status:** Spec, awaiting implementation
**Drafted:** 2026-04-29
**Revised:** 2026-04-30 — featured-card pattern (selectable text + inline expand), hero dropped, navbar redesigned. See §10 Revision history.
**Companion docs:** `docs/research/personal-blog-inspiration.md`, `docs/research/mitchellh-com-analysis.md`
**Mockups referenced:** B1 (home, compact widget strip) + C2 (`/now`, short prose intro + bento). The hero portion of B1 is **superseded by §2 of this spec** — see §10.

---

## 1. Decision summary

| Question | Decision |
|---|---|
| Home pairing | **B1, hero-less variant.** No identity hero; page leads with Featured post. 3-up recent, activity bar, compact 4-up widget strip below. Identity moves into the navbar (see §4). |
| Featured card pattern | **Selectable text, no stretched anchor.** Title is the link to `/posts/<slug>/`. `<details>` trigger expands the card in place to render the full post body. `Read full post →` permalink visible only when expanded. ~500 chars of body shown collapsed (configurable; clamps at paragraph boundary). See §2.3. |
| Recent post cards | **Same pattern site-wide.** Drop the absolute stretched-link from `HorizontalPostCard` and any new `MiniPostCard`. Title links to the post; the surrounding card hover-styles via `:has(a:hover)`. Text always selectable. See §2.4. |
| `/now` pairing | **C2** — short prose intro + freshness date, existing bento layout preserved below. |
| Navbar | **Justified three-cluster layout.** Left: avatar 24px + "Gareth Evans" wordmark (replaces "GVNS"). Centre: existing nav links. Right: status pill · theme toggle · search. Status pill collapses to dot-only below 1024px. See §4. |
| Status pill | **Nav, right-cluster.** Sky dot + "Open to freelance work" text, 1px zinc-700 border, faint sky-tinted bg. **Clickable, links to `/contact`.** Site-wide, persists on post pages where centre-of-nav is breadcrumbs. Below 1024px: dot-only with an `aria-label`. |
| `/about` | Stays separate. With the home hero removed, `/about` is the canonical identity page. Self-description drift fix still applies (see §5). |
| `/now` archive | Single mutable page for this round. **Harper-style dated content collection deferred** to a follow-up issue (see §6). |
| Bio prose policy | Bio / `/now` intro / `/about` prose stays human-written. Live data only via widgets, never interpolated into prose. (See `feedback_gvns_bio_static.md` in Claude memory.) |
| Self-description | Standardised on **"Tech tinkerer · Qualicum Beach"** across `/about` Profile, BaseLayout meta description, OG/Twitter cards. (Home hero removed — no longer rendered visually on `/`, but lives in head meta.) |

Decision rationale lives in the inspiration scan (`docs/research/personal-blog-inspiration.md`, §3 Recommendations), the conversation transcript that produced this spec, and the 2026-04-30 follow-up critique (§10).

---

## 2. Home page — `src/pages/index.astro`

### 2.1 Layout (top to bottom)

1. **Header** — existing component, **redesigned** (see §4). Status pill, avatar, name wordmark all live here now.
2. **Featured post** — single most recent published post. Selectable text, inline-expandable. See §2.3.
3. **Recent (3-up row)** — posts 2–4 (i.e. `posts.slice(1, 4)` after sorting). Same selectable-text pattern. See §2.4.
4. **Activity bar** — existing `ActivityBar` component, 2px tall P1–P5 strip.
5. **Compact widget strip (4-up)** — Read, Listen, Watch, Code in a row. Mobile: 2×2. See §2.5.
6. **Footer** — existing.

**Hero is removed.** No "Hi, I'm Gareth", no avatar block, no intro paragraph. The bio sentence ("Tech tinkerer in Qualicum Beach…") still ships in `<head>` meta description and OG/Twitter tags — but is no longer rendered on the page. Identity cues come from the navbar (avatar + name) and `/about`.

### 2.2 Container widths

Use `--width-content` for the entire `<main>`. The current `--width-wide` outer + `--width-content` inner mismatch is a bug; this redesign closes it. The Featured card, 3-up row, and widget strip all fit comfortably in `--width-content`.

### 2.3 Featured post card — pattern

**Goals:** text is selectable, the user can read 500-ish chars without clicking through, and they can expand the full body in place if they want to read more without leaving the homepage.

**Markup contract (excerpt outside `<details>`; summary is the expand trigger):**

```astro
<article class="gvns-featured" data-post-slug={slug}>
  <header class="gvns-featured__header">
    <span class="gvns-featured__eyebrow">Featured · {primaryTag}</span>
    <time datetime={pubDate.toISOString()} class="gvns-featured__meta">
      {formattedDate} · {readingTime} min read
    </time>
  </header>

  <h2 class="gvns-featured__title">
    <a href={`/posts/${slug}`}>{title}</a>
  </h2>

  <p class="gvns-featured__excerpt">{excerpt500}</p>

  <details class="gvns-featured__body">
    <summary class="gvns-featured__expand">
      <span data-when="closed">Read more ↓</span>
      <span data-when="open">Collapse ↑</span>
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
- When `<details>` is open, the `<Content />` re-renders the same opening paragraphs the excerpt showed. We hide the standalone excerpt when the card is expanded so the same prose doesn't appear twice. CSS: `.gvns-featured:has(details[open]) .gvns-featured__excerpt { display: none; }`. `:has()` has solid 2026 support; with no fallback, the duplication is cosmetic and tolerable.
- The `<summary>` content is intentionally minimal — only the toggle label, no phrasing content that the user might want to select. That keeps interaction crisp.

**Implementation notes:**

- **Excerpt source.** Render the first ~500 characters of `post.body` (Markdown), stripped of frontmatter, clamped to the nearest paragraph or sentence boundary so we never cut a word mid-stream. Helper: `src/utils/excerpt.ts` (new) — `getExcerpt(markdown: string, maxChars = 500): string`. Reuse for any future preview surface.
- **Full body.** Use Astro 6's content layer `render()`: `const { Content } = await render(post)`. The rendered `<Content />` lives inside the `<details>` expanded block. Markdown's existing styles (headings, code blocks, etc.) need to scope to the homepage prose context — wrap in `.prose` and apply the same prose tokens used by `PostLayout.astro`.
- **No JS required.** `<details>` handles open/close, keyboard, ARIA. The "Read more ↓ / Collapse ↑" labels are pure CSS, swapped via `details[open] [data-when="closed"] { display: none }` and its inverse. Strip the default disclosure marker with `summary { list-style: none } summary::-webkit-details-marker { display: none }`.
- **Selectable text.** Removing the absolute stretched anchor (in `HorizontalPostCard.astro` and any new card) is the entire fix. `user-select` defaults to `auto` everywhere; nothing to toggle. The card is no longer a click-target — only the title link and the `<summary>` are.
- **Hover affordance for the card.** Use `:has()` so the card lifts/borders when the title or summary is hovered: `.gvns-featured:has(:is(a:hover, summary:hover)) { box-shadow: …; }`. Falls back gracefully where `:has()` isn't supported.
- **SEO/duplication guardrail.** The post's canonical URL stays on `/posts/<slug>/`. Don't claim `BlogPosting` schema on the homepage Featured — wrap the homepage card in `<article itemscope itemtype="https://schema.org/CreativeWork">` and let the post page own the `BlogPosting` markup. Signals "showcase, see canonical" to crawlers.

**Visual:**

- Container: `background: var(--colour-bg-secondary)`, `border-left: 2px solid var(--colour-p2-rose)`, no top/right/bottom border, radius `0 6px 6px 0`. (Unchanged from previous spec.)
- Eyebrow: `Featured · <primary tag>` in P2 rose caps (`text-xs`, `font-weight: 600`, `letter-spacing: 0.1em`).
- Date + reading time: JetBrains Mono on the right, baseline-aligned with eyebrow.
- Title: Space Grotesk 600, 22px desktop / 20px mobile, line-height 1.25. Title link inherits primary text colour, hover → `--colour-p2-rose-hover`.
- Excerpt: Inter 400, secondary colour, line-height 1.6.
- Expand button: small inline pill (Inter 500 12px, `--colour-p2-rose-hover`), bottom-right of the summary block. No bg, no border — colour + caret carry it.
- Expanded prose: respects `PostLayout` typography tokens. Top spacing of 1rem above the rendered content.
- Permalink line at the bottom of the expanded body: muted Inter 400, P2 rose accent.

### 2.4 Recent posts (3-up) — pattern

The same "no stretched anchor, title-as-link" rule applies. Each card:

- `bg-secondary`, full 1px border, radius 6px, padding ~12px.
- Tag pill (Starwind `Badge` `variant="ghost"`).
- Title: Inter 500, 13–14px (slightly larger than the previous spec's 12–13px to keep the tap target comfortable). The `<h3>` wraps an `<a href={…}>`.
- Date in mono 10px muted.
- Hover: `:has(a:hover)` lifts border to `--colour-border-hover` and brightens the title.
- No description/excerpt at this size — title + tag + date is sufficient.
- Mobile: stack to one column.

### 2.5 Compact widget strip (4-up) — unchanged

- Each cell: `bg-secondary`, full border, **2px top accent in the activity colour** (rose / emerald / amber / violet), radius `0 0 4px 4px` (square top, rounded bottom — top accent reads as a colour bar, not a border).
- Content: tiny caps label (e.g. "READING"), Inter 500 11px primary text (item title), Inter 400 10px secondary (subtitle).
- The `compact` prop already exists in the production home page — confirm each widget honours it; tighten if the rendered output is too tall.
- Mobile: 2×2.

### 2.6 Files

| File | Action |
|---|---|
| `src/pages/index.astro` | Rewrite — drop hero, lead with `<FeaturedPostCard>`, then `<RecentPostsRow>`, then activity bar, then widget strip |
| `src/components/Hero.astro` | **Do not create** — no longer in the design |
| `src/components/FeaturedPostCard.astro` | **New** — rose-accented featured card with `<details>` expand. Renders `<Content />` via Astro 6 `render()`. Internally uses Starwind `Card` primitives where useful; the `<details>` element stays semantic. |
| `src/components/RecentPostsRow.astro` | **New** — 3-up grid wrapper for `MiniPostCard` |
| `src/components/MiniPostCard.astro` | **New** — small card variant. Title-as-link, no stretched anchor. |
| `src/components/HorizontalPostCard.astro` | Edit — drop the absolute stretched-link pattern (`<a class="absolute inset-0">`). Title becomes the link; hover state migrates to `:has(a:hover)`. Used on `/posts` listing. |
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

### 4.6 Data source for status

Hardcode `status: "open"` in `Header.astro` (or pass via prop from `BaseLayout`) for now. When `StatusWidget` becomes the canonical source of truth, the pill subscribes to the same data — see `StatusWidget.astro`. Do **not** duplicate two separate "current status" stores; pick one and have both surfaces read from it.

### 4.7 Files

| File | Action |
|---|---|
| `src/components/Header.astro` | Rewrite — three-cluster layout, brand swap, status pill in right cluster |
| `src/components/MobileNav.svelte` | Edit — accept `statusOpen` prop, render the status pill as the top mobile menu item when true |
| `public/avatar.webp` / `public/avatar.jpg` | No change — already exists, reused at 24px |

---

## 5. Self-description drift fix

With the homepage hero removed, the canonical surfaces for the bio sentence are `/about`, head meta, and OG/Twitter cards. The hero sentence still ships in `<head>` for crawlers and link unfurls — it just isn't rendered visually on `/`.

| Location | Current | New |
|---|---|---|
| `src/pages/index.astro` hero | "Tech Tinkerer based in Qualicum Beach, Canada. I write about homelab, self-hosting, networking, BJJ, and the occasional life observation." | **Removed from page render.** The sentence below moves to `BaseLayout` meta description for `/`. |
| `src/pages/index.astro` `<BaseLayout description={…}>` | "Personal site for writing and shipped work. Serious work, questionable puns." | "Tech tinkerer in Qualicum Beach. I write about homelab, self-hosting, networking, and BJJ." |
| `src/pages/about/index.astro` Profile `jobTitle` | "Web developer · Vancouver Island" | "Tech tinkerer · Qualicum Beach" |
| `src/pages/about/index.astro` body prose | "Hi, I'm Gareth — a web developer based on Vancouver Island, Canada." | Rewrite paragraph to lead with "tech tinkerer" framing. (Keep BJJ, homelab, etc. content as-is.) |
| `BaseLayout` default meta description | (review for consistency) | "Tech tinkerer in Qualicum Beach. Writing about homelab, self-hosting, networking, and BJJ." (used as fallback only; pages that pass an explicit `description` prop continue to override) |
| OG/Twitter card description | (review for consistency) | Same sentence as `BaseLayout` default meta description |

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

1. `/` leads with the Featured post (no hero rendered). 3-up recent posts, activity bar, compact 4-up widget strip below. All within `--width-content`. No production mismatches between outer/inner widths.
2. **Featured card.** Title is a real link (`<a href="/posts/<slug>/">`). Excerpt is selectable text (`getExcerpt(post.body)` ≈500 chars). `<details>` expand reveals the full body via Astro 6 `render()` and shows a `Read full post →` permalink. No JS island used. Keyboard tab-order: title link → expand control → permalink (when open).
3. **Recent post cards.** No absolute stretched anchor. Title links to the post; text inside the card is selectable. `HorizontalPostCard` updated in place; `MiniPostCard` follows the same rule from inception.
4. **Navbar.** Three-cluster justified layout: avatar 24px + "Gareth Evans" wordmark on the left; existing nav links centred; status pill · theme toggle · search on the right. Status pill collapses to dot-only at 768–1023px, hides entirely when status is not `open`. On post pages, breadcrumbs replace the centre cluster as today.
5. `/now` matches C2: heading row with mono date, 2-paragraph prose intro from `src/data/now-intro.md`, existing bento preserved below. Updated date is sourced from frontmatter, not hardcoded.
6. **Self-description drift** is resolved: `/about` Profile + body, BaseLayout default meta, and the homepage's `<BaseLayout description>` prop all use the "Tech tinkerer · Qualicum Beach" framing. Verify OG/Twitter card unfurls render the new sentence.
7. **Accessibility.** `axe-core` clean run on `/` and `/now`. Featured `<details>` operable by keyboard. Status pill has accurate `aria-label`. Avatar in nav has empty `alt` (decorative within a labelled link).
8. **No regression.** Lighthouse (or equivalent) shows no regression in performance, accessibility, best-practices vs current production. Bundle size for `/` shrinks (no Hero, no JS for expand).
9. All changes pass `npm run build` cleanly. No new console warnings.

---

## 8. Implementation order (suggested)

PR 1 — **Self-description drift** (pure copy edits, low risk; unblocks meta fix).
PR 2 — **Navbar redesign** (Header.astro rewrite, MobileNav update, status pill, brand swap). Visible site-wide change, ships independently of homepage rebuild.
PR 3 — **`/now` prose intro** (additive, doesn't change the bento).
PR 4 — **Featured card pattern + excerpt utility** (`FeaturedPostCard.astro`, `src/utils/excerpt.ts`). Can be unit-tested via a Storybook-equivalent route or just visual review.
PR 5 — **Recent post cards refactor** (`MiniPostCard.astro`, drop stretched-link in `HorizontalPostCard.astro`). Touches `/posts` listing too — call it out in the PR description.
PR 6 — **Home page rebuild** (`src/pages/index.astro`). Drops hero, wires PR 4 + PR 5 components, sets the new `BaseLayout description` prop.
PR 7 — **CMS wiring for `now-intro.md`** (quality-of-life follow-up; can ship after the page is live).

Each step is small enough to be its own PR. Branching off `main`, expected to take ~1–2 dev sessions per item depending on widget polish. PRs 1–3 are independent and can ship in any order; PR 6 depends on PRs 4–5; PR 7 depends on PR 3.

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

## 10. Revision history

**2026-04-30 — featured-card pattern + nav redesign + hero drop.**

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
