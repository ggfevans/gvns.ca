import commentsIndex from '../data/comments/_index.json';

export interface ThreadsReply {
  id: string;
  username: string;
  text: string;
  permalink: string;
  timestamp: string;
  hasReplies: boolean;
}

export interface CommentsData {
  slug: string;
  threadShortcode: string;
  threadUrl: string;
  replies: ThreadsReply[];
  fetchedAt: string;
  lastError: string | null;
}

export const EMPTY_COMMENTS: CommentsData = {
  slug: '',
  threadShortcode: '',
  threadUrl: '',
  replies: [],
  fetchedAt: new Date(0).toISOString(),
  lastError: null,
};

/**
 * Reply count for a post slug, read from the build-time comments index
 * (`src/data/comments/_index.json`). Returns 0 when the post has no entry
 * (never syndicated, no replies fetched yet, or the index is empty).
 */
export function getReplyCount(slug: string): number {
  const posts = (commentsIndex as { posts?: Record<string, { count?: unknown }> }).posts ?? {};
  const count = posts[slug]?.count;
  return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : 0;
}

export function parseCommentsData(raw: unknown): CommentsData {
  if (!raw || typeof raw !== 'object') return EMPTY_COMMENTS;
  const data = raw as Record<string, unknown>;
  return {
    slug: String(data.slug ?? ''),
    threadShortcode: String(data.threadShortcode ?? ''),
    threadUrl: String(data.threadUrl ?? ''),
    replies: Array.isArray(data.replies)
      ? data.replies
          .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
          .map((r) => ({
          id: String(r.id ?? ''),
          username: String(r.username ?? ''),
          text: String(r.text ?? ''),
          permalink: String(r.permalink ?? ''),
          timestamp: String(r.timestamp ?? ''),
          hasReplies: Boolean(r.hasReplies),
        }))
      : [],
    fetchedAt: String(data.fetchedAt ?? new Date(0).toISOString()),
    lastError: data.lastError != null ? String(data.lastError) : null,
  };
}
