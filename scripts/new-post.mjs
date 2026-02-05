#!/usr/bin/env node

/**
 * Scaffold a new blog post with valid frontmatter.
 *
 * Usage:
 *   npm run new-post
 *   npm run new-post -- "My Post Title"
 */

import { input, checkbox, confirm } from '@inquirer/prompts';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
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

async function main() {
  // Title — from CLI arg or prompt
  const cliTitle = process.argv.slice(2).join(' ').trim();
  const validateTitle = (v) => (v.trim().length > 0 && v.trim().length <= 100) || 'Title required (max 100 chars)';

  // Validate CLI title if provided, otherwise prompt
  if (cliTitle && validateTitle(cliTitle) !== true) {
    console.error(validateTitle(cliTitle));
    process.exit(1);
  }

  const title =
    cliTitle ||
    (await input({
      message: 'Post title:',
      validate: validateTitle,
    }));

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
    `title: "${escapeYamlString(title)}"`,
    description ? `description: "${escapeYamlString(description)}"` : `description: ""`,
    `pubDate: ${iso}`,
    `tags: [${selectedTags.map((t) => `"${t}"`).join(', ')}]`,
  ];
  if (isDraft) frontmatter.push('draft: true');
  frontmatter.push('---', '', '');

  try {
    await writeFile(filePath, frontmatter.join('\n'), { encoding: 'utf-8', flag: 'wx' });
  } catch (err) {
    if (err.code === 'EEXIST') {
      console.error(`File already exists: ${filePath}`);
    } else {
      console.error(`Failed to write file: ${err.message}`);
    }
    process.exit(1);
  }

  console.log(`\nCreated: ${filePath}`);

  // Try to open in $EDITOR (using execFile to avoid shell injection)
  if (process.env.EDITOR) {
    try {
      // Parse EDITOR in case it contains arguments (e.g., "code --wait")
      // Note: This simple split won't handle quoted paths with spaces.
      // For complex EDITOR values, users should use a wrapper script.
      const editorParts = process.env.EDITOR.split(/\s+/);
      const editorCmd = editorParts[0];
      const editorArgs = [...editorParts.slice(1), filePath];
      execFile(editorCmd, editorArgs, (err) => {
        if (err) {
          console.warn(`Could not open editor: ${err.message}`);
        }
      });
    } catch (err) {
      console.warn(`Editor launch failed: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
