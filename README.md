# Rethink Aadhaar — Astro rebuild

A static, accessibility-first rebuild of [rethinkaadhaar.in](https://rethinkaadhaar.in) on Astro 5 with Tailwind, MDX content collections, view transitions and dark mode. Content is mirrored from the original site under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) with attribution.

> **Live preview:** https://anivar.github.io/rethink-aadhaar/ (GH Pages, auto-deployed from `main`)

## Stack

- **Astro 5** static output, TypeScript strict
- **Tailwind 3.4** + `@tailwindcss/typography`
- **MDX** content via Astro Content Collections (Zod-typed)
- **astro-seo**, **@astrojs/sitemap**, **@astrojs/rss**
- **@fontsource/roboto** + **@fontsource/source-serif-pro** (self-hosted)
- View transitions via `<ClientRouter />`; dark mode via `class` strategy + `localStorage`

## Local development

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # astro check && astro build
npm run preview      # serve dist/
```

Node 20+ required.

## Project layout

```
src/
  lib/                 ← single source of truth — edit one file, every page picks it up
    format.ts          5 standardised date styles (medium / long / short / monthYear / iso)
    entries.ts         entryHref(), sort/filter helpers, collection types
    categories.ts      which collections get regular updates (used by scripts/)
    seo.ts             JSON-LD builders (Organization, WebSite, Article, FAQPage, ItemList, Breadcrumb…)
    link.ts            base-path-aware link() for portable internal hrefs
  content/
    config.ts          Zod schemas for the 7 collections
    myth/  faq/  resource/  page/                  (curated, edited by hand)
    update/  exclusion/  press/                    (the three updateable categories)
  components/          15 small Astro components
  layouts/BaseLayout.astro
  pages/               14 routes (see IA below)
  styles/global.css    Design tokens + .hero-title / .caps / .btn / .nav-link / fade-up
public/
  media/               Migrated images
  robots.txt  .nojekyll
scripts/
  new.mjs              Scaffold a new content entry (npm run new -- update "Title")
  sync.mjs             Crawl rethinkaadhaar.in/sitemap.xml, write new entries as drafts
  _categories.mjs      Mirror of src/lib/categories.ts for node scripts
  migrate-posts.mjs    Original one-time HTML→MD migration (kept for re-runs)
  seed-press.mjs       Seeded the press collection from a curated list
.github/workflows/
  deploy.yml           Build & publish to GH Pages on every push to main
  sync.yml             Weekly cron (Mon 06:00 UTC) — opens a PR with new upstream content
```

## Information architecture

| Route | Source |
|---|---|
| `/` | `page/home-statement.md` + 4 latest `update/` entries |
| `/myths` | `myth/` (ordered) |
| `/testimonials` (nav: "Exclusion") | `exclusion/` |
| `/testimonials/[slug]` | individual exclusion stories |
| `/blog` (nav: "Updates") | `update/` |
| `/blog/[slug]` | individual updates |
| `/take-action` | `page/take-action.md` |
| `/faqs` | `faq/` |
| `/resources` | `resource/` grouped by `section` enum |
| `/press-coverage` | `press/` grouped by year |
| `/about` | `page/about.md` |
| `/campaign2025` | `page/campaign2025.md` |
| `/rss.xml` | latest non-draft `update/` entries |
| `/sitemap-index.xml` | auto via `@astrojs/sitemap` (with priority + lastmod) |
| `/llms.txt` | LLM-friendly index of every page (auto-derived from collections) |
| `/llms-full.txt` | Full text of myths, FAQs and `page/` bodies |
| `/robots.txt` | Allow all, references sitemap and llms.txt |
| `/404` | static not-found |

## Adding content

### The fast path — `npm run new`

Three updatable categories. Always works:

```sh
npm run new -- update    "Statement on the latest exclusion incident"
npm run new -- exclusion "Aadhaar-linked pension denial in Khunti" --location "Khunti, Jharkhand"
npm run new -- press     "Headline of the article" --publication "The Wire" --href https://example.com/article
```

This drops a Markdown file with valid front-matter. `update` entries are written as `draft: true` so they don't ship until you flip the flag.

### Auto-sync from the live site — `npm run sync`

Pulls `rethinkaadhaar.in/sitemap.xml`, finds URLs not yet represented locally, fetches each page, extracts metadata (og:title / og:description / og:image / datePublished), and writes draft Markdown.

```sh
npm run sync                 # dry-run: list new URLs
npm run sync -- --write      # write the files
npm run sync -- --since 2026-01-01 --write   # only entries on/after this date
```

Press coverage is **not** auto-synced — it's curated third-party publications. Use `npm run new -- press …`.

### CI sync (every Monday)

The `sync.yml` workflow runs `npm run sync -- --write` weekly and opens a PR titled "Upstream sync — new updates / exclusion stories". Reviewing and merging the PR publishes the new content.

### By hand

Drop a Markdown file into the right collection directory. Front-matter is validated by `src/content/config.ts` at build — wrong shape fails the build.

```md
---
title: "A new myth"
fact: "What the evidence actually says"
order: 6
---
Optional Markdown body.
```

See existing files in each collection for the exact field shape, or read `src/content/config.ts`.

## SEO architecture

Everything is generated from collections — when a content file is added, every SEO surface updates automatically:

| Surface | How it stays current |
|---|---|
| `<title>`, `<meta description>`, OG, Twitter | `BaseLayout` props per page |
| Canonical URL | derived from `Astro.url` + `site` |
| **JSON-LD** | `src/lib/seo.ts` builders called per page; `WebSite` + `Organization` graph on every page, plus type-specific (`NewsArticle`, `Article`, `FAQPage`, `ItemList`, `BreadcrumbList`) |
| **Sitemap** | `@astrojs/sitemap` walks all generated pages; priority customised in `astro.config.mjs` |
| **RSS** | `src/pages/rss.xml.ts` reads `update/` |
| **`/llms.txt`** | `src/pages/llms.txt.ts` reads every collection at build |
| **`/llms-full.txt`** | full text of myths, FAQs, page-collection entries |
| **`robots.txt`** | static, references sitemap + both llms files |

Add a new update / FAQ / myth / resource → it appears in the sitemap, in `/llms.txt`, in the relevant index page's `ItemList` JSON-LD, and (for updates) in RSS. **No SEO file is hand-maintained.**

## Date formatting

There are exactly five `DateStyle`s in `src/lib/format.ts`. Use `formatDate(d, style)`:

| Style | Example | Where |
|---|---|---|
| `short` | `12/03/2024` | rare, machine-ish |
| `medium` | `12 Mar 2024` | every listing, card, list item |
| `long` | `12 March 2024` | hero eyebrows, detail pages |
| `monthYear` | `Mar 2024` | year-grouped lists |
| `iso` | `2024-03-12T…Z` | RSS, sitemap, JSON-LD |

Don't write `toLocaleDateString` or `padStart` calls in templates.

## Internal links

Always wrap with `link()` from `~/lib/link`:

```astro
import { link } from '~/lib/link';
<a href={link('/blog')}>All updates</a>
```

This makes the site portable between root deploys (rethinkaadhaar.in) and sub-path deploys (anivar.github.io/rethink-aadhaar). The build is driven by `SITE_URL` and `BASE_PATH` env vars.

## Deploying

### GitHub Pages (already wired)

Pushing to `main` triggers `.github/workflows/deploy.yml`. The action computes the Pages base URL automatically; no manual config needed.

### Cloudflare Pages / Netlify / Vercel / S3

```
Build command: npm run build
Output dir:    dist
Node version:  20
```

For a custom domain (e.g. `rethinkaadhaar.in`), no env vars needed — `astro.config.mjs` defaults to that origin and root path.

## License

- **Code:** MIT
- **Content** (text in `src/content/`): mirrored under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) from the original Rethink Aadhaar site, with attribution preserved on each migrated entry via a `sourceUrl` field linking back to the original publication.
- **Press coverage entries** index third-party reporting and link out to the original publishers; only title, outlet, date and URL are reproduced.
