# gvns.ca Design System

## Colour Palette

Based on GVNS Brand Guide v1.1. Dark-first, light-available. Colours are functional first, decorative second.

### Base Colours — Dark Theme (Default)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--colour-bg-primary` | `#0f1114` | `15, 17, 20` | Page background |
| `--colour-bg-secondary` | `#1a1d23` | `26, 29, 35` | Cards, elevated surfaces |
| `--colour-bg-tertiary` | `#252a33` | `37, 42, 51` | Hover states, code blocks |
| `--colour-border` | `#2e3440` | `46, 52, 64` | Subtle borders, dividers |

### Base Colours — Light Theme

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--colour-bg-primary` | `#f8f9fa` | `248, 249, 250` | Page background |
| `--colour-bg-secondary` | `#ffffff` | `255, 255, 255` | Cards, elevated surfaces |
| `--colour-bg-tertiary` | `#e9ecef` | `233, 236, 239` | Hover states, code blocks |
| `--colour-border` | `#dee2e6` | `222, 226, 230` | Subtle borders, dividers |

### Text Colours

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--colour-text-primary` | `#eceff4` | `#1a1d23` | Body text, headings |
| `--colour-text-secondary` | `#a3aab5` | `#4a5568` | Secondary text, captions |
| `--colour-text-muted` | `#6b7280` | `#718096` | Timestamps, metadata |

### Accent Colours

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--colour-accent-primary` | `#4a7c59` | `74, 124, 89` | Primary actions, links, focus |
| `--colour-accent-hover` | `#5d9a6e` | `93, 154, 110` | Hover state for primary |
| `--colour-accent-secondary` | `#8fbc8f` | `143, 188, 143` | Secondary highlights, tags |
| `--colour-accent-warm` | `#c9a959` | `201, 169, 89` | Warmth, warnings, variety |

### Semantic Colours

| Token | Hex | Usage |
|-------|-----|-------|
| `--colour-success` | `#4a7c59` | Success states (maps to primary) |
| `--colour-warning` | `#c9a959` | Warning states |
| `--colour-error` | `#bf616a` | Error states |
| `--colour-info` | `#81a1c1` | Informational states |

### Colour Rationale

**Forest green (`#4a7c59`)** is the signature:
- Desaturated enough to not vibrate on dark backgrounds
- Warm enough to feel organic, not clinical
- Underused in tech (differentiator)

**Warm gold (`#c9a959`)** provides contrast:
- Think aged brass, not caution tape
- Pairs beautifully with the green
- Adds sophistication without competing

### Contrast & Accessibility

WCAG AA requires 4.5:1 for normal text, 3:1 for large text/UI components.

| Pairing | Ratio | Status |
|---------|-------|--------|
| Primary text on dark bg | 16.3:1 | ✓ Pass |
| Primary text on light bg | 14.8:1 | ✓ Pass |
| Forest green on dark bg | 3.89:1 | ⚠ Large text/UI only |
| Link text green on dark bg | 5.1:1 | ✓ Pass (body text safe) |
| Warm gold on dark bg | 8.38:1 | ✓ Pass |
| Warm gold on light bg | 2.14:1 | ✗ Avoid for text |

**Usage guidance:**
- Forest green (`#4a7c59`): Safe for large text (18px+), UI components, and decorative elements on dark backgrounds
- Link text (`#5d9a6e`): Use `--colour-link-text` for body/prose links — passes 4.5:1 for normal text (alias: `--color-link-text`)
- Warm gold (`#c9a959`): Use only on dark backgrounds for text; decorative only on light

## Typography

### Font Stack

```css
:root {
  /* Primary — clean, readable, no external requests */
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 
    "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  
  /* Monospace — for code blocks */
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, 
    "Liberation Mono", monospace;
}
```

### Type Scale

Based on 1.25 ratio (Major Third) with 16px base.

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `--text-xs` | 0.75rem (12px) | 1.5 | Captions, metadata |
| `--text-sm` | 0.875rem (14px) | 1.5 | Secondary text |
| `--text-base` | 1rem (16px) | 1.6 | Body text |
| `--text-lg` | 1.125rem (18px) | 1.6 | Lead paragraphs |
| `--text-xl` | 1.25rem (20px) | 1.4 | H4, card titles |
| `--text-2xl` | 1.5rem (24px) | 1.3 | H3 |
| `--text-3xl` | 1.875rem (30px) | 1.25 | H2 |
| `--text-4xl` | 2.25rem (36px) | 1.2 | H1, page titles |
| `--text-5xl` | 3rem (48px) | 1.1 | Hero text |

### Font Weights

| Token | Weight | Usage |
|-------|--------|-------|
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Emphasis, labels |
| `--font-semibold` | 600 | Subheadings |
| `--font-bold` | 700 | Headings, strong |

### Prose Styling

For blog content, custom prose styles are defined in `global.css` (not using `@tailwindcss/typography`):

```css
.prose {
  line-height: 1.7;
}

.prose a {
  color: var(--colour-link-text); /* #5d9a6e - passes 4.5:1 for body text */
}

.prose blockquote {
  border-left: 3px solid var(--colour-accent-primary);
  color: var(--colour-text-secondary);
}

.prose pre, .prose code {
  background: var(--colour-bg-tertiary);
}
```

## Spacing

Based on 4px grid (0.25rem).

| Token | Value | Pixels |
|-------|-------|--------|
| `--space-1` | 0.25rem | 4px |
| `--space-2` | 0.5rem | 8px |
| `--space-3` | 0.75rem | 12px |
| `--space-4` | 1rem | 16px |
| `--space-5` | 1.25rem | 20px |
| `--space-6` | 1.5rem | 24px |
| `--space-8` | 2rem | 32px |
| `--space-10` | 2.5rem | 40px |
| `--space-12` | 3rem | 48px |
| `--space-16` | 4rem | 64px |
| `--space-20` | 5rem | 80px |
| `--space-24` | 6rem | 96px |

### Layout Spacing

| Context | Value | Rationale |
|---------|-------|-----------|
| Section padding | `--space-16` / `--space-24` | Generous breathing room |
| Card padding | `--space-4` / `--space-6` | Comfortable but compact |
| Stack gap (text) | `--space-4` | Readable paragraph spacing |
| Stack gap (cards) | `--space-6` / `--space-8` | Visual separation |
| Inline gap | `--space-2` / `--space-3` | Tight grouping |

## Layout

### Container Widths

```css
:root {
  --width-content: 65ch;      /* Prose content — optimal reading */
  --width-wide: 80rem;        /* Wide content — cards, grids */
  --width-full: 100%;         /* Full bleed */
}
```

### Breakpoints

Using Tailwind defaults:

| Name | Width | Usage |
|------|-------|-------|
| `sm` | 640px | Large phones landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Grid

```css
/* Blog listing, projects */
.grid-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-6);
}

/* Two-column layout (about page) */
.grid-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-8);
}

@media (min-width: 768px) {
  .grid-split {
    grid-template-columns: 1fr 2fr;
  }
}
```

## Components

### Links

```css
a {
  color: var(--colour-accent-primary);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 2px;
  transition: text-decoration-color 150ms ease;
}

a:hover {
  text-decoration-color: var(--colour-accent-primary);
}

a:focus-visible {
  outline: 2px solid var(--colour-accent-primary);
  outline-offset: 2px;
  border-radius: 2px;
}
```

### Buttons

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-weight: var(--font-medium);
  border-radius: 4px;
  transition: all 150ms ease;
}

.btn-primary {
  background: var(--colour-accent-primary);
  color: var(--colour-bg-primary);
}

.btn-primary:hover {
  background: var(--colour-accent-hover);
}

.btn-ghost {
  background: transparent;
  color: var(--colour-text-primary);
  border: 1px solid var(--colour-border);
}

.btn-ghost:hover {
  background: var(--colour-bg-secondary);
}
```

### Cards

```css
.card {
  background: var(--colour-bg-secondary);
  border-radius: 8px;
  padding: var(--space-6);
  border: 1px solid var(--colour-border);
  transition: border-color 150ms ease;
}

.card:hover {
  border-color: var(--colour-accent-primary);
}
```

### Tags

```css
.tag {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: var(--colour-bg-tertiary);
  color: var(--colour-accent-secondary);
  border-radius: 4px;
}
```

### Code Blocks

Syntax highlighting is handled by Shiki (Astro's default). Currently using Astro's default theme (`github-dark`). To customize, add `markdown.shikiConfig.theme` in `astro.config.mjs`:

```javascript
// astro.config.mjs
export default defineConfig({
  markdown: {
    shikiConfig: {
      theme: 'github-dark', // or 'dracula', 'nord', etc.
    },
  },
});
```

Additional styling in `global.css`:

```css
pre {
  background: var(--colour-bg-tertiary);
  border: 1px solid var(--colour-border);
  padding: var(--space-4);
  border-radius: 6px;
  overflow-x: auto;
  font-size: var(--text-sm);
  line-height: 1.7;
}

code {
  font-family: var(--font-mono);
}

/* Inline code */
:not(pre) > code {
  background: var(--colour-bg-tertiary);
  padding: 0.125em 0.375em;
  border-radius: 4px;
  font-size: 0.9em;
}
```

## Motion

### Transitions

```css
:root {
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Icons

Use [Lucide](https://lucide.dev/) icons via `astro-icon` or inline SVG.

- Size: 20px default, 16px small, 24px large
- Stroke width: 2px
- Colour: `currentColor` (inherits text colour)

---

*Last updated: 2026-01-02*
