---
title: A measured note on rectangular things
description: Sandbox fixture used to demo the FeaturedPostCard component during PR review.
pubDate: 2026-05-01
tags: [meta]
draft: true
---

This is the opening paragraph of a fixture post used to exercise the `FeaturedPostCard` component. It contains enough copy to push past the 500-character excerpt threshold so we can verify boundary-aware truncation behaves the way the spec calls for. The card itself stays still — the type does the talking — and the excerpt should clamp at a paragraph boundary if one is reachable, otherwise step down to a sentence break, otherwise to a word break.

Below the excerpt sits a hairline footer and the `<details>` summary acts as the toggle. Selecting text inside this paragraph by click-drag must not toggle the disclosure, because the excerpt lives outside `<details>`.

## A heading inside the body

When the disclosure is open, this content appears beneath the excerpt slot (which is hidden via `:has(details[open])`). The expanded body inherits `prose` typography so headings, paragraphs, lists, and code blocks all look the way they do on a normal post page.

```ts
// Code blocks should render normally inside the expanded view.
function add(a: number, b: number): number {
  return a + b;
}
```

A short list of things this fixture verifies:

- Eyebrow shows tag plus ISO date with no "Featured" prefix anywhere
- Title is a real anchor — keyboard tab order: title link, then summary, then permalink when open
- Hovering either the title link or the summary tints the title to rose-hover
- Mono surfaces (date, reading time, cue) keep `letter-spacing: 0.02em`

The permalink at the bottom links back to the canonical `/posts/<slug>/` page so crawlers see "this is a showcase, see canonical" rather than two competing `BlogPosting` objects fighting for the same primary entity.
