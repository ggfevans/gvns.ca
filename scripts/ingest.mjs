#!/usr/bin/env node

/**
 * Ingest a bare markdown file into the writing collection.
 *
 * Reads the file, extracts/generates frontmatter, suggests tags
 * based on content keywords, and copies to the correct date folder.
 *
 * Usage:
 *   npm run ingest -- path/to/file.md
 */

import { input, checkbox, confirm } from '@inquirer/prompts';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  slugify,
  today,
  findUniqueSlug,
  escapeYamlString,
  collectSlugs,
  TAG_CATEGORIES,
} from './lib/cli-utils.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const WRITING_DIR = join(ROOT, 'src', 'content', 'writing');

// Keyword-to-tag mapping for content-based tag suggestion.
// NOTE: This is intentionally duplicated from src/utils/tags.ts because .mjs
// scripts cannot import .ts modules without a build step. The canonical source
// is src/utils/tags.ts — keep both in sync when adding/removing keywords.
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
  'training programming': 'training', 'workout programming': 'training',
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

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run ingest -- path/to/file.md');
    process.exit(1);
  }

  const resolved = resolve(filePath);
  const filename = basename(resolved);

  // Check file exists before attempting to read
  let content;
  try {
    content = await readFile(resolved, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`File not found: ${resolved}`);
    } else {
      console.error(`Cannot read file "${filePath}": ${err.message}`);
    }
    process.exit(1);
  }

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
  const taken = await collectSlugs(WRITING_DIR);
  const slugValidate = (v) => {
    const normalized = slugify(v.trim());
    if (!normalized) return 'Slug required';
    if (taken.has(normalized)) return `Slug "${normalized}" already exists`;
    return true;
  };

  if (!slug || taken.has(slug)) {
    const suggested = slug ? findUniqueSlug(slug, taken) : '';
    const message = slug ? `Slug "${slug}" exists. Enter new slug:` : 'Title produced empty slug. Enter slug:';
    const choice = await input({ message, default: suggested || undefined, validate: slugValidate });
    slug = slugify(choice.trim());
  }

  const isDraft = await confirm({ message: 'Create as draft?', default: true });

  // Build output
  const { iso, year, month } = today();
  const dir = join(WRITING_DIR, year, month);
  await mkdir(dir, { recursive: true });
  const outPath = join(dir, `${slug}.md`);

  // Only remove first # heading if it matches the extracted title (not filename-derived)
  const headingMatch = body.match(/^#\s+(.+)$/m);
  const cleanBody = (headingMatch && headingMatch[1].trim() === extractedTitle)
    ? body.replace(/^#\s+.+\n*/, '').trim()
    : body.trim();

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
