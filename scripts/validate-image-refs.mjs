#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { UPLOADS_PATH_REGEX } from '../src/uploads-path.mjs';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const CONTENT_DIR = path.join(REPO_ROOT, 'src', 'content');
const POSTS_DIR = path.join(CONTENT_DIR, 'posts');
// Capture the URL only. Two forms: <...> (may contain spaces) or bare token
// (no spaces). Optional Markdown title in quotes or parens after whitespace.
const INLINE_RE = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s"'<>)]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;

const dirCache = new Map();

async function listDir(dir) {
  if (dirCache.has(dir)) return dirCache.get(dir);
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    entries = null;
  }
  dirCache.set(dir, entries);
  return entries;
}

// macOS APFS is case-insensitive; fs.existsSync would pass for wrong-case names.
// Walk every path segment beneath REPO_ROOT against the actual directory
// listing so wrong casing in intermediate segments fails locally too.
async function existsCaseSensitive(absPath) {
  const rel = path.relative(REPO_ROOT, absPath);
  // Refuse paths that escape the repo root (absolute or `..`-prefixed).
  if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
  const segments = rel.split(path.sep).filter(Boolean);
  let cursor = REPO_ROOT;
  for (const seg of segments) {
    const entries = await listDir(cursor);
    if (!entries || !entries.includes(seg)) return false;
    cursor = path.join(cursor, seg);
  }
  return true;
}

async function collectMarkdown(dir) {
  const out = [];
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!/\.mdx?$/.test(e.name)) continue;
    if (e.name.startsWith('_')) continue;
    const parent = e.parentPath ?? e.path ?? dir;
    out.push(path.join(parent, e.name));
  }
  return out;
}

function lineOf(raw, needle, fromIdx = 0) {
  const idx = raw.indexOf(needle, fromIdx);
  if (idx === -1) return 1;
  return raw.slice(0, idx).split('\n').length;
}

function decode(ref) {
  try {
    return decodeURIComponent(ref);
  } catch {
    return ref;
  }
}

function stripQS(ref) {
  return ref.replace(/[?#].*$/, '');
}

function resolveRef(ref, postFile) {
  const cleaned = stripQS(ref);
  if (UPLOADS_PATH_REGEX.test(cleaned)) {
    return path.join(REPO_ROOT, 'public', cleaned);
  }
  return path.resolve(path.dirname(postFile), cleaned);
}

function isExternal(ref) {
  return /^(https?:|data:)/i.test(ref);
}

async function validateFile(file, misses) {
  const raw = await readFile(file, 'utf8');
  const parsed = matter(raw);
  const rel = path.relative(REPO_ROOT, file);
  const isPost = file.startsWith(POSTS_DIR + path.sep);

  const refs = [];
  const hero = parsed.data?.heroImage;
  if (typeof hero === 'string' && hero.trim() !== '') {
    // Posts use bundle layout — heroImage must be a bare filename. Catch
    // legacy `/uploads/...` paths loudly so authors know to drop the prefix.
    if (isPost && hero.startsWith('/')) {
      misses.push(
        `${rel}:${lineOf(raw, 'heroImage:')}: posts use bundle layout — heroImage should be a bare filename, not '${hero}'. Drop the leading slash and place the file next to the post's index.md.`,
      );
      return;
    }
    refs.push({ ref: hero, line: lineOf(raw, 'heroImage:') });
  }

  const bodyOffset = raw.length - parsed.content.length;
  for (const m of parsed.content.matchAll(INLINE_RE)) {
    const absOffset = bodyOffset + m.index;
    const line = raw.slice(0, absOffset).split('\n').length;
    refs.push({ ref: (m[1] ?? m[2]).trim(), line });
  }

  for (const { ref, line } of refs) {
    if (!ref || isExternal(ref)) continue;
    const decoded = decode(ref);
    if (!decoded.trim()) continue;
    const abs = resolveRef(decoded, file);
    if (!(await existsCaseSensitive(abs))) {
      misses.push(`${rel}:${line}: missing image '${ref}'`);
    }
  }
}

async function main() {
  const files = await collectMarkdown(CONTENT_DIR);
  const misses = [];
  for (const f of files) {
    await validateFile(f, misses);
  }
  if (misses.length > 0) {
    for (const m of misses) console.error(m);
    process.exit(1);
  }
  console.log(`validate-image-refs: ${files.length} posts scanned, all refs resolved`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
