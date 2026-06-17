// @ts-check
import { readFileSync } from "node:fs";
import { defineConfig, envField } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import svelte from "@astrojs/svelte";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import { imageService } from "@unpic/astro/service";
import rehypeSlug from "rehype-slug";
import pagefind from "./src/integrations/pagefind.ts";
import { codeMockupTransformer } from "./src/utils/rehype-code-mockup.ts";

let shikiTheme = {};
try {
  shikiTheme = JSON.parse(
    readFileSync(
      new URL("./src/styles/shiki-gvns.json", import.meta.url),
      "utf-8",
    ),
  );
} catch (error) {
  console.warn("Failed to load shiki-gvns.json, falling back to default theme:", error);
}

// Production deploys run only on the `main` branch via Cloudflare Workers Builds;
// every other branch produces a versioned `*.workers.dev` preview (docs/INFRASTRUCTURE.md).
// Cloudflare Image Transformations (`/cdn-cgi/image/...`) are only served on the
// production `gvns.ca` zone, so the unpic service's transform URLs 404 on preview hosts
// and optimised images appear broken there (issue #717).
//
// `WORKERS_CI_BRANCH` is injected by Workers Builds. A missing value (local builds, or
// if Workers Builds ever stops injecting it) falls back to production so prod can never
// silently lose Image Transformations; only a positively identified non-`main` branch is
// treated as a preview.
const ciBranch = process.env.WORKERS_CI_BRANCH;
const isProduction = !ciBranch || ciBranch === "main";

export default defineConfig({
  site: "https://gvns.ca",
  output: "server",
  adapter: cloudflare({
    // Production keeps the unpic service (configured under `image` below) via "custom".
    // Previews use "passthrough": Astro emits `/_image?href=/_astro/<asset>` URLs served
    // by the adapter's passthrough endpoint, which streams the original asset from the
    // ASSETS binding (HTTP 200) on `*.workers.dev` — no `/cdn-cgi/` zone dependency, where
    // `/cdn-cgi/image/` transforms would 404 (issue #717).
    imageService: isProduction ? "custom" : "passthrough",
  }),
  // Render-time image optimisation (production only):
  // - Bundled post heroes (Astro `image()` ESM imports) and markdown images get URL-based
  //   transforms via Cloudflare Image Transformations (`/cdn-cgi/image/...`) at the edge.
  // - Local/static srcs fall back to Cloudflare.
  // On previews this block is omitted, leaving the adapter's `passthrough` service in place.
  // See docs/CMS-SETUP.md and docs/DECISIONS.md (ADR-018) for context.
  ...(isProduction
    ? {
        image: {
          service: imageService({
            fallbackService: "cloudflare",
            layout: "constrained",
          }),
        },
      }
    : {}),
  markdown: {
    shikiConfig: {
      theme: shikiTheme,
      transformers: [codeMockupTransformer()],
    },
    rehypePlugins: [rehypeSlug],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [svelte(), sitemap({ filter: (page) => !page.includes("/sandbox/") }), pagefind()],
  env: {
    schema: {
      // Cloudflare Turnstile public site key — safe to expose in client bundles.
      // Referenced via import.meta.env.PUBLIC_TURNSTILE_SITE_KEY in Svelte/Astro components.
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
    },
  },
});
