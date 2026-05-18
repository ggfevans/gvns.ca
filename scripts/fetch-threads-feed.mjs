import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const TOKEN = process.env.THREADS_ACCESS_TOKEN;
const OUT = resolve('src/data/threads.json');
const BASE = 'https://graph.threads.net/v1.0/me/threads';
const FIELDS = 'id,text,media_type,permalink,timestamp,is_quote_post';

if (!TOKEN) {
  console.error('Missing THREADS_ACCESS_TOKEN');
  process.exit(1);
}

async function api(qs) {
  const url = `${BASE}?${qs}&access_token=${TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Threads API ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.data ?? [];
}

function normalise(raw) {
  return {
    id: String(raw.id ?? ''),
    text: String(raw.text ?? ''),
    permalink: String(raw.permalink ?? ''),
    timestamp: String(raw.timestamp ?? ''),
    mediaType: String(raw.media_type ?? 'TEXT_POST'),
    isQuotePost: Boolean(raw.is_quote_post),
  };
}

try {
  // 1. Load existing data.
  let existing = { lastUpdated: null, posts: [] };
  try {
    const content = await readFile(OUT, 'utf8');
    existing = JSON.parse(content);
  } catch {}

  // 2. Pull 5 posts with all needed fields, filter to match persisted representation.
  const raw = await api(`fields=${FIELDS}&limit=5`);
  if (!raw.length) {
    console.log('No posts on account.');
    process.exit(0);
  }

  const posts = raw
    .map(normalise)
    .filter(p => !p.isQuotePost && p.mediaType !== 'REPOST_FACADE')
    .slice(0, 5);

  // 3. Compare filtered top post against last-seen id.
  const filteredTopId = String(posts[0]?.id ?? '');
  if (filteredTopId && String(existing.posts?.[0]?.id) === filteredTopId) {
    console.log(`Top post unchanged (${filteredTopId}); short-circuit.`);
    process.exit(0);
  }

  const payload = {
    lastUpdated: new Date().toISOString(),
    posts,
  };

  // Atomic write via tmp file
  const tmp = `${OUT}.tmp`;
  await writeFile(tmp, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  await import('node:fs/promises').then(fs => fs.rename(tmp, OUT));
  
  console.log(`Wrote ${posts.length} posts; top id ${posts[0]?.id}.`);
} catch (err) {
  console.error('Fetch failed; preserving existing threads.json.', err);
  process.exit(1);
}
