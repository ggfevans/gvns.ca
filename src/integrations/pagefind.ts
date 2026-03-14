import type { AstroIntegration } from "astro";

export default function pagefindIntegration(): AstroIntegration {
  let outDir: string;

  return {
    name: "pagefind",
    hooks: {
      "astro:config:done": ({ config }) => {
        outDir = new URL(config.outDir).pathname;
      },
      "astro:server:setup": async ({ server }) => {
        const sirv = (await import("sirv")).default;
        const serve = sirv(outDir, { dev: true, etag: true });
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith("/pagefind/")) {
            serve(req, res, next);
          } else {
            next();
          }
        });
      },
      "astro:build:done": async ({ dir }) => {
        const pagefind = await import("pagefind");
        const { index } = await pagefind.createIndex({});
        if (!index) throw new Error("Failed to create pagefind index");
        const { page_count } = await index.addDirectory({ path: dir.pathname });
        await index.writeFiles({ outputPath: `${dir.pathname}pagefind` });
        console.log(`[pagefind] Indexed ${page_count} pages`);
        await pagefind.close();
      },
    },
  };
}
