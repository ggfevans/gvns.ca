/**
 * Shared formatting helpers for activity pages.
 */

/** Relative time string from an ISO date (e.g. "3h ago", "2d ago"). */
export function relativeTime(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);

  if (Number.isNaN(then.getTime())) return 'unknown date';

  const diffMs = now.getTime() - then.getTime();

  if (diffMs < 0) return 'just now';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return then.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

/** Truncate a string to `max` characters, appending an ellipsis if needed. */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).trimEnd() + '\u2026';
}

/** Validate a MusicBrainz ID (standard UUID format). */
const MBID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidMbid(id: string | null | undefined): id is string {
  return typeof id === 'string' && MBID_RE.test(id);
}

/** Validate a URL is safe to use as an href (http/https only). Returns undefined for invalid URLs. */
export function safeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
  } catch {
    // invalid URL
  }
  return undefined;
}

/** Format an ISO date string to a long human-readable timestamp. */
export function formatTimestamp(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
