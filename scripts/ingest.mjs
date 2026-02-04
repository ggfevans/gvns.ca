#!/usr/bin/env node

/**
 * Ingest a bare markdown file into the writing collection.
 *
 * Reads the file, extracts/generates frontmatter, suggests tags
 * based on content keywords, and copies to the correct date folder.
 *
 * Usage:
 *   npm run ingest -- path/to/file.md
 *   npm run ingest -- path/to/file.md --no-interactive
 */

import { input, checkbox, confirm } from '@inquirer/prompts';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const WRITING_DIR = join(ROOT, 'src', 'content', 'writing');

// Mirror of src/utils/tags.ts — kept in sync manually to avoid TS build step.
const TAG_CATEGORIES = {
  'Tech & Homelab': ['homelab', 'docker', 'linux', 'networking', 'automation', 'web-dev'],
  'Movement & Training': ['bjj', 'movement', 'training'],
  'Productivity & Life': ['adhd', 'productivity', 'pkm'],
  'Meta & Essays': ['essay', 'tutorial', 'til', 'meta'],
};

const VALID_TAGS = Object.values(TAG_CATEGORIES).flat();

const TAG_KEYWORDS = {
  'self-host': 'homelab', selfhost: 'homelab', proxmox: 'homelab', server: 'homelab',
  nas: 'homelab', truenas: 'homelab', unraid: 'homelab',
  container: 'docker', 'docker compose': 'docker', dockerfile: 'docker', compose: 'docker',
  ubuntu: 'linux', debian: 'linux', bash: 'linux', terminal: 'linux', cli: 'linux', systemd: 'linux',
  dns: 'networking', vpn: 'networking', wireguard: 'networking', tailscale: 'networking',
  firewall: 'networking', vlan: 'networking',
  'ci/cd': 'automation', 'github actions': 'automation', cron: 'automation',
  pipeline: 'automation',
  astro: 'web-dev', svelte: 'web-dev', tailwind: 'web-dev', typescript: 'web-dev',
  frontend: 'web-dev', css: 'web-dev', react: 'web-dev',
  'jiu-jitsu': 'bjj', 'jiu jitsu': 'bjj', grappling: 'bjj', submission: 'bjj', guard: 'bjj',
  mobility: 'movement', stretching: 'movement', flexibility: 'movement',
  periodisation: 'training', strength: 'training', conditioning: 'training',
  'attention deficit': 'adhd', neurodivergent: 'adhd', 'executive function': 'adhd',
  workflow: 'productivity', 'time management': 'productivity', habits: 'productivity',
  obsidian: 'pkm', 'second brain': 'pkm', 'knowledge management': 'pkm',
  zettelkasten: 'pkm', 'note-taking': 'pkm',
  'this site': 'meta', 'gvns.ca': 'meta', 'behind the scenes': 'meta', changelog: 'meta',
  opinion: 'essay', argument: 'essay',
  'step by step': 'tutorial', 'how to': 'tutorial', guide: 'tutorial', walkthrough: 'tutorial',
  'today i learned': 'til', 'quick tip': 'til', snippet: 'til',
};

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

/**
 * Extract title from the first # heading in the content.
 * Falls back to filename.
 */
function extractTitle(content, filename) {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  // Fallback: filename without extension, de-slugified
  return filename
    .replace(/\.md$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extract a description from the first substantial paragraph.
 */
function extractDescription(content) {
  // Remove frontmatter if present
  const body = content.replace(/^---[\s\S]*?---\n*/, '');
  // Remove the first heading
  const noHeading = body.replace(/^#\s+.+$/m, '').trim();
  // Find first paragraph (non-empty, non-heading, non-code-fence line)
  const lines = noHeading.split('\n');
  const paragraphLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (paragraphLines.length > 0) break;
      continue;
    }
    if (trimmed.startsWith('#') || trimmed.startsWith('```') || trimmed.startsWith('- ') || trimmed.startsWith('|')) {
      if (paragraphLines.length > 0) break;
      continue;
    }
    paragraphLines.push(trimmed);
  }
  const paragraph = paragraphLines.join(' ');
  if (paragraph.length <= 200) return paragraph;
  return paragraph.slice(0, 197) + '...';
}

/**
 * Suggest tags based on keyword matches in content.
 */
function suggestTags(content) {
  const lower = content.toLowerCase();
  const suggested = new Set();
  for (const [keyword, tag] of Object.entries(TAG_KEYWORDS)) {
    // Use word boundary matching to avoid false positives
    // Escape special regex characters in keyword
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lower)) {
      suggested.add(tag);
    }
  }
  return [...suggested];
}

/**
 * Check if content already has frontmatter.
 */
function hasFrontmatter(content) {
  return /^---\s*\n/.test(content);
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

function findUniqueSlug(baseSlug, takenSlugs) {
  if (!takenSlugs.has(baseSlug)) return baseSlug;
  let suffix = 2;
  while (takenSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix++;
  }
  return `${baseSlug}-${suffix}`;
}

function escapeYamlString(str) {
  // Escape backslashes first, then double quotes
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run ingest -- path/to/file.md');
    process.exit(1);
  }

  const resolved = resolve(filePath);
  const filename = basename(resolved);
  const content = await readFile(resolved, 'utf-8');

  if (hasFrontmatter(content)) {
    console.log('File already has frontmatter. Use this for bare markdown files.');
    const proceed = await confirm({ message: 'Strip existing frontmatter and re-generate?', default: false });
    if (!proceed) process.exit(0);
  }

  // Strip frontmatter for processing
  const body = content.replace(/^---[\s\S]*?---\n*/, '');

  // Extract/generate metadata
  const extractedTitle = extractTitle(body, filename);
  const title = await input({
    message: 'Title:',
    default: extractedTitle,
    validate: (v) => (v.trim().length > 0 && v.trim().length <= 100) || 'Title required (max 100 chars)',
  });

  const extractedDesc = extractDescription(body);
  const description = await input({
    message: 'Description:',
    default: extractedDesc,
    validate: (v) => v.length <= 200 || 'Max 200 characters',
  });

  // Tag suggestion
  const suggested = suggestTags(body);
  if (suggested.length > 0) {
    console.log(`\nSuggested tags based on content: ${suggested.join(', ')}`);
  }

  const tagChoices = Object.entries(TAG_CATEGORIES).flatMap(([category, tags]) => [
    { name: `── ${category} ──`, value: '__separator__', disabled: '' },
    ...tags.map((tag) => ({
      name: suggested.includes(tag) ? `${tag} (suggested)` : tag,
      value: tag,
      checked: suggested.includes(tag),
    })),
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

  // Slug
  let slug = slugify(title);
  const taken = await existingSlugs();
  if (taken.has(slug)) {
    const suggested = findUniqueSlug(slug, taken);
    const choice = await input({
      message: `Slug "${slug}" exists. Enter new slug:`,
      default: suggested,
      validate: (v) => {
        const normalized = slugify(v.trim());
        if (!normalized) return 'Slug required';
        if (taken.has(normalized)) return `Slug "${normalized}" also exists`;
        return true;
      },
    });
    slug = slugify(choice.trim());
  }

  const isDraft = await confirm({ message: 'Create as draft?', default: true });

  // Build output
  const { iso, year, month } = today();
  const dir = join(WRITING_DIR, year, month);
  await mkdir(dir, { recursive: true });
  const outPath = join(dir, `${slug}.md`);

  // Remove first # heading from body if we extracted the title from it
  const cleanBody = body.replace(/^#\s+.+\n*/, '').trim();

  const frontmatter = [
    '---',
    `title: "${escapeYamlString(title)}"`,
    `description: "${escapeYamlString(description)}"`,
    `pubDate: ${iso}`,
    `tags: [${selectedTags.map((t) => `"${t}"`).join(', ')}]`,
  ];
  if (isDraft) frontmatter.push('draft: true');
  frontmatter.push('---', '');

  const output = frontmatter.join('\n') + '\n' + cleanBody + '\n';

  // Preview
  console.log('\n--- Preview ---');
  console.log(output.split('\n').slice(0, 15).join('\n'));
  if (output.split('\n').length > 15) console.log('...');
  console.log('--- End Preview ---\n');

  const ok = await confirm({ message: `Write to ${outPath}?`, default: true });
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  await writeFile(outPath, output, 'utf-8');
  console.log(`\nIngested: ${outPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
