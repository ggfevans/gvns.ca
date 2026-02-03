/**
 * JSON-LD structured data utilities for SEO
 * @see https://schema.org/
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

const SITE_NAME = 'gvns.ca';
const AUTHOR_NAME = 'Gareth Evans';
const DEFAULT_SITE_URL = 'https://gvns.ca';

interface ArticleSchema {
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  url: string;
  siteUrl?: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Normalize site URL by removing trailing slash
 */
export function normalizeSiteUrl(siteUrl: URL | string | undefined): string {
  if (!siteUrl) return DEFAULT_SITE_URL;
  return siteUrl.toString().replace(/\/$/, '');
}

/**
 * Generate WebSite schema for the home page
 * @param siteUrl - The base URL of the site (from Astro.site)
 */
export function websiteSchema(siteUrl?: string): object {
  const url = siteUrl || DEFAULT_SITE_URL;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
    },
    description:
      'Personal site for writing and shipped work. Notes on homelab, web development, BJJ, and productivity.',
  };
}

/**
 * Generate Person schema for the about page
 * @param siteUrl - The base URL of the site (from Astro.site)
 */
export function personSchema(siteUrl?: string): object {
  const url = siteUrl || DEFAULT_SITE_URL;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR_NAME,
    url,
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
 * Generate Article schema for writing posts
 */
export function articleSchema({
  title,
  description,
  pubDate,
  updatedDate,
  url,
  siteUrl,
}: ArticleSchema): object {
  const baseUrl = siteUrl || DEFAULT_SITE_URL;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: baseUrl,
    },
    publisher: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: baseUrl,
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
