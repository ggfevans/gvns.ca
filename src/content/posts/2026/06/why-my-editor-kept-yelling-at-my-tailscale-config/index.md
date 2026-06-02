---
title: Why My Editor Kept Yelling at My Tailscale Config
description: HuJSON is JSON with comments and trailing commas. My editor disagreed, so I wrote a Zed grammar for it
pubDate: 2026-06-01
tags:
  - open-source,zed,hujson,project
updatedDate: ''
draft: false
heroImage: ''
heroImageAlt: ''
canonicalUrl: ''
---

Tailscale keeps its ACL policy in a file written in HuJSON, which is plain JSON plus two human comforts: C-style comments and trailing commas. Those are the two things that make a config file pleasant to edit by hand, and they are also the two things every default JSON parser treats as a syntax error. So every time I opened my tailnet's policy, my editor lit it up with red squiggles, gave up on code folding, and dropped the document outline. The file was correct. The editor just had no grammar for the format and was quietly trying to parse human-friendly config as strict JSON.

So I wrote one. zed-hujson is a small Zed extension backed by a dedicated Tree-sitter grammar I forked from tree-sitter-json, with essentially one meaningful change: let the commas trail. That is enough to get real highlighting, comment toggling with Cmd+/, bracket matching, and an outline back, without reaching for something looser like JSON5 that would also wave through unquoted keys and stop catching genuine mistakes. It is deliberately narrow. It does one job for one format, and that format happens to be the one I reach for most. If you edit Tailscale ACLs in Zed, it is yours, MIT licensed, over at [github.com/ggfevans/zed-hujson](https://github.com/ggfevans/zed-hujson).
