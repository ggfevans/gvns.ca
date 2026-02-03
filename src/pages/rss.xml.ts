import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('writing'))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  // Extract filename from full slug path
  const getFilename = (slug: string) => {
    const parts = slug.split('/');
    return parts[parts.length - 1];
  };

  return rss({
    title: 'gvns.ca',
    description: 'Writing about homelab, web development, BJJ, and productivity.',
    site: context.site || 'https://gvns.ca',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/writing/${getFilename(post.slug)}/`,
      categories: post.data.tags,
    })),
    customData: '<language>en-CA</language>',
  });
}
