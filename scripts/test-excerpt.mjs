#!/usr/bin/env node
// Scratch test runner for src/utils/excerpt.ts.
// Run via: npx tsx scripts/test-excerpt.mjs
// Exits non-zero on any failed assertion.

import { getExcerpt } from '../src/utils/excerpt.ts';

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(msg);
    console.error(`  FAIL: ${msg}`);
  }
}

function test(name, fn) {
  console.log(`\n• ${name}`);
  try {
    fn();
  } catch (err) {
    failed += 1;
    failures.push(`${name}: threw ${err.message}`);
    console.error(`  THREW: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('short input returns full plain text untouched', () => {
  const md = 'Hello world.';
  const out = getExcerpt(md, 500);
  assert(out === 'Hello world.', `expected "Hello world.", got "${out}"`);
});

test('strips YAML frontmatter', () => {
  const md = `---\ntitle: Example\npubDate: 2024-01-01\n---\n\nBody starts here.`;
  const out = getExcerpt(md, 500);
  assert(!out.includes('title:'), 'frontmatter leaked into output');
  assert(out.startsWith('Body starts here'), `got: ${out}`);
});

test('strips headings, keeps text', () => {
  const md = `# Heading One\n\nSome paragraph text after.`;
  const out = getExcerpt(md, 500);
  assert(!out.includes('#'), 'hash leaked');
  assert(out.includes('Heading One'), 'heading text dropped');
  assert(out.includes('Some paragraph text after.'), 'body dropped');
});

test('drops fenced code blocks entirely', () => {
  const md = `Intro paragraph.\n\n\`\`\`js\nconst secret = 42;\n\`\`\`\n\nAfter code.`;
  const out = getExcerpt(md, 500);
  assert(!out.includes('secret'), `code leaked: ${out}`);
  assert(out.includes('Intro paragraph.'), 'intro dropped');
  assert(out.includes('After code.'), 'post-code dropped');
});

test('keeps link label, drops URL', () => {
  const md = `See [the docs](https://example.com/path) for more.`;
  const out = getExcerpt(md, 500);
  assert(out.includes('the docs'), 'label dropped');
  assert(!out.includes('https://'), `url leaked: ${out}`);
  assert(!out.includes('example.com'), `url leaked: ${out}`);
});

test('strips bold/italic/strikethrough markers', () => {
  const md = `This is **bold** and _italic_ and ~~struck~~ text.`;
  const out = getExcerpt(md, 500);
  assert(out === 'This is bold and italic and struck text.', `got: ${out}`);
});

test('paragraph boundary truncation', () => {
  const p1 = 'A'.repeat(200) + '.';
  const p2 = 'B'.repeat(200) + '.';
  const p3 = 'C'.repeat(400) + '.';
  const md = `${p1}\n\n${p2}\n\n${p3}`;
  const out = getExcerpt(md, 500);
  // Should clamp at the second paragraph break (after p2).
  assert(out.endsWith('.'), `expected to end on full sentence; got tail: ${out.slice(-20)}`);
  assert(!out.includes('C'), 'p3 should not appear');
  assert(out.length <= 500, `length ${out.length} > 500`);
});

test('sentence boundary fallback when no good paragraph break', () => {
  // One long paragraph of moderate sentences — multiple sentence breaks
  // within the maxChars window, no double newlines.
  const sentence = 'This sentence is exactly forty-eight chars long. ';
  const long = sentence.repeat(20); // ~960 chars
  const out = getExcerpt(long, 500);
  assert(out.length <= 500, `length ${out.length} > 500`);
  assert(/[.!?]$/.test(out), `should end at sentence punctuation; got tail: ${out.slice(-30)}`);
});

test('word boundary fallback when no sentence break in window', () => {
  // No periods at all in first 500 chars — only spaces.
  const words = Array(200).fill('word').join(' '); // ~999 chars
  const out = getExcerpt(words, 500);
  assert(out.length <= 500, `length ${out.length} > 500`);
  // Must end on a complete "word" (no partial).
  assert(/word…?$/.test(out), `should end on complete word + optional ellipsis; got tail: ${out.slice(-15)}`);
});

test('never truncates mid-word', () => {
  // Build a string where char #500 lands in the middle of a word.
  const filler = 'x'.repeat(495); // 495 chars
  const md = `${filler} supercalifragilisticexpialidocious tail`;
  const out = getExcerpt(md, 500);
  assert(out.length <= 500, `length ${out.length} > 500`);
  // Must not end with a partial slice of "supercalifragilistic..."
  assert(
    !/super[a-z]+$/.test(out.replace(/…$/, '')),
    `mid-word cut detected: tail "${out.slice(-30)}"`
  );
});

test('output never exceeds maxChars (excluding optional ellipsis)', () => {
  const longUnbroken = 'lorem ipsum dolor sit amet '.repeat(100); // ~2700
  const out = getExcerpt(longUnbroken, 500);
  // We allow trailing … so strip it for the length check.
  const stripped = out.replace(/…$/, '');
  assert(stripped.length <= 500, `stripped length ${stripped.length} > 500`);
});

test('handles full post with frontmatter + headings + code + links', () => {
  const md = `---
title: A real post
pubDate: 2025-01-01
tags: [code]
---

# Title here

This is the **opening paragraph** with a [link](https://example.com).

\`\`\`ts
const leaked = "should not appear";
\`\`\`

## Section two

More body text follows here, and should still be readable.`;
  const out = getExcerpt(md, 500);
  assert(!out.includes('---'), 'frontmatter delimiter leaked');
  assert(!out.includes('leaked'), 'code content leaked');
  assert(!out.includes('https://'), 'url leaked');
  assert(out.includes('Title here'), 'heading text missing');
  assert(out.includes('opening paragraph'), 'bold inner text missing');
  assert(out.includes('link'), 'link label missing');
});

test('respects custom maxChars', () => {
  const md = 'a '.repeat(200);
  const out = getExcerpt(md, 50);
  assert(out.replace(/…$/, '').length <= 50, `length ${out.length} > 50`);
});

test('handles empty input', () => {
  assert(getExcerpt('', 500) === '', 'empty input should yield empty');
});

test('handles input with only frontmatter', () => {
  const md = `---\ntitle: x\n---\n`;
  const out = getExcerpt(md, 500);
  assert(out === '', `expected empty, got "${out}"`);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\nFailures:');
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
