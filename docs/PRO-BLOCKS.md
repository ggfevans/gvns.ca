# Starwind Pro Blocks — Adoption Guide

Personal memo. Solo author. Future-me, read this before adopting another Pro block.

## The rule

**Fork on adopt.** When a Pro block makes the cut for the site, copy it into a project-prefixed component (e.g. `Footer.astro`, `Profile.astro`) and never import directly from `src/components/starwind-pro/`. Keep the upstream reference dir for any actively-forked block so you can diff against future Starwind releases.

Three patterns existed historically; only one is canonical going forward:

| Pattern | Status | Example |
| --- | --- | --- |
| Fork into project component | **Canonical** | `Footer.astro`, `Profile.astro` |
| Reimplement-from-pattern (`gvns-` classes only) | Allowed when no Pro markup is reused | `/now` bento, `HorizontalPostCard.astro` (Blog 6 pattern) |
| Direct import from `starwind-pro/` | **Forbidden** | (none — Profile1 was the last; forked in #323) |

## Add a new Pro block (5 steps)

1. **Install the reference.** With `STARWIND_LICENSE_KEY` in `.env.local`:

   ```bash
   npx starwind@latest add @starwind-pro/<block-id>
   ```

   Reference lands at `src/components/starwind-pro/<block-id>/`.

2. **Create the project component.** Copy the relevant file out and rename to a project-prefixed PascalCase component (e.g. `src/components/Hero.astro`). Add the lineage header (see below). Adjust styling in-place — no fork is read-only.

3. **Wire it in + map tokens.** Update the consuming page/layout. If the block introduces new Starwind CSS variables, bridge them in `src/styles/starwind.css` using the existing `--card`, `--primary`, `--muted-foreground` → `--colour-*` pattern.

4. **Update the registry below.**

5. **Write an ADR** in `docs/DECISIONS.md` if the layout intent or token mapping is non-obvious. Skip for trivial 1:1 adoptions.

## Update an adopted Pro block (3 steps)

When upstream Starwind ships a new version of a block you've adopted:

1. **Re-fetch the reference.** `npx starwind@latest add @starwind-pro/<block-id>` — overwrites the reference dir in place.

2. **Diff against your fork.**

   ```bash
   git diff src/components/starwind-pro/<block-id>/
   ```

   Compare against the corresponding project component.

3. **Decide and record.** Port useful changes into the project component, or note `upstream change skipped, reason X` in the registry row. Bump `Last upstream sync` in the project component's lineage header.

Trigger: any project component whose `Last upstream sync` is older than ~6 months is due for a re-check.

## Lineage header convention

Every project component derived from a Pro block opens with this comment block:

```astro
---
/**
 * Project component derived from @starwind-pro/<block-id>.
 * Reference: src/components/starwind-pro/<block-id>/<File>.astro
 * ADR: docs/DECISIONS.md#adr-XXX
 * Last upstream sync: YYYY-MM-DD
 */
---
```

For pattern-only adoptions (no Pro markup carried forward — e.g. `HorizontalPostCard.astro`), use:

```astro
---
/**
 * Layout pattern adapted from @starwind-pro/<block-id>; markup is bespoke
 * (`gvns-`-flavoured), no upstream sync required.
 * ADR: docs/DECISIONS.md#adr-XXX
 */
---
```

## Registry

| Pro block | Project component | Reference dir | ADR |
| --- | --- | --- | --- |
| `@starwind-pro/blog-06` | `src/components/HorizontalPostCard.astro` | (none — pattern only) | ADR-016 |
| `@starwind-pro/feature-13` | `src/pages/now/index.astro` (pattern only) | (none — deleted in #323) | ADR-017 |
| `@starwind-pro/footer-01` | `src/components/Footer.astro` | (none — deleted in #323) | ADR-018 |
| `@starwind-pro/profile-01` | `src/components/Profile.astro` | `src/components/starwind-pro/profile-01/` | ADR-019 |

## Primitives (separate concern)

Starwind primitives in `src/components/starwind/` (button, card, badge, etc.) are version-tracked through `starwind.config.json` and updated via `npx starwind@latest add <name>`. They are not subject to the fork-on-adopt rule — use them directly via `@/components/starwind/*`.

## Licensing

`STARWIND_LICENSE_KEY` is required in `.env.local` for any `npx starwind@latest add @starwind-pro/*` command. Documented in `.env.example`. CI does not need the key — installed components and reference dirs are committed.
