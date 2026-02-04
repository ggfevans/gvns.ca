/**
 * Shared types and helpers for GitHub activity data.
 */

// --- Schema interfaces ---

export interface GitHubContributions {
  total: number;
  commits: number;
  pullRequests: number;
  pullRequestReviews: number;
  issues: number;
  restricted: number;
}

export interface CalendarDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export interface GitHubCalendar {
  weeks: CalendarWeek[];
}

export interface GitHubStreak {
  current: number;
  longest: number;
  today: boolean;
}

export interface ActivityMeta {
  commitCount?: number;
  state?: string;
  merged?: boolean;
}

export type ActivityType = 'commit' | 'pr' | 'issue';

export interface ActivityItem {
  type: ActivityType;
  repo: string;
  repoUrl: string;
  title: string;
  url: string;
  date: string;
  meta?: ActivityMeta;
}

export interface GitHubStats {
  commitsThisWeek: number;
  commitsThisMonth: number;
  contributionsThisWeek: number;
  contributionsThisMonth: number;
  repositoriesThisWeek: number;
}

export interface GitHubRepository {
  name: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  url: string;
}

export interface GitHubData {
  lastUpdated: string;
  contributions: GitHubContributions;
  calendar: GitHubCalendar;
  streak: GitHubStreak;
  recentActivity: ActivityItem[];
  stats: GitHubStats;
  repositories: GitHubRepository[];
}

// --- Helpers ---

/** SVG path data for activity type icons (16x16 viewBox). */
const ACTIVITY_ICONS: Record<ActivityType, string> = {
  commit: 'M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.5 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 00.37.65l2.5 1.5a.75.75 0 00.76-1.3L8.5 7.85z',
  pr: 'M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z',
  issue: 'M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z',
};

/** Get the SVG path for an activity type icon. */
export function activityIconPath(type: ActivityType): string {
  return ACTIVITY_ICONS[type];
}

/** Get a human-readable label for an activity type. */
export function activityLabel(type: ActivityType): string {
  switch (type) {
    case 'commit': return 'Commit';
    case 'pr': return 'Pull request';
    case 'issue': return 'Issue';
  }
}

/** Format a streak count as a short string (e.g. "5 days", "1 day"). */
export function formatStreak(count: number): string {
  if (count === 0) return 'No streak';
  return `${count} day${count === 1 ? '' : 's'}`;
}

/** Default empty GitHubData for safe fallback. */
export const EMPTY_GITHUB_DATA: GitHubData = {
  lastUpdated: '',
  contributions: {
    total: 0,
    commits: 0,
    pullRequests: 0,
    pullRequestReviews: 0,
    issues: 0,
    restricted: 0,
  },
  calendar: { weeks: [] },
  streak: { current: 0, longest: 0, today: false },
  recentActivity: [],
  stats: {
    commitsThisWeek: 0,
    commitsThisMonth: 0,
    contributionsThisWeek: 0,
    contributionsThisMonth: 0,
    repositoriesThisWeek: 0,
  },
  repositories: [],
};

/** Safely load and validate GitHub data from the JSON import. */
export function parseGitHubData(raw: unknown): GitHubData {
  if (!raw || typeof raw !== 'object') return EMPTY_GITHUB_DATA;
  const data = raw as Record<string, unknown>;

  return {
    lastUpdated: typeof data.lastUpdated === 'string' ? data.lastUpdated : '',
    contributions: data.contributions && typeof data.contributions === 'object'
      ? data.contributions as GitHubContributions
      : EMPTY_GITHUB_DATA.contributions,
    calendar: data.calendar && typeof data.calendar === 'object'
      ? data.calendar as GitHubCalendar
      : EMPTY_GITHUB_DATA.calendar,
    streak: data.streak && typeof data.streak === 'object'
      ? data.streak as GitHubStreak
      : EMPTY_GITHUB_DATA.streak,
    recentActivity: Array.isArray(data.recentActivity)
      ? data.recentActivity as ActivityItem[]
      : EMPTY_GITHUB_DATA.recentActivity,
    stats: data.stats && typeof data.stats === 'object'
      ? data.stats as GitHubStats
      : EMPTY_GITHUB_DATA.stats,
    repositories: Array.isArray(data.repositories)
      ? data.repositories as GitHubRepository[]
      : EMPTY_GITHUB_DATA.repositories,
  };
}
