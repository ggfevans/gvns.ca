#!/usr/bin/env node

/**
 * POSSE syndication script — posts unsyndicated posts to Bluesky, Mastodon, and Threads.
 *
 * Usage:
 *   node scripts/syndicate.mjs            # Post unsyndicated content
 *   node scripts/syndicate.mjs --dry-run  # Preview without posting
 *
 * Environment variables:
 *   BLUESKY_HANDLE        — Bluesky handle (e.g. gvns.ca)
 *   BLUESKY_APP_PASSWORD  — Bluesky app password
 *   MASTODON_INSTANCE     — Mastodon instance URL (e.g. https://mastodon.social)
 *   MASTODON_TOKEN        — Mastodon access token
 *   THREADS_USER_ID       — Threads user ID
 *   THREADS_ACCESS_TOKEN  — Threads access token
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { BskyAgent, RichText } from '@atproto/api';
import { createRestAPIClient } from 'masto';
import { createThreadsContainer, publishThreadsContainer } from '@codybrom/denim';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const SITE_URL = (process.env.SITE_URL || 'https://gvns.ca').replace(/\/+$/, '');

const DRY_RUN = process.argv.includes('--dry-run');

// Tags that route to Mastodon only (no Bluesky)
const MASTODON_ONLY_TAGS = new Set(['bjj', 'movement', 'training']);

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

/** Determine which platforms a post should be syndicated to. */
function getTargetPlatforms(tags) {
  const hasMastodonOnly = tags.some((t) => MASTODON_ONLY_TAGS.has(t));
  if (hasMastodonOnly) return ['mastodon'];
  return ['bluesky', 'mastodon', 'threads'];
}

/** Get the slug from a markdown file path. */
function getSlug(filePath) {
  return basename(filePath, '.md');
}

/** Prefer canonicalUrl from frontmatter when available and safe. */
function getPostUrl(frontmatter, slug) {
  const canonicalUrl = typeof frontmatter.canonicalUrl === 'string'
    ? frontmatter.canonicalUrl.trim()
    : '';
  if (canonicalUrl) {
    try {
      const resolved = new URL(canonicalUrl, `${SITE_URL}/`);
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        return resolved.toString();
      }
    } catch {
      // fall through to default URL
    }
  }
  return `${SITE_URL}/posts/${slug}/`;
}

/** Format post text for syndication. */
function formatPostText({ title, description, url, tags }) {
  const hashtags = tags.map((t) => `#${t.replace(/-/g, '')}`).join(' ');
  return `📝 ${title}\n\n${description}\n\n${url}\n\n${hashtags}`;
}

/** Check which platforms still need syndication for a post. */
function getMissingSyndications(frontmatter, targetPlatforms) {
  const existing = (frontmatter.syndication || []).map((s) => s.platform);
  return targetPlatforms.filter((p) => !existing.includes(p));
}

// ---------------------------------------------------------------------------
// Platform clients
// ---------------------------------------------------------------------------

async function postToBluesky({ title, description, url, tags }) {
  const agent = new BskyAgent({ service: 'https://bsky.social' });
  await agent.login({
    identifier: process.env.BLUESKY_HANDLE,
    password: process.env.BLUESKY_APP_PASSWORD,
  });

  const text = formatPostText({ title, description, url, tags });
  const rt = new RichText({ text });
  await rt.detectFacets(agent);

  const post = {
    $type: 'app.bsky.feed.post',
    text: rt.text,
    facets: rt.facets,
    embed: {
      $type: 'app.bsky.embed.external',
      external: {
        uri: url,
        title,
        description: description || '',
      },
    },
    createdAt: new Date().toISOString(),
  };

  const response = await agent.post(post);
  // Build the web URL from the response URI
  // URI format: at://did:plc:xxx/app.bsky.feed.post/rkey
  const parts = response.uri.split('/');
  const did = parts[2];
  const rkey = parts[4];
  const handle = process.env.BLUESKY_HANDLE;
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

async function postToMastodon({ title, description, url, tags }) {
  const client = createRestAPIClient({
    url: process.env.MASTODON_INSTANCE,
    accessToken: process.env.MASTODON_TOKEN,
  });

  const text = formatPostText({ title, description, url, tags });
  const status = await client.v1.statuses.create({
    status: text,
    visibility: 'public',
  });

  return status.url;
}

async function postToThreads({ title, description, url, tags }) {
  const text = formatPostText({ title, description, url, tags });

  const containerId = await createThreadsContainer({
    userId: process.env.THREADS_USER_ID,
    accessToken: process.env.THREADS_ACCESS_TOKEN,
    mediaType: 'TEXT',
    text,
    linkAttachment: url,
  });

  const result = await publishThreadsContainer(
    process.env.THREADS_USER_ID,
    process.env.THREADS_ACCESS_TOKEN,
    containerId,
    true, // getPermalink
  );

  // permalink format: https://www.threads.com/@user/post/SHORTCODE
  if (!result.permalink || typeof result.permalink !== 'string') {
    throw new Error(`Threads API returned no permalink for container ${containerId}`);
  }
  const postMatch = result.permalink.match(/\/post\/([^/?#]+)/);
  if (!postMatch) {
    throw new Error(`Unexpected Threads permalink format: ${result.permalink}`);
  }
  const shortcode = postMatch[1];

  return { url: result.permalink, mediaId: result.id, shortcode };
}

// ---------------------------------------------------------------------------
// Frontmatter update
// ---------------------------------------------------------------------------

async function writeSyndicationToFrontmatter(filePath, platform, syndicationUrl, extraFields = {}) {
  const raw = await readFile(filePath, 'utf-8');
  const { data, content } = matter(raw);

  if (!data.syndication) {
    data.syndication = [];
  }

  data.syndication.push({
    platform,
    url: syndicationUrl,
    syndicatedAt: new Date().toISOString().split('T')[0],
    ...extraFields,
  });

  const updated = matter.stringify(content, data);
  await writeFile(filePath, updated, 'utf-8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (DRY_RUN) {
    console.log('🏃 DRY RUN — no posts will be published\n');
  }

  const files = await collectMarkdownFiles(POSTS_DIR);
  let syndicatedPlatformCount = 0;

  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf-8');
    const { data: frontmatter } = matter(raw);

    // Skip drafts
    if (frontmatter.draft) continue;

    const slug = getSlug(filePath);
    const url = getPostUrl(frontmatter, slug);
    const tags = frontmatter.tags || [];
    const targetPlatforms = getTargetPlatforms(tags);
    const missing = getMissingSyndications(frontmatter, targetPlatforms);

    if (missing.length === 0) continue;

    console.log(`\n📄 ${frontmatter.title} (${slug})`);
    console.log(`   URL: ${url}`);
    console.log(`   Tags: ${tags.join(', ')}`);
    console.log(`   Targets: ${targetPlatforms.join(', ')}`);
    console.log(`   Missing: ${missing.join(', ')}`);

    for (const platform of missing) {
      try {
        if (DRY_RUN) {
          console.log(`   ✅ [DRY RUN] Would post to ${platform}`);
          const previewText = formatPostText({
            title: frontmatter.title,
            description: frontmatter.description || '',
            url,
            tags,
          });
          console.log(`   Preview:\n${previewText.split('\n').map((l) => `      ${l}`).join('\n')}`);
          continue;
        }

        // Validate credentials before posting
        if (platform === 'bluesky') {
          if (!process.env.BLUESKY_HANDLE || !process.env.BLUESKY_APP_PASSWORD) {
            console.error(`   ❌ Skipping Bluesky — missing BLUESKY_HANDLE or BLUESKY_APP_PASSWORD`);
            continue;
          }
          console.log(`   ⏳ Posting to Bluesky...`);
          const syndicationUrl = await postToBluesky({
            title: frontmatter.title,
            description: frontmatter.description || '',
            url,
            tags,
          });
          console.log(`   ✅ Bluesky: ${syndicationUrl}`);
          try {
            await writeSyndicationToFrontmatter(filePath, 'bluesky', syndicationUrl);
          } catch (writeErr) {
            console.error(`   ❌ CRITICAL: Posted to Bluesky (${syndicationUrl}) but failed to save frontmatter: ${writeErr.message}`);
            console.error(`   ❌ Manually add syndication entry to prevent duplicate post.`);
            throw writeErr;
          }
        }

        if (platform === 'mastodon') {
          if (!process.env.MASTODON_INSTANCE || !process.env.MASTODON_TOKEN) {
            console.error(`   ❌ Skipping Mastodon — missing MASTODON_INSTANCE or MASTODON_TOKEN`);
            continue;
          }
          console.log(`   ⏳ Posting to Mastodon...`);
          const syndicationUrl = await postToMastodon({
            title: frontmatter.title,
            description: frontmatter.description || '',
            url,
            tags,
          });
          console.log(`   ✅ Mastodon: ${syndicationUrl}`);
          try {
            await writeSyndicationToFrontmatter(filePath, 'mastodon', syndicationUrl);
          } catch (writeErr) {
            console.error(`   ❌ CRITICAL: Posted to Mastodon (${syndicationUrl}) but failed to save frontmatter: ${writeErr.message}`);
            console.error(`   ❌ Manually add syndication entry to prevent duplicate post.`);
            throw writeErr;
          }
        }

        if (platform === 'threads') {
          if (!process.env.THREADS_USER_ID || !process.env.THREADS_ACCESS_TOKEN) {
            console.error(`   ❌ Skipping Threads — missing THREADS_USER_ID or THREADS_ACCESS_TOKEN`);
            continue;
          }
          console.log(`   ⏳ Posting to Threads...`);
          const result = await postToThreads({
            title: frontmatter.title,
            description: frontmatter.description || '',
            url,
            tags,
          });
          console.log(`   ✅ Threads: ${result.url}`);
          try {
            await writeSyndicationToFrontmatter(filePath, 'threads', result.url, {
              mediaId: result.mediaId,
              shortcode: result.shortcode,
            });
          } catch (err) {
            console.error(
              `   ❌ Threads post published but frontmatter update failed. ` +
              `Persist manually before rerunning: url=${result.url} mediaId=${result.mediaId} shortcode=${result.shortcode}`
            );
            throw err;
          }
        }

        syndicatedPlatformCount++;
      } catch (err) {
        console.error(`   ❌ Failed to post to ${platform}: ${err.message}`);
        // Continue to next platform — one failure doesn't block others
      }
    }
  }

  if (syndicatedPlatformCount === 0 && !DRY_RUN) {
    console.log('\n✨ No new syndications performed.');
  } else if (!DRY_RUN) {
    console.log(`\n✨ Syndicated to ${syndicatedPlatformCount} platform(s).`);
  }
}

main().catch((err) => {
  console.error(`\n💥 Fatal error: ${err.message}`);
  process.exit(1);
});
