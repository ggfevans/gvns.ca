# Pagefind Integration Without astro-pagefind: Research Spike

**Date:** 2026-03-13
**Status:** Complete
**Context:** Replacing `astro-pagefind` wrapper with a local Astro integration that uses the pagefind Node API directly.

---

## How astro-pagefind Does It

Source: `packages/astro-pagefind/src/pagefind.ts` in [shishkin/astro-pagefind](https://github.com/shishkin/astro-pagefind)

astro-pagefind uses a **top-level named import** from the pagefind package:

```typescript
import { createIndex, type PagefindServiceConfig } from "pagefind";
```

Inside the `astro:build:done` hook, it follows a three-step pattern:

```typescript
// 1. Create index (with optional config)
const { index, errors: createErrors } = await createIndex(indexConfig);

// 2. Add the build output directory
const { page_count, errors: addErrors } = await index.addDirectory({ path: outDir });

// 3. Write the index files
const { outputPath, errors: writeErrors } = await index.writeFiles({
  outputPath: path.join(outDir, "pagefind"),
});
```

Key observation: astro-pagefind uses a **static import** at the top of the file, not a dynamic `await import()` inside the hook. This is significant — see the Vite Module Runner section below.

---

## Pagefind Official Documentation

Source: [pagefind.app/docs/node-api](https://pagefind.app/docs/node-api/)

### Import

```javascript
import * as pagefind from "pagefind";
```

The pagefind npm package is ESM-only (`"type": "module"`, exports only the `import` condition).

### Core API

```javascript
// Create an index
const { index } = await pagefind.createIndex({
  rootSelector: "html",
  excludeSelectors: [".my-code-blocks"],
  forceLanguage: "en",
  verbose: false,
});

// Add files from a directory
const { errors, page_count } = await index.addDirectory({
  path: "public",
  glob: "**/*.{html}",
});

// Write index to disk
const { errors } = await index.writeFiles({
  outputPath: "./public/pagefind",
});

// Clean up
await index.deleteIndex();
await pagefind.close();
```

### Other capabilities

- `index.addHTMLFile({ sourcePath, content })` — add virtual HTML files
- `index.addCustomRecord({ url, content, language, meta, filters, sort })` — add non-HTML content
- `index.getFiles()` — get index as in-memory `Uint8Array` files (useful for non-filesystem outputs)

---

## Community Solutions

### Approach 1: CLI via child_process.spawn (Most Common)

Source: [minifloppy.it](https://minifloppy.it/posts/2024/adding-pagefind-search-astro-website/)

The most widely used community approach avoids the Node API entirely and shells out to the pagefind CLI:

```typescript
import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import path from "node:path";

function pagefindIntegration(): AstroIntegration {
  return {
    name: "pagefind",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const targetDir = fileURLToPath(dir);
        const cwd = path.dirname(fileURLToPath(import.meta.url));
        const relativeDir = path.relative(cwd, targetDir);

        await new Promise<void>((resolve) => {
          spawn("npx", ["-y", "pagefind", "--site", relativeDir], {
            stdio: "inherit",
            shell: true,
            cwd,
          }).on("close", () => resolve());
        });
      },
    },
  };
}
```

**Pros:** No import issues whatsoever — pagefind runs as a separate process.
**Cons:** Slower (spawns npx), less programmatic control, no custom records/filters.

### Approach 2: Build script (Simplest)

Many tutorials recommend appending pagefind to the build command:

```json
{
  "scripts": {
    "build": "astro build && npx pagefind --site dist"
  }
}
```

**Pros:** Zero integration code.
**Cons:** Not an Astro integration (can't serve in dev), relies on build script.

### Approach 3: pagefind-proxima (Newer Alternative)

Mentioned in [Astro's February 2026 newsletter](https://astro.build/blog/whats-new-february-2026/) as a newer Astro integration for Pagefind with a ready-made Search component. Limited documentation found during this research.

---

## Vite Module Runner Workarounds

### The Concern (Partially Debunked)

The initial assumption was that `await import("pagefind")` in `astro:build:done` fails because "Vite's module runner is closed by that point." **This turns out to be more nuanced than expected.**

### How Astro Integration Hooks Actually Execute

Verified by reading Astro's source (`node_modules/astro/dist/integrations/hooks.js`):

**Integration hooks are plain function calls executed directly in Node's process.** There is no Vite module runner wrapping. The `runHookInternal` function simply calls `hook(params)` — it's a direct invocation of the hook function in the same Node.js process that runs Astro.

This means `await import("pagefind")` inside `astro:build:done` is a **native Node.js dynamic import**, not a Vite-mediated import.

### Verification

Tested on this project (Astro 5.18.0):

```bash
# Native Node import works fine
node -e "import('pagefind').then(m => console.log(Object.keys(m)))"
# Output: [ 'close', 'createIndex' ]

# Build succeeds with await import("pagefind") in astro:build:done
npx astro build
# Output: [pagefind] Indexed 16 pages
```

### When the "Vite module runner" Error DOES Occur

The "Vite module runner has been closed" error ([astro#12689](https://github.com/withastro/astro/issues/12689), [vite#18962](https://github.com/vitejs/vite/issues/18962)) occurs specifically when:

1. **Content collection loaders** use dynamic imports during build
2. **Astro components/pages** use dynamic imports that Vite tries to resolve
3. **Development mode** hot reload causes premature module runner closure (Vite 6 regression)

It does **not** affect integration hook code, which runs outside Vite's module resolution pipeline.

### The Variable Indirection Trick (Client-Side Only)

Source: [pyk.sh](https://pyk.sh/blog/2025-10-21-vite-dynamic-import-trick)

For client-side dynamic imports that Vite tries to statically analyse, hiding the path in a variable prevents Vite from resolving it at build time:

```typescript
// Fails: Vite tries to resolve this statically
const pagefind = await import("/pagefind/pagefind.js");

// Works: Vite can't statically analyse a variable
const pagefindPath = "/pagefind/pagefind.js";
const pagefind = await import(pagefindPath);
```

This technique is relevant for the **search UI component** (client-side), not for the build integration.

---

## Key Recommendations

### 1. The Current Integration Works — Keep It

The existing integration at `src/integrations/pagefind.ts` using `await import("pagefind")` in `astro:build:done` is valid and working. The build completes successfully with 16 pages indexed.

### 2. Consider Switching to a Static Import

For consistency with how astro-pagefind does it and to eliminate any future risk:

```typescript
// Instead of: const pagefind = await import("pagefind");
import * as pagefind from "pagefind";
```

Top-level static imports work in Astro integration files because they're loaded by Node's native ESM loader, not by Vite.

### 3. If Import Issues Ever Arise, Use the CLI Fallback

The `child_process.spawn` approach is the most bulletproof solution — it sidesteps all module resolution questions entirely. Only use this if the Node API approach breaks in a future Astro/Vite version.

### 4. For the Search UI Component

When loading pagefind on the client side (in a Svelte island or Astro component), use the variable indirection trick:

```typescript
const pagefindPath = "/pagefind/pagefind.js";
const pagefind = await import(/* @vite-ignore */ pagefindPath);
```

### 5. Astro 6 Compatibility

The integration approach (both Node API and CLI) should work fine with Astro 6, since integration hooks are plain Node.js function calls. The `astro-pagefind` package's Astro 6 incompatibility likely stems from its **component** code (Astro component APIs changing), not its build integration.

If Astro 6 changes how integration files are loaded (unlikely but possible), the CLI spawn approach is the safest fallback.
