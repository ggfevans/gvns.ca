const WORDS_PER_MINUTE = 200;

/**
 * Calculate reading time in minutes for given content.
 * Strips markdown/HTML before counting words.
 * Returns minimum of 1 minute.
 */
export function getReadingTime(content: string): number {
  // Strip HTML tags iteratively to handle nested/crafted tags like <scr<script>ipt>
  let withoutHtml = content;
  let previous;
  do {
    previous = withoutHtml;
    withoutHtml = withoutHtml.replace(/<[^>]*>/g, '');
  } while (withoutHtml !== previous);

  // Strip markdown syntax (links, images, bold, italic, code, etc.)
  const withoutMarkdown = withoutHtml
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[.*?\]\(.*?\)/g, '') // links
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`[^`]*`/g, '') // inline code
    .replace(/[*_~#>]/g, '') // formatting characters
    .replace(/^\s*[-+*]\s/gm, '') // list markers
    .replace(/^\s*\d+\.\s/gm, ''); // numbered list markers

  // Count words (split on whitespace, filter empty strings)
  const words = withoutMarkdown
    .split(/\s+/)
    .filter((word) => word.length > 0);

  const minutes = Math.ceil(words.length / WORDS_PER_MINUTE);

  // Return at least 1 minute
  return Math.max(1, minutes);
}
