import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { UPLOADS_PATH_REGEX } from './uploads-path.mjs';

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

const trimToUndefined = (v: unknown) => {
  if (typeof v !== 'string') return v ?? undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
};

// Shared validation for CMS-uploaded media paths. Sveltia writes absolute
// /uploads/... URLs into frontmatter (see docs/CMS-SETUP.md, issue #264).
const uploadsPathSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(UPLOADS_PATH_REGEX, 'heroImage must be an absolute /uploads/... path')
    .optional()
);

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(100),
      description: z.string().max(200),
      pubDate: z.coerce.date(),
      updatedDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
      tags: z
        .array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'tags must be kebab-case'))
        .min(1)
        .max(4),
      draft: z.boolean().default(false),
      heroImage: z.preprocess(emptyToUndefined, image().optional()),
      heroImageAlt: z.preprocess(trimToUndefined, z.string().max(250).optional()),
      heroFocus: z.preprocess(emptyToUndefined, z.enum(['top', 'center', 'bottom', 'left', 'right']).default('center')),
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
      heroImage: uploadsPathSchema,
      heroImageAlt: z.preprocess(trimToUndefined, z.string().max(250).optional()),
      featured: z.boolean().default(false),
    }),
});

export const collections = { posts, work };
