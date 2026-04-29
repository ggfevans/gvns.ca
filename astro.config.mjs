// @ts-check
import { readFileSync } from "node:fs";
import { defineConfig, envField } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import svelte from "@astrojs/svelte";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import { imageService } from "@unpic/astro/service";
import rehypeSlug from "rehype-slug";
import pagefind from "./src/integrations/pagefind.ts";

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

export default defineConfig({
  site: "https://gvns.ca",
  output: "server",
  adapter: cloudflare({
    // "custom" tells the Cloudflare adapter to leave `image.service` alone
    // so the unpic service configured below stays in place (the adapter
    // would otherwise override it with one of its built-in services).
    imageService: "custom",
  }),
  // Render-time image optimisation:
  // - Bundled post heroes (Astro `image()` ESM imports) get URL-based transforms via
  //   Cloudflare Image Transformations (`/cdn-cgi/image/...`) at the edge.
  // - Local/static srcs fall back to Sharp via the adapter's "compile" service.
  // See docs/CMS-SETUP.md and docs/DECISIONS.md (ADR-016) for context.
  image: {
    service: imageService({
      fallbackService: "cloudflare",
      layout: "constrained",
    }),
  },
  markdown: {
    shikiConfig: {
      theme: shikiTheme,
    },
    rehypePlugins: [rehypeSlug],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [svelte(), react(), sitemap({ filter: (page) => !page.includes("/sandbox/") }), pagefind()],
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
