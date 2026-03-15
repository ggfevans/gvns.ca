import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/writing' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(100),
      description: z.string().max(200),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).min(1).max(4),
      draft: z.boolean().default(false),
      heroImage: image().optional(),
      canonicalUrl: z.string().url().optional(),
      syndication: z
        .array(
          z.object({
            platform: z.enum(['bluesky', 'mastodon', 'threads', 'linkedin']),
            url: z.string().url(),
            syndicatedAt: z.coerce.date(),
          })
        )
        .optional(),
    }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/work' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(100),
      description: z.string().max(200),
      url: z.string().url().optional(),
      repo: z.string().url().optional(),
      status: z.enum(['active', 'maintained', 'archived']),
      tags: z.array(z.string()).min(1).max(6),
      heroImage: image().optional(),
      featured: z.boolean().default(false),
    }),
});

export const collections = { writing, work };
