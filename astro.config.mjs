// @ts-check
import { readFileSync } from "node:fs";
import { defineConfig, envField } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import svelte from "@astrojs/svelte";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
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
    imageService: "compile",
  }),
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
