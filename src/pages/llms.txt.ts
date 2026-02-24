import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const siteUrl = (context.site || "https://gvns.ca")
    .toString()
    .replace(/\/$/, "");

  const posts = (await getCollection("writing"))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const projects = await getCollection("work");

  const getFilename = (slug: string) => {
    const parts = slug.split("/");
    return parts[parts.length - 1];
  };

  const writingLines = posts
    .map(
      (post) =>
        `- [${post.data.title}](${siteUrl}/write/${getFilename(post.slug)}/): ${post.data.description}`,
    )
    .join("\n");

  const workLines = projects
    .map(
      (project) =>
        `- [${project.data.title}](${siteUrl}/work/${project.slug}/): ${project.data.description}`,
    )
    .join("\n");

  const body = `# gvns.ca

> Personal site of Gareth Evans — writing on software, design, and technology, plus a portfolio of work.

## Writing

${writingLines}

## Work

${workLines}

## About

- [About](${siteUrl}/about/): Background and contact info
- [Resume](${siteUrl}/resume/): Professional experience

## Optional

- [Tags](${siteUrl}/write/tags/): Browse writing by topic
- [Reading](${siteUrl}/read/): What I'm reading
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
