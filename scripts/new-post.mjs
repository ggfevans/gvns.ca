#!/usr/bin/env node

/**
 * Scaffold a new blog post with valid frontmatter.
 *
 * Usage:
 *   npm run new-post
 *   npm run new-post -- "My Post Title"
 */

import { input, checkbox, confirm } from '@inquirer/prompts';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const WRITING_DIR = join(ROOT, 'src', 'content', 'writing');

// Import tag taxonomy — uses the compiled-out values directly to avoid
// needing a TS build step for a CLI script.
const TAG_CATEGORIES = {
  'Tech & Homelab': ['homelab', 'docker', 'linux', 'networking', 'automation', 'web-dev'],
  'Movement & Training': ['bjj', 'movement', 'training'],
  'Productivity & Life': ['adhd', 'productivity', 'pkm'],
  'Meta & Essays': ['essay', 'tutorial', 'til', 'meta'],
};

const VALID_TAGS = Object.values(TAG_CATEGORIES).flat();

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function today() {
  const d = new Date();
  return {
    iso: d.toISOString().split('T')[0],
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1).padStart(2, '0'),
  };
}

async function existingSlugs() {
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
  await walk(WRITING_DIR);
  return slugs;
}

async function main() {
  // Title — from CLI arg or prompt
  const cliTitle = process.argv.slice(2).join(' ').trim();
  const title =
    cliTitle ||
    (await input({
      message: 'Post title:',
      validate: (v) => (v.trim().length > 0 && v.trim().length <= 100) || 'Title required (max 100 chars)',
    }));

  // Slug
  let slug = slugify(title);
  const taken = await existingSlugs();
  if (taken.has(slug)) {
    const ok = await confirm({ message: `Slug "${slug}" already exists. Use "${slug}-2"?`, default: true });
    slug = ok ? `${slug}-2` : await input({ message: 'Enter a custom slug:', validate: (v) => v.trim().length > 0 || 'Slug required' });
  }

  // Tags — grouped multi-select
  const tagChoices = Object.entries(TAG_CATEGORIES).flatMap(([category, tags]) => [
    { name: `── ${category} ──`, value: '__separator__', disabled: '' },
    ...tags.map((tag) => ({ name: tag, value: tag })),
  ]);

  const tags = await checkbox({
    message: 'Select tags (1-4):',
    choices: tagChoices,
    validate: (selected) => {
      const real = selected.filter((t) => t !== '__separator__');
      if (real.length < 1) return 'Select at least 1 tag';
      if (real.length > 4) return 'Maximum 4 tags';
      return true;
    },
  });
  const selectedTags = tags.filter((t) => t !== '__separator__');

  // Description (optional)
  const description = await input({
    message: 'Description (optional, max 200 chars):',
    default: '',
    validate: (v) => v.length <= 200 || 'Max 200 characters',
  });

  // Draft?
  const isDraft = await confirm({ message: 'Create as draft?', default: true });

  // Build file
  const { iso, year, month } = today();
  const dir = join(WRITING_DIR, year, month);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${slug}.md`);

  const frontmatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    description ? `description: "${description.replace(/"/g, '\\"')}"` : `description: ""`,
    `pubDate: ${iso}`,
    `tags: [${selectedTags.map((t) => `"${t}"`).join(', ')}]`,
  ];
  if (isDraft) frontmatter.push('draft: true');
  frontmatter.push('---', '', '');

  await writeFile(filePath, frontmatter.join('\n'), 'utf-8');

  console.log(`\nCreated: ${filePath}`);

  // Try to open in $EDITOR
  if (process.env.EDITOR) {
    try {
      execSync(`${process.env.EDITOR} "${filePath}"`, { stdio: 'inherit' });
    } catch {
      // Editor launch failed — not critical
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
