#!/usr/bin/env node

/**
 * Fetch Threads replies for syndicated posts.
 *
 * Walks src/content/posts/ for non-draft posts with a Threads syndication
 * entry that includes a mediaId, fetches top-level replies via denim, and
 * writes normalised JSON to src/data/comments/{slug}.json.
 *
 * On API failure for any individual post the existing file is left untouched
 * (last-good cache). An aggregate _index.json is always written at the end.
 *
 * Usage:
 *   node scripts/fetch-comments.mjs
 *
 * Environment variables:
 *   THREADS_ACCESS_TOKEN  — Threads long-lived access token (required)
 *   THREADS_USER_ID       — Threads user ID (available but unused here)
 */

import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { getReplies } from '@codybrom/denim';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const COMMENTS_DIR = join(ROOT, 'src', 'data', 'comments');

// Fields to request from the Threads API
const REPLY_FIELDS = ['id', 'username', 'text', 'timestamp', 'permalink', 'has_replies', 'replied_to'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect all .md files from a directory. */
async function collectMarkdownFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (extname(entry.name) === '.md') {
      files.push(fullPath);
    }
  }
  return files;
}

/** Get the slug from a markdown file path. */
function getSlug(filePath) {
  return basename(filePath, '.md');
}

/** Check whether a file exists. */
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Normalise a raw Threads API reply object to the ThreadsReply shape. */
function normaliseReply(raw) {
  return {
    id: String(raw.id ?? ''),
    username: String(raw.username ?? ''),
    text: String(raw.text ?? ''),
    permalink: String(raw.permalink ?? ''),
    timestamp: String(raw.timestamp ?? ''),
    hasReplies: Boolean(raw.has_replies),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('WARNING: THREADS_ACCESS_TOKEN is not set — skipping comment fetch.');
    process.exit(0);
  }

  // Ensure the output directory exists
  await mkdir(COMMENTS_DIR, { recursive: true });

  const files = await collectMarkdownFiles(POSTS_DIR);

  // Collect qualifying posts (non-draft, has Threads syndication with mediaId)
  const qualifying = [];
  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf-8');
    const { data: frontmatter } = matter(raw);

    if (frontmatter.draft) continue;

    const syndications = Array.isArray(frontmatter.syndication) ? frontmatter.syndication : [];
    const threadsSyndication = syndications.find(
      (s) => s.platform === 'threads' && s.mediaId,
    );
    if (!threadsSyndication) continue;

    qualifying.push({
      filePath,
      slug: getSlug(filePath),
      mediaId: String(threadsSyndication.mediaId),
      shortcode: String(threadsSyndication.shortcode ?? ''),
      threadUrl: String(threadsSyndication.url ?? ''),
    });
  }

  console.log(`Found ${qualifying.length} post(s) with Threads syndication.`);

  const indexEntries = {};

  for (const post of qualifying) {
    const { slug, mediaId, shortcode, threadUrl } = post;
    const outputPath = join(COMMENTS_DIR, `${slug}.json`);

    console.log(`\nFetching replies for: ${slug} (mediaId: ${mediaId})`);

    try {
      const response = await getReplies(
        mediaId,
        accessToken,
        { limit: 50 }, // v1 cap; replies beyond this are silently truncated
        REPLY_FIELDS,
        false, // reverse=false → chronological order
      );

      const rawReplies = Array.isArray(response?.data) ? response.data : [];
      const replies = rawReplies.map(normaliseReply);

      const commentsData = {
        slug,
        threadShortcode: shortcode,
        threadUrl,
        replies,
        fetchedAt: new Date().toISOString(),
        lastError: null,
      };

      await writeFile(outputPath, JSON.stringify(commentsData, null, 2), 'utf-8');
      console.log(`  Wrote ${replies.length} reply/replies to ${slug}.json`);

      indexEntries[slug] = {
        count: replies.length,
        fetchedAt: commentsData.fetchedAt,
        lastError: null,
      };
    } catch (err) {
      const errorMessage = err.message ?? String(err);
      console.warn(`  WARNING: Failed to fetch replies for ${slug}: ${errorMessage}`);

      // Leave existing file untouched (last-good cache)
      // Record the error in the index, preserving any existing count
      let existingCount = 0;
      if (await fileExists(outputPath)) {
        try {
          const existing = JSON.parse(await readFile(outputPath, 'utf-8'));
          existingCount = Array.isArray(existing.replies) ? existing.replies.length : 0;
        } catch {
          // Existing file is unreadable — count stays 0
        }
      }

      indexEntries[slug] = {
        count: existingCount,
        fetchedAt: new Date().toISOString(),
        lastError: errorMessage,
      };
    }
  }

  // Write aggregate index
  const index = {
    posts: indexEntries,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(join(COMMENTS_DIR, '_index.json'), JSON.stringify(index, null, 2), 'utf-8');
  console.log('\nWrote src/data/comments/_index.json');

  const errorCount = Object.values(indexEntries).filter((e) => e.lastError !== null).length;
  const successCount = Object.values(indexEntries).filter((e) => e.lastError === null).length;
  console.log(`\nDone. ${successCount} succeeded, ${errorCount} failed.`);
}

main().catch((err) => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
