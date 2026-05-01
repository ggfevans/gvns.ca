# Home + /now redesign — April 2026

**Status:** Spec, awaiting implementation
**Drafted:** 2026-04-29
**Companion docs:** `docs/research/personal-blog-inspiration.md`, `docs/research/mitchellh-com-analysis.md`
**Mockups referenced:** B1 (home, compact widget strip) + C2 (`/now`, short prose intro + bento)

---

## 1. Decision summary

| Question | Decision |
|---|---|
| Home pairing | **B1** — lite merge, compressed identity hero, featured post, 3-up recent, activity bar, compact 4-up widget strip |
| `/now` pairing | **C2** — short prose intro + freshness date, existing bento layout preserved below |
| Status pill | **Nav, right-cluster.** Sky dot + "Open to freelance work" text, 1px zinc-700 border, faint sky-tinted bg. **Clickable, links to `/contact`.** Site-wide, persists on post pages where center-of-nav is breadcrumbs. |
| `/about` | Stays separate (lite merge). Home gets a 2-sentence prose intro; deep bio + Timeline stay on `/about`. |
| `/now` archive | Single mutable page for this round. **Harper-style dated content collection deferred** to a follow-up issue (see §6). |
| Bio prose policy | Bio / hero / `/now` intro prose stays human-written. Live data only via widgets, never interpolated into prose. (See `feedback_gvns_bio_static.md` in Claude memory.) |
| Self-description | Standardised on **"Tech tinkerer · Qualicum Beach"** across home hero, `/about` Profile, BaseLayout meta description. |

Decision rationale lives in the inspiration scan (`docs/research/personal-blog-inspiration.md`, §3 Recommendations) and in the conversation transcript that produced this spec.

---

## 2. Home page — `src/pages/index.astro`

### Layout (top to bottom)

1. **Header** — existing component, with status-pill addition (see §4).
2. **Hero (compressed)** — avatar 56px (left) + heading + intro prose (right), single row at desktop, stacked on mobile.
   - `<h1>` "Hi, I'm Gareth." — Space Grotesk 600, ~20px desktop, letter-spacing -0.02em.
   - Intro: one sentence in Inter 400, secondary text colour: *"Tech tinkerer in Qualicum Beach. I write about homelab, self-hosting, networking, and BJJ — pointers to writing, /now, and contact."*
   - `writing`, `/now`, `contact` are inline links (zinc-100 with zinc-700 underline-color).
3. **Featured post** — single most recent published post.
   - Container: `background: var(--colour-bg-secondary)`, `border-left: 2px solid var(--colour-p2-rose)`, no top/right/bottom border, radius `0 6px 6px 0`.
   - Top row: section label `Featured · <category>` in P2 rose caps (`text-xs`, `font-weight: 600`, `letter-spacing: 0.1em`); date + reading time in JetBrains Mono on the right.
   - Title: Space Grotesk 600, 22px desktop / 20px mobile, line-height 1.25.
   - Description: post `description` field, Inter 400, secondary colour, line-height 1.55.
   - "Read more →" in `--colour-p2-rose-hover` (the lighter rose).
4. **Recent (3-up row)** — posts 2–4 (i.e. `posts.slice(1, 4)` after sorting).
   - Section label "Recent" in muted caps above the row.
   - Each card: `bg-secondary`, full 1px border, radius 6px, padding ~12px. Tag in muted caps; title in Inter 500 12–13px; date in mono 10px muted.
   - Mobile: stack to one column.
5. **Activity bar** — existing `ActivityBar` component, 2px tall P1–P5 strip.
6. **Compact widget strip (4-up)** — Read, Listen, Watch, Code in row. Mobile: 2×2.
   - Each cell: `bg-secondary`, full border, **2px top accent in the activity colour** (rose / emerald / amber / violet), radius `0 0 4px 4px` (square top, rounded bottom — top accent reads as a colour bar, not a border).
   - Content: tiny caps label (e.g. "READING"), Inter 500 11px primary text (item title), Inter 400 10px secondary (subtitle).
   - This requires a `compact` mode on `ReadWidget` / `ListenWidget` / `WatchWidget` / `CodeWidget`. The `compact` prop already exists in the production home page — confirm each widget honours it; tighten if the rendered output is too tall.
7. **Footer** — existing.

### Container widths

The current `.home` uses `--width-wide` outer with `--width-content` inner — one of the bugs in the existing layout. **Pick one and use it consistently for the redesign.** Recommended: `--width-content` for the whole page; the home is text-led and doesn't need the wide container. The 3-up row and widget strip both fit comfortably in `--width-content`.

### Files

| File | Action |
|---|---|
| `src/pages/index.astro` | Rewrite |
| `src/components/Hero.astro` | **New** — compressed identity row component (or inline in `index.astro` if no reuse) |
| `src/components/FeaturedPostCard.astro` | **New** — rose-accented featured card |
| `src/components/RecentPostsRow.astro` | **New** — 3-up grid wrapper for `HorizontalPostCard` (or a smaller `MiniPostCard`) |
| `src/components/HorizontalPostCard.astro` | Possibly retire or repurpose for `/posts` listing only |
| `src/components/widgets/{Read,Listen,Watch,Code}Widget.astro` | Verify `compact` mode renders to spec; adjust if needed |

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

## 4. Status pill — `src/components/Header.astro`

### Behaviour

- New element in the right cluster of the desktop nav, between the existing nav links and the `ThemeToggle` + `Search`.
- Renders only when status is `open` (initial state). When status is anything else, the pill is **suppressed entirely** — design avoids the awkward "closed for work" pill.
- Wraps an `<a href="/contact">` so the whole pill is clickable; `aria-label` reads "Open to freelance work — contact me".
- Mobile: the pill moves into the mobile menu (under `MobileNav`) as a top item, so it doesn't crowd the mobile header bar.

### Markup sketch

```html
<a class="gvns-status-pill" href="/contact" aria-label="Open to freelance work — contact me">
  <span class="gvns-status-pill__dot" aria-hidden="true"></span>
  <span class="gvns-status-pill__label">Open to freelance work</span>
</a>
```

### Styling

- `display: inline-flex; align-items: center; gap: 0.375rem`
- `padding: 0.1875rem 0.625rem`
- `border: 1px solid var(--colour-border)`; `border-radius: 9999px`
- Background: `rgb(14 165 233 / 0.06)` (sky-tinted)
- Label colour: `var(--colour-text-secondary)`; on hover, transition to `var(--colour-text-primary)`
- Dot: 6×6 circle, `background: var(--colour-p5-sky)`

### Data source

For now: hardcode `status: "open"` in `Header.astro` (or pass via prop from `BaseLayout`). When `StatusWidget` becomes the canonical source of truth, the pill can subscribe to the same data — see `StatusWidget.astro`. Do **not** duplicate two separate "current status" stores; pick one and have both surfaces read from it.

---

## 5. Self-description drift fix

| Location | Current | New |
|---|---|---|
| `src/pages/index.astro` hero | "Tech Tinkerer based in Qualicum Beach, Canada. I write about homelab, self-hosting, networking, BJJ, and the occasional life observation." | "Tech tinkerer in Qualicum Beach. I write about homelab, self-hosting, networking, and BJJ — pointers to writing, /now, and contact." |
| `src/pages/about/index.astro` Profile `jobTitle` | "Web developer · Vancouver Island" | "Tech tinkerer · Qualicum Beach" |
| `src/pages/about/index.astro` body prose | "Hi, I'm Gareth — a web developer based on Vancouver Island, Canada." | Rewrite paragraph to lead with "tech tinkerer" framing. (Keep BJJ, homelab, etc. content as-is.) |
| `BaseLayout` default meta description | (review for consistency) | Reuse the home hero sentence verbatim |

---

## 6. Out of scope for this round

- **Harper-style dated `/now` archive.** A `now` content collection alongside `posts`, with `/now/YYYY-MM-DD/` per snapshot and a `<details>` archive on `/now`. File a follow-up issue once the single-mutable `/now` is stable. Recommended for a 2026-Q3 pass.
- **Brandur-style content-type taxonomy** (Atoms / Fragments / Articles). Worth considering when gvns.ca grows multiple writing kinds; currently posts are one bucket and that's fine.
- **apenwarr-style "Related / Unrelated" footer link clusters** on posts. Nice serendipity move; separate from the home/now redesign.
- **Lee Robinson's inline last-played sentence in bio.** Considered and declined — bio prose stays static, widgets carry live signal (see `feedback_gvns_bio_static.md`).

---

## 7. Acceptance criteria

The redesign ships when:

1. `/` matches B1: hero compressed, featured post in P2 rose, 3-up recent posts, activity bar, compact 4-up widget strip, all within `--width-content`. No production mismatches between outer/inner widths.
2. `/now` matches C2: heading row with mono date, 2-paragraph prose intro from `src/data/now-intro.md`, existing bento preserved below. Updated date is sourced from frontmatter, not hardcoded.
3. Status pill renders in the nav right-cluster site-wide (desktop), mobile menu top item (mobile), only when status is `open`. Clicking the pill navigates to `/contact`. Pill suppresses cleanly when status is anything else.
4. Self-description drift is resolved: home hero, `/about` Profile + body, and BaseLayout meta all use the "Tech tinkerer · Qualicum Beach" framing.
5. Lighthouse (or equivalent) shows no regression in performance, accessibility, best-practices vs current production.
6. All changes pass `npm run build` cleanly. No new console warnings.

---

## 8. Implementation order (suggested)

1. **Status pill in Header** — small, isolated, gives an immediate visible win and unblocks self-description fixes.
2. **Self-description drift** — pure copy edits, low risk.
3. **`/now` prose intro** — additive, doesn't change the bento. Ships independently.
4. **Home page rebuild** — biggest piece. Best done with the upstream pieces (status pill, prose) already in place.
5. **CMS wiring for `now-intro.md`** — quality-of-life follow-up; can ship after the page is live.

Each step is small enough to be its own PR. Branching off `main`, expected to take ~1–2 dev sessions per item depending on widget polish.
