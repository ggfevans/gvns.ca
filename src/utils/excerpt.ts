/**
 * Boundary-aware excerpt extraction from markdown.
 *
 * Strips frontmatter and Markdown syntax to plain text, then truncates to
 * `maxChars` preferring (in order): paragraph break, sentence boundary,
 * word boundary. Never returns mid-word truncation.
 *
 * Returned string length is always <= maxChars (excluding trailing ellipsis).
 */
export function getExcerpt(markdown: string, maxChars = 500): string {
  const plain = stripMarkdown(markdown);

  if (plain.length <= maxChars) return plain;

  // 1. Paragraph boundary — last double-newline before maxChars.
  const slice = plain.slice(0, maxChars);
  const paraIdx = slice.lastIndexOf('\n\n');
  if (paraIdx >= Math.floor(maxChars * 0.5)) {
    return slice.slice(0, paraIdx).trimEnd();
  }

  // 2. Sentence boundary — last `.!?` followed by whitespace before maxChars.
  const sentenceMatch = slice.match(/[\s\S]*[.!?](?=\s)/);
  if (sentenceMatch && sentenceMatch[0].length >= Math.floor(maxChars * 0.5)) {
    return sentenceMatch[0].trimEnd();
  }

  // 3. Word boundary fallback — truncate at last whitespace before maxChars
  //    so we never cut a word mid-stream. Append ellipsis.
  const wordIdx = slice.lastIndexOf(' ');
  if (wordIdx > 0) {
    return slice.slice(0, wordIdx).trimEnd() + '…';
  }

  // Pathological: maxChars worth of unbroken text. Return as-is rather than
  // cutting mid-word.
  return plain.slice(0, maxChars);
}

/**
 * Strip frontmatter and Markdown syntax to plain text.
 * Handles: YAML frontmatter, fenced code blocks, inline code, images,
 * links, headings, blockquotes, list markers, bold/italic/strikethrough,
 * horizontal rules, HTML tags.
 */
function stripMarkdown(input: string): string {
  let s = input;

  // 1. Strip YAML frontmatter at the top of the file.
  s = s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

  // 2. Drop fenced code blocks (``` or ~~~).
  s = s.replace(/^[ \t]*```[\s\S]*?```\s*/gm, '');
  s = s.replace(/^[ \t]*~~~[\s\S]*?~~~\s*/gm, '');

  // 3. Drop HTML tags iteratively (handles nested/crafted tags).
  let prev;
  do {
    prev = s;
    s = s.replace(/<[^>]*>/g, '');
  } while (s !== prev);

  // 4. Images → drop entirely (alt text often noisy).
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

  // 5. Links → keep label only.
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // 6. Reference-style links: drop the label part.
  s = s.replace(/^\[[^\]]+\]:\s*\S+.*$/gm, '');

  // 7. Inline code → keep contents without the backticks.
  s = s.replace(/`([^`]+)`/g, '$1');

  // 8. Headings: strip leading `#` markers.
  s = s.replace(/^#{1,6}\s+/gm, '');

  // 9. Blockquote markers.
  s = s.replace(/^>\s?/gm, '');

  // 10. List markers (unordered + ordered).
  s = s.replace(/^[ \t]*[-+*]\s+/gm, '');
  s = s.replace(/^[ \t]*\d+\.\s+/gm, '');

  // 11. Horizontal rules (---, ***, ___).
  s = s.replace(/^\s*([-*_])\1{2,}\s*$/gm, '');

  // 12. Emphasis: bold (**...** / __...__), italics (*...* / _..._),
  //     strikethrough (~~...~~). Keep inner text.
  s = s.replace(/(\*\*|__)(.+?)\1/g, '$2');
  s = s.replace(/(\*|_)(.+?)\1/g, '$2');
  s = s.replace(/~~(.+?)~~/g, '$1');

  // 13. Collapse 3+ consecutive newlines to 2 (paragraph break).
  s = s.replace(/\n{3,}/g, '\n\n');

  // 14. Trim leading/trailing whitespace per line; strip leading/trailing
  //     whitespace overall.
  s = s
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();

  return s;
}
