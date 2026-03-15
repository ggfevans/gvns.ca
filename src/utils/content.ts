/**
 * Extract the filename portion from a content collection slug/id.
 * e.g., "2024/12/hello-world" → "hello-world"
 */
export function getPostSlug(slug: string): string {
  return slug.split('/').pop() ?? slug;
}
