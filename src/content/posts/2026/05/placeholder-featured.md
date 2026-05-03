---
title: Placeholder featured post
description: Temporary content used to verify the home page Featured + Recents layout renders correctly.
pubDate: 2026-05-04
tags: [meta]
draft: false
---

This is a placeholder post created to verify the home page layout end-to-end. It exercises `FeaturedPostCard` on `/` so we can see the brutalist top-stripe treatment, the eyebrow tag, the title, the excerpt, and the `keep reading ↓` toggle in their real position above the recents row and the activity widget strip.

The body has a few sentences so the excerpt utility has something to clamp. Boundary-aware truncation should pick a paragraph break first, then fall back to a sentence break, then to a word break — never mid-word. Selecting text by click-drag inside this paragraph must not toggle the `<details>` disclosure, because the excerpt sits outside it.

## A heading

A second paragraph adds a little more body so the expanded view has something to show. When the disclosure opens, the excerpt above is hidden via `:has(details[open])` and this expanded content takes its place.

Delete this file once real posts are flowing through Sveltia CMS.
