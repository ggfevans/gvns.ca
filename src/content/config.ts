import { defineCollection, z } from 'astro:content';

const writing = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().max(100),
      description: z.string().max(200),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).min(1).max(4),
      draft: z.boolean().default(false),
      heroImage: image().optional(),
    }),
});

const work = defineCollection({
  type: 'content',
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
