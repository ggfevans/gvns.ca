/**
 * Extract the filename portion from a content collection slug/id.
 * Handles both flat (`2024/12/hello-world`) and bundle (`2024/12/hello-world/index`)
 * layouts → `hello-world`.
 */
export function getPostSlug(slug: string): string {
  const parts = slug.split('/').filter(Boolean);
  if (parts[parts.length - 1] === 'index') parts.pop();
  return parts[parts.length - 1] ?? slug;
}
