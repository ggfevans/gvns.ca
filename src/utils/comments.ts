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
