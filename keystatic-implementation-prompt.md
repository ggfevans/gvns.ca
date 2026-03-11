# Keystatic Integration — Claude Code Implementation Prompt

Use this prompt in Claude Code from the project root (`gwilym.ca/`).

---

## Prompt

```
Add Keystatic CMS to this Astro project for local-only content editing. This is a single-author personal blog — keep it minimal. Read the project's CLAUDE.md, docs/, and src/content/config.ts before making any changes.

### Requirements

**Packages to install:**
- @keystatic/core
- @keystatic/astro
- @astrojs/markdoc (required by Keystatic for its content field)

Do NOT install @astrojs/react — it is already present.

**Storage mode:** `local` only. No GitHub mode, no cloud, no deployed admin panel. The Keystatic UI will only be used during `npm run dev` at localhost:4321/keystatic.

### Files to create

**1. `keystatic.config.ts` at project root**

Define two collections — `writing` and `work` — that map to the existing Astro content collections in `src/content/config.ts`.

For the `writing` collection:
- path: `src/content/writing/*/` (one folder per post, enables co-located images)
- slugField: `title`
- format: `{ contentField: 'content' }` so all fields output as frontmatter + body in a single file
- Schema fields matching existing frontmatter:
  - `title`: fields.slug with name label "Title" — max 100 chars
  - `description`: fields.text — max 200 chars, multiline
  - `pubDate`: fields.date with label "Publish Date", defaultValue `today`
  - `updatedDate`: fields.date, optional
  - `tags`: fields.multiselect with options from the site's tag taxonomy. Check src/content/config.ts and any existing posts to determine valid tags. Include at minimum: "meta", "homelab", "bjj", "productivity", "astro", "svelte", "tailwind". Validation: min 1, max 4
  - `draft`: fields.checkbox, default true (new posts start as drafts)
  - `heroImage`: fields.image with directory `src/assets/heroes/`
  - `canonicalUrl`: fields.url, optional
  - For the `content` field: use fields.markdoc with `extension: 'md'` so output files are .md not .mdoc — this preserves compatibility with existing markdown posts and Astro's markdown pipeline
  - Do NOT include the `syndication` field — that's managed by automation scripts, not the editor

For the `work` collection:
- path: `src/content/work/*/`
- slugField: `title`
- format: `{ contentField: 'content' }`
- Schema fields:
  - `title`: fields.slug
  - `description`: fields.text, max 200 chars
  - `url`: fields.url, optional
  - `repo`: fields.url, optional
  - `status`: fields.select with options: active, maintained, archived
  - `tags`: fields.multiselect (check existing work entries for valid tags)
  - `heroImage`: fields.image
  - `featured`: fields.checkbox, default false
  - `content`: fields.markdoc with `extension: 'md'`

**2. Keystatic admin route**

Create `src/pages/keystatic/[...params].astro` with:

```astro
---
import { Keystatic } from '@keystatic/astro/ui'
---
<Keystatic />
```

**3. Update `astro.config.mjs`**

- Import `keystatic` from `@keystatic/astro`
- Import `markdoc` from `@astrojs/markdoc`
- Add `markdoc()` and `keystatic()` to the integrations array
- IMPORTANT: The React integration must use `include` to scope it to only Keystatic routes, to avoid conflicts with Svelte islands elsewhere on the site:

```js
react({ include: ['**/keystatic/**', '**/node_modules/@keystatic/**'] })
```

- Set `output: 'hybrid'` so the Keystatic admin route can be server-rendered during dev while the rest of the site stays static
- Add the Cloudflare adapter: install @astrojs/cloudflare and add it as the adapter. This is needed for hybrid mode. The Keystatic admin panel will only work locally during dev, but Cloudflare adapter is required for Astro hybrid mode to build correctly.

### Migration considerations for existing posts

The existing posts at `src/content/writing/2024/12/hello-world.md` and `src/content/writing/2026/02/code-mockup-test.md` are flat .md files inside year/month folders. Keystatic's `path: 'src/content/writing/*/'` expects posts in slug-named subdirectories directly under `writing/`.

Two options — pick whichever is simpler:

**Option A (recommended):** Move existing posts into Keystatic-compatible structure:
- `src/content/writing/hello-world/index.md`
- `src/content/writing/code-mockup-test/index.md`

Then update any Astro routing that depends on the old folder structure (check `src/pages/write/[slug].astro`).

**Option B:** Keep existing posts where they are and configure Keystatic to write new posts in its own structure. Old posts won't appear in the Keystatic admin but will still render on the site. Less clean but zero migration risk.

Recommend Option A. Check `src/pages/write/[slug].astro` and any `getCollection('writing')` calls to confirm the slug derivation won't break.

### What NOT to do

- Do NOT add SSR for the production site — Keystatic is local dev only
- Do NOT remove or modify the existing Svelte integration
- Do NOT change existing content collection schemas in config.ts beyond what's needed for compatibility
- Do NOT add Keystatic's Reader API — use Astro's native getCollection()
- Do NOT set up GitHub storage mode or any authentication
- Keep all existing scripts (new-post, ingest, syndicate) working

### Verification

After implementation:
1. Run `npm run dev` and navigate to localhost:4321/keystatic
2. Confirm both collections (writing, work) appear in the admin UI
3. Create a test draft post and verify the file is written to `src/content/writing/test-post/index.md` with correct frontmatter
4. Confirm existing site pages still render at localhost:4321
5. Run `npm run build` and confirm the production build succeeds (Keystatic routes excluded from static output)
6. Delete the test post

### Reference docs
- https://keystatic.com/docs/installation-astro
- https://keystatic.com/docs/collections
- https://keystatic.com/docs/format-options
- https://keystatic.com/docs/fields/markdoc (note the `extension` option)
- https://docs.astro.build/en/guides/cms/keystatic/
```
