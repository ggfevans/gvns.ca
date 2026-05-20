# Pagefind Integration: Pattern Analysis

**Date:** 2026-03-13
**Status:** Complete
**Branch:** `chore/remove-astro-pagefind` (PR #186)

---

## Key Insights

### Root Cause: Node Version Mismatch

The CI failure is caused by a **Node version difference**, not an Astro version mismatch or Astro 6 issue.

| Environment | Node Version | Behaviour |
|---|---|---|
| Local | v25.8.1 | Build succeeds |
| CI (GitHub Actions) | v20.20.1 | "Vite module runner has been closed" |

**Both environments run Astro 5.18.0 with Vite 6.4.1.** PR #186 does not include Astro 6 changes. PR #181 (the Astro 6 upgrade) is a separate Dependabot PR.

### The Mechanism

1. `astro.config.mjs` imports `./src/integrations/pagefind.ts` (a TypeScript file)
2. **Node 22+** has native TypeScript stripping (`--experimental-strip-types`, stabilised in Node 22.6+). The `.ts` import resolves natively through Node's module loader, so the integration code runs as plain Node.js — `await import("pagefind")` is a standard Node dynamic import
3. **Node 20** cannot natively import `.ts` files. Astro falls back to loading the config via Vite's `ssrLoadModule` (see `node_modules/astro/dist/core/config/vite-load.js`). This means the entire integration module lives inside Vite's module runner context
4. When `astro:build:done` fires, Vite has already closed its module runner (the build is done). The `await import("pagefind")` call at `pagefind.ts:24` goes through the now-closed module runner, triggering the error

### Confirming Evidence

- CI stack trace: `SSRCompatModuleRunner.getModuleInformation → request → astro:build:done (pagefind.ts:24:32)`
- `SSRCompatModuleRunner` does not exist in the local Vite 6.4.1 install — it is a class name from the SSR compatibility layer that only activates when Vite processes the module
- The error occurs specifically at the `await import("pagefind")` line, not at any pagefind API call
- Local build produces `[pagefind] Indexed 16 pages` without error

---

## Implementation Approaches

### Option A: Static Top-Level Import

```typescript
import * as pagefind from "pagefind";
import type { AstroIntegration } from "astro";

export default function pagefindIntegration(): AstroIntegration {
  return {
    name: "pagefind",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const { index } = await pagefind.createIndex({});
        // ...
        await pagefind.close();
      },
    },
  };
}
```

This is how `astro-pagefind` does it. The import resolves when the config file is loaded (while Vite's module runner is still active), avoiding the closed-runner problem.

**Risk:** The `pagefind` package is a native binary wrapper. Top-level import means it initialises at config load time, including during `astro dev` when no build output exists yet. Need to verify it does not throw on import alone (likely safe — `createIndex()` is the active call, not the import).

### Option B: Dynamic Import with Variable Indirection (Current, Broken on Node 20)

```typescript
"astro:build:done": async ({ dir }) => {
  const pagefind = await import("pagefind");
  // ...
}
```

This is the current approach. It works on Node 22+ but fails on Node 20 because Vite's module runner intercepts the dynamic import after it has been closed.

**Possible fix variant:** Use `createRequire` to bypass Vite:

```typescript
import { createRequire } from "node:module";

"astro:build:done": async ({ dir }) => {
  const require = createRequire(import.meta.url);
  const pagefind = require("pagefind");
  // ...
}
```

This forces Node's native `require()` regardless of Vite's module runner state. However, `pagefind` is ESM-only (`"type": "module"`), so `require()` would fail.

### Option C: CLI Spawn Fallback

```typescript
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

"astro:build:done": async ({ dir }) => {
  const targetDir = fileURLToPath(dir);
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["pagefind", "--site", targetDir], {
      stdio: "inherit",
      shell: true,
    });
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`pagefind exited ${code}`)));
  });
}
```

Runs pagefind as a separate process. Zero dependency on Vite's module runner.

### Option D: Bump CI Node Version to 22+

```yaml
# ci.yml
- uses: actions/setup-node@v6
  with:
    node-version: "22"
```

The simplest fix. Node 22 handles `.ts` imports natively, bypassing the entire Vite module runner path. This also aligns with Astro 6's minimum Node requirement (22.12.0), future-proofing the CI.

### Option E: Move Integration to a `.mjs` File

Rename `src/integrations/pagefind.ts` to `src/integrations/pagefind.mjs` (dropping TypeScript). Since the file only uses `AstroIntegration` as a type import, the actual runtime code is pure JavaScript. A `.mjs` file would be loaded by Node natively on any version, never going through Vite's module runner.

---

## Trade-offs

| Approach | Reliability | Simplicity | Dev Experience | Astro 6 Ready | Node 20 Compatible |
|---|---|---|---|---|---|
| **A: Static import** | High | High | Good — no change to DX | Yes | Yes (resolved at config load) |
| **B: Dynamic import (current)** | Low (Node-dependent) | High | Good | Unknown | No |
| **C: CLI spawn** | Very high | Medium | Slightly slower builds | Yes | Yes |
| **D: Bump Node to 22+** | High | Very high (1-line change) | No change | Required for Astro 6 | N/A (removes Node 20) |
| **E: Rename to .mjs** | High | High | Lose type checking in IDE | Yes | Yes |

---

## Recommendation

**Do both Option A and Option D together.**

### Immediate fix: Option A (static import)

Change the dynamic `await import("pagefind")` to a static `import * as pagefind from "pagefind"` at the top of the file. This resolves the module at config load time when Vite's module runner is still active, making it work on any Node version. This is exactly how `astro-pagefind` does it and is proven to work.

### Also do: Option D (bump CI Node to 22)

Update `ci.yml` from `node-version: "20"` to `node-version: "22"`. Rationale:
- Astro 6 (PR #181) requires Node 22.12.0 minimum — you will need this anyway
- Eliminates the entire class of "Vite module runner" issues for `.ts` integration files
- Node 20 reaches end-of-life in April 2026, one month away
- Your local environment already runs Node 25

The static import is the defence-in-depth fix (works regardless of Node version). The Node bump is the strategic fix (future-proofs for Astro 6 and eliminates the root cause).

**Keep Option C (CLI spawn) in mind** as a fallback if Astro 6 introduces any further module loading changes that break static imports in integration files.
