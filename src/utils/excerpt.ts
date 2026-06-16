const DEFAULT_MAX_WORDS = 160;
const ELLIPSIS = '…';

/**
 * Build a plain-text teaser from raw markdown/MDX body content.
 *
 * Strips HTML and markdown syntax (keeping link/anchor text, dropping URLs,
 * code, and images), collapses whitespace, and returns the first `maxWords`
 * words. Appends an ellipsis only when the source was longer, so short posts
 * render in full with no dangling "…".
 *
 * Used by the homepage featured card so it shows a teaser rather than the
 * full post inline. Kept separate from `getReadingTime` (which drops link
 * text wholesale — fine for counting, wrong for readable prose).
 */
export function getExcerpt(content: string, maxWords: number = DEFAULT_MAX_WORDS): string {
  // Clamp to a sane positive integer so a stray 0/negative/float caller can't
  // break the "first N words" contract.
  const limit = Number.isFinite(maxWords) ? Math.max(1, Math.floor(maxWords)) : DEFAULT_MAX_WORDS;

  // Strip HTML comments and tags iteratively (handles nested/crafted tags like
  // <scr<script>ipt>). Only real tags (<tag>, </tag>) are removed, so prose
  // like "x < y > z" survives.
  let text = content;
  let previous: string;
  do {
    previous = text;
    text = text
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\/?[A-Za-z][^>]*>/g, '');
  } while (text !== previous);

  text = text
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images → drop entirely
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → keep text, drop URL
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // ATX heading markers
    .replace(/^\s*>\s?/gm, '') // blockquote markers
    .replace(/^\s*[-+*]\s+/gm, '') // bullet list markers
    .replace(/^\s*\d+\.\s+/gm, '') // ordered list markers
    .replace(/[*_~]/g, '') // emphasis / strikethrough
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();

  const words = text.split(' ').filter(Boolean);
  if (words.length <= limit) return words.join(' ');
  return words.slice(0, limit).join(' ') + ELLIPSIS;
}
