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
 * Get today's date components.
 */
export function today() {
  const d = new Date();
  return {
    iso: d.toISOString().split('T')[0],
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1).padStart(2, '0'),
  };
}

/**
 * Find a unique slug by appending incrementing suffix.
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
 */
export function escapeYamlString(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
      } else if (entry.name.endsWith('.md')) {
        slugs.add(entry.name.replace(/\.md$/, ''));
      }
    }
  }
  await walk(writingDir);
  return slugs;
}

/**
 * Tag categories for CLI multi-select grouping.
 */
export const TAG_CATEGORIES = {
  'Tech & Homelab': ['homelab', 'docker', 'linux', 'networking', 'automation', 'web-dev'],
  'Movement & Training': ['bjj', 'movement', 'training'],
  'Productivity & Life': ['adhd', 'productivity', 'pkm'],
  'Meta & Essays': ['essay', 'tutorial', 'til', 'meta'],
};

export const VALID_TAGS = Object.values(TAG_CATEGORIES).flat();
