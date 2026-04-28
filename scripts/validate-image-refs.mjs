#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { imageSize } from 'image-size';
import { UPLOADS_PATH_REGEX } from '../src/uploads-path.mjs';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const CONTENT_DIR = path.join(REPO_ROOT, 'src', 'content');
const DIMS_MANIFEST = path.join(REPO_ROOT, 'src', 'data', 'uploads-dims.json');
// Capture the URL only — strip surrounding whitespace, optional <...> brackets,
// and an optional Markdown title in single/double quotes or parentheses.
const INLINE_RE = /!\[[^\]]*\]\(\s*<?([^\s"'<>)]+)>?(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;

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
// Compare basename against actual directory listing for a case-sensitive check.
async function existsCaseSensitive(absPath) {
  const dir = path.dirname(absPath);
  const base = path.basename(absPath);
  const entries = await listDir(dir);
  if (!entries) return false;
  return entries.includes(base);
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

async function validateFile(file, misses, heroDims) {
  const raw = await readFile(file, 'utf8');
  const parsed = matter(raw);
  const rel = path.relative(REPO_ROOT, file);

  const refs = [];
  const hero = parsed.data?.heroImage;
  if (typeof hero === 'string' && hero.trim() !== '') {
    refs.push({ ref: hero, line: lineOf(raw, 'heroImage:'), isHero: true });
  }

  const bodyOffset = raw.length - parsed.content.length;
  for (const m of parsed.content.matchAll(INLINE_RE)) {
    const absOffset = bodyOffset + m.index;
    const line = raw.slice(0, absOffset).split('\n').length;
    refs.push({ ref: m[1].trim(), line, isHero: false });
  }

  for (const { ref, line, isHero } of refs) {
    if (!ref || isExternal(ref)) continue;
    const decoded = decode(ref);
    if (!decoded.trim()) continue;
    const abs = resolveRef(decoded, file);
    if (!(await existsCaseSensitive(abs))) {
      misses.push(`${rel}:${line}: missing image '${ref}'`);
      continue;
    }
    const dimsKey = stripQS(decoded);
    if (isHero && UPLOADS_PATH_REGEX.test(dimsKey) && !heroDims.has(dimsKey)) {
      try {
        const buf = await readFile(abs);
        const { width, height } = imageSize(buf);
        if (typeof width === 'number' && typeof height === 'number') {
          heroDims.set(dimsKey, [width, height]);
        }
      } catch {
        // Probe is best-effort. Render falls back to no width/height.
      }
    }
  }
}

async function main() {
  const files = await collectMarkdown(CONTENT_DIR);
  const misses = [];
  const heroDims = new Map();
  for (const f of files) {
    await validateFile(f, misses, heroDims);
  }
  if (misses.length > 0) {
    for (const m of misses) console.error(m);
    process.exit(1);
  }
  const dimsObj = Object.fromEntries([...heroDims.entries()].sort());
  await writeFile(DIMS_MANIFEST, JSON.stringify(dimsObj, null, 2) + '\n', 'utf8');
  console.log(
    `validate-image-refs: ${files.length} posts scanned, ${heroDims.size} hero dims cached`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
