# gvns.ca Design System

## Colour Palette

Based on [Dracula Theme](https://draculatheme.com/) with semantic mappings.

### Core Colours

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--background` | `#282a36` | `40, 42, 54` | Page background |
| `--current-line` | `#44475a` | `68, 71, 90` | Hover states, borders |
| `--foreground` | `#f8f8f2` | `248, 248, 242` | Primary text |
| `--comment` | `#6272a4` | `98, 114, 164` | Secondary text, muted |
| `--cyan` | `#8be9fd` | `139, 233, 253` | Links, interactive |
| `--green` | `#50fa7b` | `80, 250, 123` | Success, positive |
| `--orange` | `#ffb86c` | `255, 184, 108` | Warnings, highlights |
| `--pink` | `#ff79c6` | `255, 121, 198` | Accents, tags |
| `--purple` | `#bd93f9` | `189, 147, 249` | Primary accent |
| `--red` | `#ff5555` | `255, 85, 85` | Errors, destructive |
| `--yellow` | `#f1fa8c` | `241, 250, 140` | Caution, attention |

### Semantic Tokens

```css
:root {
  /* Backgrounds */
  --color-bg-primary: var(--background);
  --color-bg-secondary: var(--current-line);
  --color-bg-elevated: #343746; /* Slightly lighter than current-line */
  
  /* Text */
  --color-text-primary: var(--foreground);
  --color-text-secondary: var(--comment);
  --color-text-muted: #6272a4;
  
  /* Interactive */
  --color-link: var(--cyan);
  --color-link-hover: var(--purple);
  --color-link-visited: var(--pink);
  
  /* Accent */
  --color-accent-primary: var(--purple);
  --color-accent-secondary: var(--pink);
  
  /* Feedback */
  --color-success: var(--green);
  --color-warning: var(--orange);
  --color-error: var(--red);
  --color-info: var(--cyan);
  
  /* Code */
  --color-code-bg: var(--current-line);
  --color-code-text: var(--foreground);
}
```

### Light Theme (Optional)

For accessibility and user preference. Derived from Dracula colours, not a separate palette.

```css
[data-theme="light"] {
  --color-bg-primary: #f8f8f2;
  --color-bg-secondary: #e9e9e4;
  --color-bg-elevated: #ffffff;
  
  --color-text-primary: #282a36;
  --color-text-secondary: #44475a;
  --color-text-muted: #6272a4;
  
  --color-link: #6f42c1; /* Darker purple for contrast */
  --color-link-hover: #bd93f9;
  
  --color-code-bg: #282a36;
  --color-code-text: #f8f8f2;
}
```

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

For blog content, using Tailwind Typography plugin defaults with Dracula overrides:

```css
.prose {
  --tw-prose-body: var(--color-text-primary);
  --tw-prose-headings: var(--color-text-primary);
  --tw-prose-links: var(--color-link);
  --tw-prose-bold: var(--color-text-primary);
  --tw-prose-code: var(--pink);
  --tw-prose-pre-bg: var(--current-line);
  --tw-prose-quote-borders: var(--purple);
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
  color: var(--color-link);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 2px;
  transition: text-decoration-color 150ms ease;
}

a:hover {
  text-decoration-color: var(--color-link);
}

a:focus-visible {
  outline: 2px solid var(--color-accent-primary);
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
  border-radius: 6px;
  transition: all 150ms ease;
}

.btn-primary {
  background: var(--color-accent-primary);
  color: var(--background);
}

.btn-primary:hover {
  background: var(--pink);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--current-line);
}

.btn-ghost:hover {
  background: var(--current-line);
}
```

### Cards

```css
.card {
  background: var(--color-bg-secondary);
  border-radius: 8px;
  padding: var(--space-4);
  border: 1px solid transparent;
  transition: border-color 150ms ease;
}

.card:hover {
  border-color: var(--color-accent-primary);
}
```

### Tags

```css
.tag {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: var(--current-line);
  color: var(--pink);
  border-radius: 4px;
}
```

### Code Blocks

Handled by Shiki with Dracula theme. Additional styling:

```css
pre {
  padding: var(--space-4);
  border-radius: 8px;
  overflow-x: auto;
  font-size: var(--text-sm);
  line-height: 1.7;
}

code {
  font-family: var(--font-mono);
}

/* Inline code */
:not(pre) > code {
  background: var(--current-line);
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

*Last updated: 2024-12-09*
