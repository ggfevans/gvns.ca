/**
 * JSON-LD structured data utilities for SEO
 * @see https://schema.org/
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

const SITE_URL = 'https://gvns.ca';
const SITE_NAME = 'gvns.ca';
const AUTHOR_NAME = 'Gareth Evans';

interface ArticleSchema {
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  url: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generate WebSite schema for the home page
 */
export function websiteSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
    },
    description:
      'Personal blog and portfolio. Writing about homelab, web development, BJJ, and whatever else catches my attention.',
  };
}

/**
 * Generate Person schema for the about page
 */
export function personSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR_NAME,
    url: SITE_URL,
    jobTitle: 'Web Developer',
    knowsAbout: [
      'Web Development',
      'Homelab',
      'Self-Hosting',
      'Brazilian Jiu-Jitsu',
    ],
    sameAs: ['https://github.com/ggfevans'],
  };
}

/**
 * Generate Article schema for blog posts
 */
export function articleSchema({
  title,
  description,
  pubDate,
  updatedDate,
  url,
}: ArticleSchema): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
    datePublished: pubDate.toISOString(),
    dateModified: (updatedDate || pubDate).toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export function breadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Serialize schema object to JSON-LD script content
 */
export function toJsonLd(schema: object): string {
  return JSON.stringify(schema);
}
