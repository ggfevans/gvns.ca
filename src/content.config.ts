import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  schema: () =>
    z.object({
      title: z.string().max(100),
      description: z.string().max(200),
      pubDate: z.coerce.date(),
      updatedDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
      tags: z.array(z.string()).min(1).max(4),
      draft: z.boolean().default(false),
      heroImage: z.preprocess(
        emptyToUndefined,
        z
          .string()
          .regex(/^\/uploads\//, 'heroImage must be an absolute /uploads/... path')
          .optional()
      ),
      canonicalUrl: z.preprocess(emptyToUndefined, z.string().url().optional()),
      syndication: z
        .array(
          z.object({
            platform: z.enum(['bluesky', 'mastodon', 'threads', 'linkedin']),
            url: z.string().url(),
            syndicatedAt: z.coerce.date(),
            mediaId: z.string().optional(),
            shortcode: z.string().optional(),
          })
        )
        .optional(),
    }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/work' }),
  schema: () =>
    z.object({
      title: z.string().max(100),
      description: z.string().max(200),
      url: z.string().url().optional(),
      repo: z.string().url().optional(),
      status: z.enum(['active', 'maintained', 'archived']),
      tags: z.array(z.string()).min(1).max(6),
      heroImage: z.preprocess(
        emptyToUndefined,
        z
          .string()
          .regex(/^\/uploads\//, 'heroImage must be an absolute /uploads/... path')
          .optional()
      ),
      featured: z.boolean().default(false),
    }),
});

export const collections = { posts, work };
