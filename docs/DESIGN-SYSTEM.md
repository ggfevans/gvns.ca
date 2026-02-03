# gvns.ca Design System

## Colour Palette

Based on the GVNS site spec. Dark-first, light-available. Each activity section has a dedicated accent colour for visual wayfinding.

### Neutrals — Dark Theme (Default)

| Role | Tailwind | Hex | Usage |
|------|----------|-----|-------|
| Background | `zinc-950` | `#09090b` | Page background |
| Surface | `zinc-900` | `#18181b` | Card backgrounds |
| Elevated | `zinc-800` | `#27272a` | Borders, secondary surfaces |
| Divider | `zinc-700` | `#3f3f46` | Tertiary elements, dividers |

### Neutrals — Light Theme

| Role | Tailwind | Hex | Usage |
|------|----------|-----|-------|
| Background | `white` | `#ffffff` | Page background |
| Surface | `zinc-100` | `#f4f4f5` | Card backgrounds |
| Elevated | `zinc-200` | `#e4e4e7` | Borders, secondary surfaces |
| Divider | `zinc-300` | `#d4d4d8` | Tertiary elements, dividers |
| Footer BG | `zinc-50` | `#fafafa` | Subtle surface variation |

### Text Hierarchy

| Role | Dark | Light | Usage |
|------|------|-------|-------|
| Primary | `zinc-100` | `zinc-950` | Headings, important text |
| Secondary | `zinc-200` | `zinc-900` | Subheadings |
| Body | `zinc-400` | `zinc-600` | Body text, descriptions |
| Muted | `zinc-500` | `zinc-500` | Labels, metadata (same both modes) |
| Subtle | `zinc-600` | `zinc-400` | Timestamps, tertiary |

### Accent Colours (P1–P5)

Each activity section has a dedicated colour. Maintain this consistently.

| Name | Activity | Dark (500) | Light (600) | BG tint (50) |
|------|----------|------------|-------------|--------------|
| **Violet** | Code, primary brand | `#8b5cf6` | `#7c3aed` | `#f5f3ff` |
| **Rose** | Read | `#f43f5e` | `#e11d48` | `#fff1f2` |
| **Emerald** | Listen | `#10b981` | `#059669` | `#ecfdf5` |
| **Amber** | Write, Watch | `#f59e0b` | `#d97706` | `#fffbeb` |
| **Sky** | Status indicators | `#0ea5e9` | `#0284c7` | `#f0f9ff` |

### Colour Discipline

> **Critical:** Each activity type has a specific colour. Never mix them.
>
> - Code → Violet
> - Read → Rose
> - Listen → Emerald
> - Watch → Amber
> - Write → Amber
> - Status → Sky

### Interactive States

**Hover:**
- Text links: body colour → accent colour (e.g., `zinc-600` → `violet-600`)
- Cards: Subtle shadow increase + light accent glow
- Buttons: accent-600 → accent-700 (light), accent-500 → accent-400 (dark)

**Selection:**
- Dark: `violet-500/20` background, `violet-300` text
- Light: `violet-100` background, `violet-900` text

**Focus rings:**
- `ring-2 ring-{accent}-600 ring-offset-2` (light)
- `ring-2 ring-{accent}-500 ring-offset-2` (dark)
- Match activity accent colour at 50% opacity

### Contrast & Accessibility

WCAG AA requires 4.5:1 for normal text, 3:1 for large text/UI components.

**Text on dark (`zinc-950`) background:**

| Pairing | Ratio | Status |
|---------|-------|--------|
| `zinc-100` on `zinc-950` | 15.8:1 | AAA ✓ |
| `zinc-400` on `zinc-950` | 7.2:1 | AA ✓ |
| `violet-400` on `zinc-950` | 5.1:1 | AA ✓ |

**Text on light (`white`) background:**

| Pairing | Ratio | Status |
|---------|-------|--------|
| `zinc-950` on white | 19.2:1 | AAA ✓ |
| `zinc-600` on white | 7.5:1 | AA ✓ |
| `violet-600` on white | 5.8:1 | AA ✓ |
| `rose-600` on white | 6.4:1 | AA ✓ |
| `emerald-600` on white | 4.9:1 | ⚠ Large text only |
| `amber-600` on white | 4.2:1 | ⚠ Large text only |

**Usage guidance:**
- For small text on white, use darker variants if needed (`emerald-700`, `amber-700`)
- Accent colours work well for large text (headings, buttons) and accent strips
- Always pair accent colours with sufficient surrounding contrast

## Typography

### Font Stack

```css
:root {
  /* Primary — Inter (self-hosted) */
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  /* Monospace — JetBrains Mono (self-hosted) */
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo,
    Consolas, "Liberation Mono", monospace;
}
```

### Type Scale

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 1.3 | Labels, metadata |
| `text-sm` | 14px | 1.4 | Card content |
| `text-base` | 16px | 1.5 | Body |
| `text-lg` | 18px | 1.5 | Lead paragraphs |
| `text-xl` | 20px | 1.4 | H4, card titles |
| `text-2xl` | 24px | 1.3 | H3 |
| `text-4xl` | 36px | 1.2 | Section titles |
| `text-5xl` | 48px | 1.1 | Page titles |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, UI elements |
| `font-semibold` | 600 | Subheadings, links |
| `font-bold` | 700 | Headings, emphasis |

### Letter Spacing

- Uppercase labels: `tracking-wider` (0.05em)
- Headings: `tracking-tight` (-0.025em)
- Body: default

### Prose Styling

Custom prose styles in `global.css` (not using `@tailwindcss/typography`):

```css
.prose a {
  /* Use accent colour with sufficient contrast for body text */
  color: var(--colour-link-text);
}

.prose blockquote {
  border-left: 3px solid currentAccentColor;
  color: zinc-400 / zinc-600;
}

.prose pre, .prose code {
  background: zinc-800 / zinc-100;
}
```

## Spacing

Based on Tailwind's default spacing scale (4px base).

| Token | Value | Pixels |
|-------|-------|--------|
| `gap-2` | 0.5rem | 8px |
| `gap-3` | 0.75rem | 12px |
| `gap-4` | 1rem | 16px |
| `gap-6` | 1.5rem | 24px |
| `gap-8` | 2rem | 32px |
| `gap-12` | 3rem | 48px |

### Layout Spacing

| Context | Value | Rationale |
|---------|-------|-----------|
| Section padding | `py-16` / `py-24` | Generous breathing room |
| Card padding | `p-4` / `p-6` | Comfortable but compact |
| Stack gap (text) | `gap-4` | Readable paragraph spacing |
| Stack gap (cards) | `gap-6` / `gap-8` | Visual separation |
| Inline gap | `gap-2` / `gap-3` | Tight grouping |

## Layout

### Container

- Max width: 1280px (`max-w-6xl`)
- Horizontal padding: 24px (`px-6`)
- Centred: `mx-auto`

### Breakpoints

Using Tailwind defaults:

| Name | Width | Usage |
|------|-------|-------|
| `sm` | 640px | Large phones landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Grid System

12-column grid with `gap-6` (24px). Responsive:
- Mobile: < 768px (single column)
- Tablet: 768px–1024px
- Desktop: > 1024px

## Components

### Navigation Bar

- Sticky top, z-index 50
- Dark: `bg-zinc-950`, `border-zinc-800` bottom border
- Light: `bg-white`, `border-zinc-200` bottom border
- Height: 64px (`h-16`)
- Logo: Violet rounded square (32×32) with "G" initial
- Nav links: `zinc-400`/`zinc-600`, hover → `zinc-100`/`zinc-950`
- Active link: `zinc-100`/`zinc-950`, `font-semibold`
- Links: About, Work, Write, Now

### Cards

```
bg-zinc-900 dark / bg-zinc-100 light
border: 1px zinc-800 / zinc-200
border-radius: 12px (rounded-xl)
coloured left accent: 1px wide, full height, activity colour
padding: 24px (p-6)
hover: subtle glow (shadow-lg shadow-{colour}-500/5 dark, shadow-{colour}-600/10 light)
transition: all 300ms ease
```

**Card Header Pattern:**
- Label: uppercase, `text-xs`, `font-bold`, `zinc-500`, `tracking-wider`
- Title: `text-base` or `text-lg`, `font-bold`, `zinc-100`/`zinc-950`
- Description: `text-sm`, `zinc-400`/`zinc-600`

### Buttons

**Primary:**
- Dark: `bg-violet-500`, hover `bg-violet-400`, `text-white`
- Light: `bg-violet-600`, hover `bg-violet-700`, `text-white`
- `font-semibold`, `px-4 py-2`, `rounded-md`

**Secondary:**
- Dark: `bg-transparent`, `border-zinc-700`, `text-zinc-100`
- Light: `bg-zinc-100`, `border-zinc-300`, `text-zinc-950`

### Links

- Dark: `text-zinc-400`, hover `text-zinc-100` (nav) or `text-violet-400` (accent)
- Light: `text-zinc-600`, hover `text-zinc-950` (nav) or `text-violet-600` (accent)
- Underline on hover (optional)
- `transition-colors`

### Tags

```css
.tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: text-xs;
  font-weight: font-medium;
  background: zinc-800 / zinc-200;
  color: accent-secondary;
  border-radius: 4px;
}
```

### Code Blocks

Syntax highlighting via Shiki with custom themes:
- Dark mode: Custom GVNS dark theme
- Light mode: Light theme (GitHub Light or custom)

```css
pre {
  background: zinc-800 / zinc-100;
  border: 1px solid zinc-700 / zinc-200;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: text-sm;
  line-height: 1.7;
}

code {
  font-family: var(--font-mono);
}

/* Inline code */
:not(pre) > code {
  background: zinc-800 / zinc-200;
  padding: 0.125em 0.375em;
  border-radius: 4px;
  font-size: 0.9em;
}
```

## Theme Toggle

### Strategy

Tailwind class-based dark mode (`darkMode: 'class'`):

```html
<!-- Light mode (default) -->
<html lang="en">

<!-- Dark mode -->
<html lang="en" class="dark">
```

### Behaviour

1. First visit: Respect `prefers-color-scheme` system preference
2. After toggle: Persist to `localStorage`
3. Inline `<head>` script prevents flash of wrong theme
4. Toggle button in navigation: Sun icon (light) / Moon icon (dark)

### Common Class Patterns

```
Background:   bg-white dark:bg-zinc-950
Surface:      bg-zinc-100 dark:bg-zinc-900
Border:       border-zinc-200 dark:border-zinc-800
Text primary: text-zinc-950 dark:text-zinc-100
Text body:    text-zinc-600 dark:text-zinc-400
Text muted:   text-zinc-500 (same both modes)
Accent:       text-violet-600 dark:text-violet-400
```

## Motion

### Transitions

```css
/* Fast: hovers, colour changes */
transition-colors duration-150

/* Base: layout shifts, transforms */
transition-all duration-300

/* Slow: page transitions (future) */
transition-all duration-500
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Icons

Use [Lucide](https://lucide.dev/) icons via inline SVG.

- Size: 20px default, 16px small, 24px large
- Stroke width: 2px
- Colour: `currentColor` (inherits text colour)

---

*Last updated: 2026-02-02*
