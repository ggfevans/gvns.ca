// scripts/lib/cli-utils.mjs
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Convert text to URL-safe slug.
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get today's date components (UTC to match ISO string).
 */
export function today() {
  const d = new Date();
  return {
    iso: d.toISOString().split('T')[0],
    year: String(d.getUTCFullYear()),
    month: String(d.getUTCMonth() + 1).padStart(2, '0'),
  };
}

/**
 * Find a unique slug by appending incrementing suffix.
 *
 * Note: This check is not atomic - if multiple processes run concurrently,
 * a race condition could cause collisions. This is acceptable for interactive
 * CLI tools where only one instance runs at a time.
 */
export function findUniqueSlug(baseSlug, takenSlugs) {
  if (!takenSlugs.has(baseSlug)) return baseSlug;
  let suffix = 2;
  while (takenSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix++;
  }
  return `${baseSlug}-${suffix}`;
}

/**
 * Escape a string for use in double-quoted YAML.
 * Handles backslashes, quotes, newlines, tabs, and control characters.
 */
export function escapeYamlString(str) {
  return str
    .replace(/\\/g, '\\\\')     // Backslashes first (before other escapes add more)
    .replace(/"/g, '\\"')       // Double quotes
    .replace(/\n/g, '\\n')      // Newlines
    .replace(/\r/g, '\\r')      // Carriage returns
    .replace(/\t/g, '\\t')      // Tabs
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally matching control chars to strip them
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // Strip other control chars
}

/**
 * Collect all existing post slugs from a writing directory.
 */
export async function collectSlugs(writingDir) {
  const slugs = new Set();
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name));
      } else if (entry.name.toLowerCase().endsWith('.md')) {
        slugs.add(entry.name.replace(/\.md$/i, ''));
      }
    }
  }
  await walk(writingDir);
  return slugs;
}

/**
 * Tag categories for CLI multi-select grouping.
 *
 * NOTE: Duplicated from src/utils/tags.ts because .mjs scripts cannot import
 * .ts modules without a build step. The canonical source is src/utils/tags.ts.
 * Keep both in sync when modifying the tag taxonomy.
 */
export const TAG_CATEGORIES = {
  'Tech & Homelab': ['homelab', 'docker', 'linux', 'networking', 'automation', 'web-dev'],
  'Movement & Training': ['bjj', 'movement', 'training'],
  'Productivity & Life': ['adhd', 'productivity', 'pkm'],
  'Meta & Essays': ['essay', 'tutorial', 'til', 'meta'],
};

export const VALID_TAGS = Object.values(TAG_CATEGORIES).flat();

/**
 * Convert Obsidian wikilinks to standard markdown links.
 *
 * - [[Post Title]] → [Post Title](/write/post-title/)
 * - [[Post Title|display text]] → [display text](/write/post-title/)
 * - Unresolved links (slug not in existingSlugs) become plain text with a console warning.
 */
export function convertWikilinks(content, existingSlugs) {
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
    const slug = slugify(target.trim());
    const text = (display || target).trim();
    if (!slug) return text;
    if (existingSlugs.has(slug)) {
      return `[${text}](/write/${slug}/)`;
    }
    console.warn(`Warning: unresolved wikilink [[${target.trim()}]] — rendered as plain text`);
    return text;
  });
}
