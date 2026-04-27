import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { getPostSlug } from "@utils/content";

export const prerender = true;

export async function GET(context: APIContext) {
  const siteUrl = (context.site || "https://gvns.ca")
    .toString()
    .replace(/\/$/, "");

  const posts = (await getCollection("posts"))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const projects = await getCollection("work");

  const postsLines = posts
    .map(
      (post) =>
        `- [${post.data.title}](${siteUrl}/posts/${getPostSlug(post.id)}/): ${post.data.description}`,
    )
    .join("\n");

  const workLines = projects
    .map(
      (project) =>
        `- [${project.data.title}](${siteUrl}/work/${getPostSlug(project.id)}/): ${project.data.description}`,
    )
    .join("\n");

  const body = `# gvns.ca

> Personal site of Gareth Evans — writing on software, design, and technology, plus a portfolio of work.

## Posts

${postsLines}

## Work

${workLines}

## About

- [About](${siteUrl}/about/): Background and contact info
- [Resume](${siteUrl}/resume/): Professional experience

## Optional

- [Tags](${siteUrl}/posts/tags/): Browse posts by topic
- [Reading](${siteUrl}/read/): What I'm reading
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
