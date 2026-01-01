/**
 * Format a date as "December 9, 2024" using Canadian English locale.
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
