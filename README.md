# gwilym.ca

Personal site for writing and work by Gareth Evans. Serious work, questionable puns.

Live: https://gwilym.ca

## Content

- Writing posts: `src/content/writing/`
- Work entries: `src/content/work/`
- Routes: `/writing`, `/work`, `/about`, `/resume`, `/reading`
- RSS: `/rss.xml`

## Tech

- Astro 5 (static output)
- Svelte islands for interactive components
- Tailwind CSS with design tokens in `src/styles/global.css`
- Shiki for code highlighting
- IBM Plex Sans + JetBrains Mono (self-hosted via @fontsource)

## Development

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build to `./dist/` |
| `npm run preview` | Preview production build |

## Structure

```
src/
  components/  UI components
  content/     Writing + work collections
  layouts/     Base layout wrappers
  pages/       Route files
  styles/      Tokens + global styles
```
