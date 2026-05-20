# Personal Site Inspiration Scan

**Analysed:** 2026-04-29
**Subjects:** simonwillison.net, jvns.ca, apenwarr.ca, brandur.org, maggieappleton.com, tom.preston-werner.com, leerob.com, sive.rs, harper.blog
**Method:** WebFetch inspection of home and /now pages where available
**Companion to:** `docs/research/mitchellh-com-analysis.md`

> Confidence key: ✅ Confirmed · 🔍 Strong inference · 💭 Speculation

---

## 1. Site-by-site

### Simon Willison — simonwillison.net

- **Home page** ✅ A reverse-chronological mixed feed of entries, "blogmarks" (links), quotes, and notes — high-cadence link-blog above long-form. No bio above the fold. Just a tag bar (`On claude · openai · gpt · claude-code · sqlite ...`) and a search input.
- **Navigation** ✅ Minimal: `About · Subscribe · TILs · Tools`. The atom-feed icon is given its own dedicated header anchor — RSS prominence is a distinctive tell.
- **Identity surface** ✅ A separate `/about`. The home page assumes you know who Simon is, or will click through.
- **Writing surface** ✅ The home page IS the writing surface. Pure feed, paginated by year (footer lists 2002–2026 as nav).
- **Live signal / dashboard** ✅ No `/now` (returns 404). The high cadence of the feed itself acts as the liveness signal.
- **Visual treatment** 🔍 Light-default with auto/light/dark toggle. Single column, very plain typographic hierarchy, an orange RSS icon as the only accent. Density is high — many items per scroll.
- **Distinctive move** A "currenttags" strip at the top showing the tags Simon is most actively writing about right now. It's a topic-temperature gauge, not a static category list.

### Julia Evans — jvns.ca

- **Home page** ✅ A long, hand-curated archive grouped by category ("Most recent 10", then categorised lists for every topic Julia writes about). Top-of-page is a one-line greeting: "Hey! I'm Julia. Welcome to my blog. Here's every post I've ever written, organized by category."
- **Navigation** ✅ Two-row: header has `About · Talks · Projects · Mastodon · Bluesky · Github`, then a sub-nav with `Favorites · TIL · Zines · RSS`. Note the Mastodon-first social ordering and the explicit `Favorites` route — a curated entry point.
- **Identity surface** 🔍 A one-sentence self-introduction on home does most of the work; `/about` exists but the home page byline carries the warmth.
- **Writing surface** ✅ Home page is essentially the archive. Categorised lists with a star-marker for favourites; very low chrome.
- **Live signal / dashboard** ✅ No `/now` (404). Liveness is implied by the recent-posts list and a link to the weekly newsletter.
- **Visual treatment** 🔍 Light-only, serif body, almost no colour, no illustrations on the home page itself (despite Julia being illustration-famous via Wizard Zines — the zines live off-site).
- **Distinctive move** The home page is the entire archive. No "see more" indirection — every post she's ever written is one scroll away. Counter to the dashboard impulse.

### Avery Pennarun — apenwarr.ca

- **Home page** 🔍 `/` redirects to the current month's log page (e.g. `/log/?m=202603`). There is no separate landing page — the latest essay on the latest log month IS the front door.
- **Navigation** ✅ Almost none. A small "tagline" image, prev-month link, RSS in the footer, a one-line "I'm CEO at Tailscale" colophon. No top nav at all.
- **Identity surface** ✅ The footer line ("I'm CEO at Tailscale") is the entire bio. There is no `/about` discoverable from the home view.
- **Writing surface** ✅ The home IS a single long essay. Discovery happens via the month archive (`?m=YYYYMM`) and "Related" / "Unrelated" link clusters at the bottom of each post.
- **Live signal / dashboard** ✅ No `/now`. The log itself is the liveness signal.
- **Visual treatment** ✅ et-book / Palatino serif, ~13pt, narrow column, blue links, near-zero CSS beyond typography. Extremely dense prose. Light-only.
- **Distinctive move** The "Related / Unrelated" footer below each post — manually curated lateral links, including a deliberate _Unrelated_ slot to push you somewhere unexpected. A serendipity injection most archives don't have.

### Brandur Leach — brandur.org

- **Home page** ✅ Three stacked horizontal bands: (1) a 2-sentence prose intro pointing readers to atoms, the now page, and the newsletter; (2) a single hero photograph linking to the latest "sequence" (photo-essay); (3) a list of three recent fragments with date and excerpt. The intro IS the bio.
- **Navigation** ✅ `Articles · Atoms · Fragments · Newsletter · Sequences · Now · Uses · About` — eight items, one of the most expansive navs in the set, with content-type sections (Articles vs Atoms vs Fragments vs Sequences) treated as first-class.
- **Identity surface** ✅ Home-page intro paragraph plus a separate `/about`.
- **Writing surface** ✅ Featured-list pattern: hero image → 3 recent fragments. Footer hint: "These are a short selection of recently posted writing across all categories."
- **Live signal / dashboard** ✅ `/now` exists. Format is **prose-only**, monthly-ish cadence, with previous entries collapsed into `<details>` accordions. Always opens with location ("I'm in Indonesia, diving for the full month of October") then a bulleted "life notes" list. A photograph leads each entry.
- **Visual treatment** ✅ Cream/off-white default with dark mode (auto/light/dark radio toggle). Serif body for prose, sans for nav and metadata. Wide hero photographs, narrow text columns. Tasteful and quietly elegant.
- **Distinctive move** Multiple content types as nav peers (Atoms = short, Fragments = medium, Articles = long, Sequences = photo-essay) — each with its own atom feed. A typology-of-writing model instead of one bucket.

### Maggie Appleton — maggieappleton.com

- **Home page** 🔍 Digital-garden front page with three labelled content modes: **Essays** (long-form narrative), **Notes** ("loose, unopinionated notes"), **Patterns** (catalogued observations). Tagline: "makes visual essays about programming, design, and anthropology."
- **Navigation** 🔍 The three garden-state labels (Essays / Notes / Patterns) are the primary nav, plus the standard about / now / etc.
- **Identity surface** 🔍 Heavy hero treatment — illustrated avatar, tagline, intro to the garden concept.
- **Writing surface** 🔍 Categorised by epistemic state (essay / note / pattern), not by recency. A counter-feed model.
- **Live signal / dashboard** ✅ `/now` exists and is **prose-only** — long, reflective, paragraph-based. No widgets. Opens with a year-in-review-style stocktake, "currently working through John McPhee's _Annals of the Former World_", location/travel notes, work plans. Reads like a journal entry.
- **Visual treatment** ✅ Light, serif, illustration-heavy elsewhere on the site (hand-drawn leaves as bullet markers). Salmon/crimson accent. Editorial rather than dashboard feel.
- **Distinctive move** The epistemic-status taxonomy. Notes are explicitly tagged as half-baked, which lowers the writer's publishing-anxiety bar and signals to readers what kind of read they're getting.

### Tom Preston-Werner — tom.preston-werner.com

- **Home page** ✅ Three flat lists: "Blog Posts" (one line each, date + title), "Highlighted Media", "Other Interviews, Talks, Etc", "Noteworthy Open Source Projects". 22 blog posts over 17 years; cadence is sparse but with weight.
- **Navigation** ✅ Just a `home` link. That's it.
- **Identity surface** 🔍 Footer-only: "Cofounder of GitHub, Chatterbug" plus an email. No `/about`. The list of open-source projects (Jekyll, SemVer, TOML) is the bio.
- **Writing surface** ✅ Linear date-ordered list, no excerpts, no tags, no images.
- **Live signal / dashboard** ✅ No `/now`. The site is a CV-via-output.
- **Visual treatment** ✅ Late-2000s Jekyll-default aesthetic preserved deliberately. Serif headings, no dark mode, no animations.
- **Distinctive move** Listing _projects and specifications_ (Jekyll, SemVer, TOML) as a top-level home section. Identity expressed through artefacts shipped.

### Lee Robinson — leerob.com

- **Home page** ✅ A short prose self-introduction: name as h1, three paragraphs of bio, a curated "favorite writing" list, a final line of social links. **The home is the about page.**
- **Navigation** ✅ None visible at top — links are inline in the prose ("I work at Cursor", "/bio", "/writing", "/music").
- **Identity surface** ✅ The home page is identity-first; `/now` 404s.
- **Writing surface** ✅ A 6-item editor's-pick list inline in the bio prose, plus "/writing" link. No feed, no recency cues on home.
- **Live signal / dashboard** ✅ No `/now`, but: an inline "I last listened to [track] by [artist]" pulled from Spotify lives in paragraph 2 of the bio. So the liveness signal is _embedded in the prose_ rather than dashboarded.
- **Visual treatment** ✅ Next.js / Vercel-stack minimalism, sans-serif, light/dark via system, faint underline on links, very low chrome. Despite the dev-portfolio expectation, it is aggressively unflashy.
- **Distinctive move** Inline last-played track. A single dynamic sentence inside what otherwise looks like a static bio gives the whole page a pulse without dedicating a widget to it.

### Harper Reed — harper.blog

- **Home page** ✅ Avatar (Gravatar) + h1, then a one-line h3 self-introduction pointing to harper.lol for the deep bio, then a single paragraph explaining the site's content types ("longer form blog posts, some short form notes, occasionally some links"). Below that: top-5 Posts list (date + title, no excerpts), then top-5 Notes list (microblog-length entries — example: "Napalm Death @ Club Quattro in Shibuya"). No widgets. Compact.
- **Navigation** ✅ Home · Posts · Notes · Now · Media · About · email link · RSS. Full IndieWeb stack underneath (webmention, micropub, microsub, indieauth) — invisible to readers but worth noting.
- **Identity surface** ✅ Three-way split: harper.blog has a one-line h3 intro, /about exists for medium bio, harper.lol is the canonical "about me" on a different domain. So neither full-merge nor lite-merge — bio offshored entirely.
- **Writing surface** ✅ Two parallel lists on home: Posts (long-form) and Notes (short-form). A typology-of-writing model similar to Brandur's atoms/fragments, but with only two tiers.
- **Live signal / dashboard** ✅ `/now` exists and is **prose-only**. Format: each /now is a dated page at `/now/YYYY-MM-DD/`. The `/now` route shows the latest one. Sectioned with H2/H3/H4 headings (e.g. "2389 rules", "The weird / The Fear", "The normal", "Working on a lot of tech projects"), bulleted lists, occasional embedded video. Opens with the Sivers credit ("Inspired by @NowNowNow. and Derek Sivers"). Closes with a `<details>` summary collapsing 17 previous /now entries going back to 2021 — each linked to its dated page.
- **Visual treatment** ✅ Hugo with the `theme-nordic` (Nordic palette). Light-default visually but understated. Avatar in header; sans body, almost no chrome. Multilingual (ja/es/ko/zh/id translations available).
- **Distinctive move** /now as a *content collection* rather than a single mutable page. Each snapshot has its own canonical URL (`/now/2026-01-06/`), the current `/now` shows the latest, and a `<details>` archive at the bottom links back through the history. Different from Brandur's pattern (collapse-on-same-page) — both keep history visible, but Harper's is more shareable and natively maps to Astro's content collections. Also: a Tinylytics kudos heart button at the bottom for low-friction reader engagement.

### Derek Sivers — sive.rs

- **Home page** ✅ Sectioned, all-on-one-page layout: "me in 10 seconds" (2-paragraph self-description), pointers to /about and /now, contact line, then "articles about…" (definition list of every topic he writes about), books, projects, interviews, photos, follow.
- **Navigation** ✅ Three icons in the header: feeds, contact, search. No nav links — the home page IS the nav by virtue of being the index.
- **Identity surface** ✅ Top of home, in plain language. "/about" goes deeper ("me in 10 minutes").
- **Writing surface** ✅ Topics, not posts. The home lists writing _categories_ each with a one-line description; specific posts are one click in.
- **Live signal / dashboard** ✅ `/now` is the canonical reference (Derek invented the concept). It is **prose-only** — h2 sections like "databasing my sive.rs site", "listening", "reading", "rats are old", "boy thriving at his new school" — each 1–4 paragraphs of plain prose. Updated April 29th, 2026 (i.e. today; very fresh).
- **Visual treatment** ✅ Single column, system fonts, almost no CSS, light-only. The page itself is the design statement: text and links, plus thumbnails of book covers.
- **Distinctive move** Topic-as-nav definition list on the home page. Twelve writing categories each get a one-line plain-English description ("self-expansion: personal development, exploring, learning, expanding identity"). It surfaces the _shape_ of the writing, not the _recency_.

---

## 2. Cross-cutting patterns

**Prose `/now` beats dashboard `/now`, every time.** ✅ Of the five sites in this scan with a `/now` page (Brandur, Maggie, Derek, Harper, plus the canonical concept), all five are pure prose. None use widgets, charts, currently-listening cards, or activity bars. They open with location ("I'm in Indonesia", "I'm back in San Francisco", "from my cabin-in-the-woods home in New Zealand"), then 3–6 short prose sections by topic. The reader gets a snapshot of a person, not a snapshot of an API.

**About-as-home is a writing-led signal.** ✅ Mitchell, Lee, Derek, and (effectively) apenwarr put identity on `/`. The sites with separate `/about` (Simon, Julia, Brandur) lean feed-led — they assume you arrived knowing who they are, or you'll click. There's a clean correlation: high-cadence link-bloggers separate the about; long-form-essay sites collapse it.

**Content-type taxonomy is the real navigation move.** 🔍 The most distinctive sites (Brandur, Maggie, Derek) don't navigate by topic or date — they navigate by _kind of writing_. Atoms / Fragments / Articles / Sequences (Brandur). Essays / Notes / Patterns (Maggie). Topic definition list (Derek). Each kind sets reader expectations about length, polish, and frequency.

**RSS prominence as a values-signal.** 🔍 Simon (header icon), Julia (sub-nav), Brandur (four separate atom feeds), Tom (footer with image), apenwarr (footer "Use RSS"), Sivers (header icon) — every site puts RSS visible on the home. None hide it behind a settings page.

**Dark-first is rare; auto with toggle is dominant.** ✅ Brandur, Simon, and Lee offer auto/light/dark (system-default = auto). Tom, Julia, apenwarr, Sivers, Maggie are light-only. None of the eight is dark-default. **gvns.ca is the outlier here — and that's fine, it's a deliberate aesthetic choice, but worth knowing.**

**No site has activity widgets on the home page.** ✅ Not one of the nine. Spotify "now playing" appears once (Lee, inline in a sentence). No reading lists on home, no music dashboards, no kanban-style "what I'm building" cards. Liveness lives in cadence (Simon, Julia), in `/now` prose (Brandur, Maggie, Derek), or in an embedded sentence (Lee). Widget-bento is a gvns.ca-original move within this peer set.

---

## 3. Recommendations for gvns.ca

### Home page (heading toward Option B — hybrid post-led)

**Confirmed.** The hybrid post-led direction is well-precedented. Brandur is the closest analogue: prose intro paragraph → hero/featured item → small list of recent posts. That maps almost 1:1 onto Option B.

Specific calls based on the scan:

- **Don't merge `/about` into `/` wholesale.** Mitchell does that, but Mitchell has zero widgets and a single-column text page. With your P1-P5 palette, status pill, and richer surface, the about-as-home pattern would feel cluttered. Keep `/about` for the longer Profile + Timeline content and use a 2–3 sentence prose intro on home (Brandur model) to do the identity work above the fold.
- **Soften the mitchellh pattern.** Mitchell goes pure plain-text bio. Brandur, Lee and Sivers all soften it: a short paragraph that names what they do and immediately points to the things they make. "Tech tinkerer · Qualicum Beach" is good as the status pill; the prose intro should be one paragraph that points to writing, /now, and contact in the same sentence-flow.
- **Featured post + activity bar is fine; the four widgets are the question.** None of the peer sites carry four dashboard widgets on `/`. If they stay on home, treat them as compact (icon + one line of text), not full dashboard cards — the bento-grid weight should live on `/now`.
- **Borrow Brandur's content-type idea long-term.** If gvns.ca eventually has multiple kinds of writing (long posts vs short notes vs link-blog), introduce the Brandur-style typology rather than a flat post list. This is a 2027 problem, not now, but worth keeping in mind.

### `/now` (heading toward Option C — prose intro + widgets)

**Confirmed, with one adjustment.** Every canonical `/now` is prose-only. Adding widgets to `/now` is genuinely novel — none of the peer sites do it — which means it's both an opportunity and a risk. The prose intro is doing the heavy lifting; widgets must reinforce it, not replace it.

- **Prose intro length:** 3–5 short paragraphs in Brandur/Sivers style. Open with location ("From the Qualicum Beach desk…"), then 2–4 themed mini-sections (work, reading, life, side-projects). Around 200–400 words total. Long enough to feel honest, short enough to scan.
- **Freshness signal:** Brandur's "_This page was last updated on Oct 17, 2025._" line is the right pattern — small, italic, factual. Not a relative "3 days ago" timer; an explicit date the reader can trust. Sivers does the same in his opening line ("Updated April 29th, 2026").
- **Widgets: keep them, but go compact below the fold.** Full-size bento for the widgets risks turning `/now` into a dashboard at the cost of the prose. Recommended: prose intro and date stamp at full width, then widgets as a denser grid below — smaller cards, 2 columns instead of 2x2, no chart-style visualisations. They become evidence that supports the prose, not a substitute for it.
- **History via `<details>`.** Two patterns to choose between. Brandur collapses every previous `/now` entry's full content into accordions on the same page. Harper Reed makes each `/now` a dated entry at `/now/YYYY-MM-DD/` with the current one served at `/now`, and a `<details>` archive at the bottom that just links back through the dated snapshots. Harper's pattern maps natively onto Astro Content Collections (a `now` collection alongside `posts`), gives each snapshot a canonical shareable URL, and keeps the live page short. Recommended for gvns.ca: follow Harper, not Brandur.

### Things gvns.ca does that other sites don't (worth keeping)

- **P1-P5 colour mapping (violet/rose/emerald/amber/sky → code/read/listen/watch/write/status).** ✅ None of the eight peers have a semantic colour system at this granularity. It's a real differentiator and reads as design discipline rather than decoration. Keep it.
- **Dark-first with toggle.** ✅ All eight peers are either light-only or auto. Dark-default is a stylistic choice that pairs naturally with the P1-P5 saturated accents — they sing on a near-black bg in a way they wouldn't on cream. Worth keeping as a position rather than a quirk.
- **Status pill ("Tech tinkerer · Qualicum Beach").** 🔍 No peer surfaces a personal status _string_ on the home (Sivers's "California native, I now live in New Zealand" is prose, not a UI element). The pill is small but works as a "what am I and where am I" hand-wave above the fold. Keep it; it's the gvns.ca equivalent of Brandur's intro paragraph compressed to a single line.
- **CMS at `/admin` (Sveltia).** 💭 None of the peers visibly use a CMS — most are Hugo, Jekyll, hand-rolled Astro/Next. The `/admin` mobile-authoring path is uncommon and aligns with ADHD-aware "write when the urge strikes" workflows. Worth keeping as an internal capability even though it's invisible to readers.
- **Activity widgets on the home/now.** ✅ A genuinely original move within this peer set. The risk is that they make the site feel more "personal-dashboard" than "personal-writing", which is the opposite of where most of the peers land. The mitigation: keep widgets compact on `/`, anchor `/now` in prose first, and let the data be supporting evidence.

The peer set's clearest collective lesson is _trust the prose_. Eight sites, eight different design idioms, but the writing always leads. If a feature competes with the prose for attention, soften the feature.
