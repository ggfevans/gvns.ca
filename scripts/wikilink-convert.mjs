// Reads markdown from stdin or argv[2], converts Obsidian [[wikilinks]]
// to /posts/<slug>/ markdown links, writes to stdout. Slugs are resolved
// against existing posts in src/content/posts/.
//
// Note: slug = filename basename. No frontmatter `slug` override is
// supported (Zod schema does not define one; post URLs derive from
// filename).

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";

const POSTS_DIR = "src/content/posts";

function collectSlugs(dir) {
  const slugs = new Set();
  if (!existsSync(dir)) return slugs;
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else {
        const ext = extname(entry);
        if (ext === ".md" || ext === ".mdx") slugs.add(basename(entry, ext));
      }
    }
  }
  walk(dir);
  return slugs;
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function convert(input, slugs) {
  return input.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
    const slug = slugify(target);
    const text = alias || target;
    if (!slugs.has(slug)) {
      console.error(`warn: unresolved wikilink "${target}" (slug "${slug}")`);
      return text;
    }
    return `[${text}](/posts/${slug}/)`;
  });
}

const inputPath = process.argv[2];
const input = inputPath ? readFileSync(inputPath, "utf8") : readFileSync(0, "utf8");
const slugs = collectSlugs(POSTS_DIR);
process.stdout.write(convert(input, slugs));
