# Component Conventions

Patterns for components, pages, and widgets in `gvns.ca`.

## Naming: split convention

The codebase uses **two naming styles** depending on file role:

| Role | Location | Convention | Examples |
|------|----------|------------|----------|
| **Components** | `src/components/**/*.astro`, `*.svelte` | **PascalCase** | `BookList.astro`, `BookCard.astro`, `ThemeToggle.svelte`, `starwind/Button.astro` |
| **Pages / routes** | `src/pages/**/*.astro` | kebab-case | `read/index.astro`, `write/[slug].astro` |
| **Layouts** | `src/layouts/*.astro` | PascalCase (treated as components) | `BaseLayout.astro`, `PostLayout.astro` |
| **Utils** | `src/utils/*.ts` | kebab-case | `reading-time.ts`, `json-ld.ts` |
| **Content** | `src/content/**/*.md` | kebab-case | `2026/02/my-post.md` |
| **Styles** | `src/styles/*.css` | kebab-case | `global.css` |

### Why split

- **PascalCase for components** matches the Astro / Svelte / React community norm and is what Starwind UI Pro outputs by default (`npx starwind add <component>` drops files like `Button.astro` into `src/components/starwind/`). Using kebab-case here would force a rename on every Starwind add.
- **kebab-case for pages, utils, and content** keeps URLs and import paths lowercase and avoids cross-platform case-sensitivity surprises. The filename becomes the URL slug for routes and content, and lowercase reads better in URLs.
- **Layouts are PascalCase** because they're consumed exactly like components (`import BaseLayout from "@layouts/BaseLayout.astro"`) — the casing reflects the import shape, not the directory.

## Examples

```astro
---
// src/pages/read/index.astro  (route → kebab-case)
import BaseLayout from "@layouts/BaseLayout.astro";   // layout → PascalCase
import BookList from "@components/BookList.astro";    // component → PascalCase
import { formatDate } from "@utils/date";             // util → kebab-case
---
```

## Adding components

- **Manual:** create `src/components/MyComponent.astro` (PascalCase from the start).
- **Starwind:** `npx starwind@latest add <component>` — output already lands in `src/components/starwind/PascalCase.astro`, no rename needed.

## CSS classes

Custom CSS classes use the `gvns-` prefix and stay kebab-case regardless of the component file's casing. A component named `BookCard.astro` may define `.gvns-book-card` — the file casing and the class casing are independent.

## Renames

On macOS the default filesystem is case-insensitive. To rename a component case-only, use a two-step `git mv`:

```bash
git mv src/components/foo.astro src/components/Foo.tmp.astro
git mv src/components/Foo.tmp.astro src/components/Foo.astro
```

Update all imports afterwards (`rg -l "@components/foo" src/`).
