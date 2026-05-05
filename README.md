# Rethink Aadhaar — Astro rebuild

A static, accessibility-first rebuild of [rethinkaadhaar.in](https://rethinkaadhaar.in) on Astro 5 with Tailwind, MDX content collections, view transitions, and dark mode. Content from the original site is reproduced under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) with attribution.

## Stack

- **Astro 5** static output, TypeScript strict
- **Tailwind 3.4** + `@tailwindcss/typography`
- **MDX** content via Astro Content Collections (Zod-typed)
- **astro-seo**, **@astrojs/sitemap**, **@astrojs/rss**
- **@fontsource/roboto** (display) + **@fontsource/source-serif-pro** (body), self-hosted
- View transitions via `<ClientRouter />`; dark mode via `class` strategy + `localStorage`

## Local development

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # runs `astro check && astro build`
npm run preview      # serve dist/
```

Node 20+ is required.

## Project layout

```
src/
  components/        16 small Astro components (no client JS unless noted)
  content/
    config.ts        Zod schemas for the 7 collections
    myth/            Numbered myth + fact entries
    update/          Press releases, statements, analysis (the "blog")
    exclusion/       First-person exclusion stories ("Exclusion" nav label)
    faq/             FAQ entries
    resource/        External primers, govt docs, templates, articles
    press/           External media coverage index
    page/            One-off long-form pages (about, take-action, campaign2025, home statement)
  layouts/
    BaseLayout.astro SEO, ClientRouter, dark-mode bootstrap, header/footer slots
  pages/             14 routes (see IA below)
  styles/global.css  Design tokens + .hero-title / .caps / .btn-dark / .nav-link / fade-up
public/
  media/             Migrated images (303 files, ~95 MB)
scripts/
  migrate-posts.mjs  One-time HTML → MD migration (kept for re-runs)
  seed-press.mjs     Seeds the press collection from a curated list
content-source/      Original HTML crawl (kept out of build)
design/              Tokens + reference assets
```

## Information architecture

| Route | Source |
|---|---|
| `/` | `page/home-statement.md` + 3 latest `update/` entries |
| `/myths` | `myth/` collection, ordered |
| `/testimonials` (nav: "Exclusion") | `exclusion/` collection |
| `/testimonials/[slug]` | individual exclusion stories |
| `/blog` (nav: "Updates") | `update/` collection |
| `/blog/[slug]` | individual updates |
| `/take-action` | `page/take-action.md` |
| `/faqs` | `faq/` collection |
| `/resources` | `resource/` grouped by `section` enum |
| `/press-coverage` | `press/` grouped by year |
| `/about` | `page/about.md` |
| `/campaign2025` | `page/campaign2025.md` |
| `/rss.xml` | latest non-draft `update/` entries |
| `/sitemap-index.xml` | auto via `@astrojs/sitemap` |
| `/404` | static not-found |

The nav-label / `<h1>` mismatches from the original (e.g. nav "Exclusion" → URL `/testimonials` → h1 "Testimonies of exclusion") are preserved deliberately — they reflect editorial intent.

## Adding content

Drop a Markdown file into the right collection directory. Front-matter is validated by `src/content/config.ts` at build time — a missing or wrong-shape field will fail the build with a clear error.

### A new myth

`src/content/myth/06-something.md`

```md
---
myth: "Aadhaar is the only proof of identity recognised by banks."
fact: "Banks accept passport, voter ID, driving license and others under KYC norms."
order: 6
---

Optional longer explanation in Markdown.
```

### A new update / press release

`src/content/update/2026-05-05-some-slug.md`

```md
---
title: "Statement on the latest exclusion incident"
date: 2026-05-05
hero: /media/your-image.jpg     # optional, drop file in public/media/
excerpt: "One-line summary used in cards and RSS."
sourceUrl: https://...           # optional, links back to original if migrated
draft: false
---

Markdown body.
```

### A new FAQ, resource, exclusion story, press entry

Each follows the same pattern — see existing files in the matching collection for the exact front-matter shape, or read the Zod schema in `src/content/config.ts`.

### A new long-form page

Either add a `.astro` route under `src/pages/` and pull a `page/` collection entry, or just add a fully-static `.astro` file.

## Deploying

The build outputs a fully static `dist/` directory. Any static host works.

### Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `20`

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- A `netlify.toml` is not required; the defaults work.

### Vercel

- Framework preset: Astro (auto-detected)
- Build command: `npm run build`
- Output directory: `dist`

### Static / S3 / GitHub Pages

`npm run build` then upload `dist/` to any bucket or static host. Set the `site` URL in `astro.config.mjs` so canonical URLs and sitemap entries are correct.

## License

- **Code:** MIT
- **Content** (text in `src/content/` and curated pages): mirrored under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) from the original Rethink Aadhaar site, with attribution preserved on each migrated entry via a `sourceUrl` field linking back to the original publication.
- **Press coverage entries** index third-party reporting and link out to the original publishers; only title, outlet, date and URL are reproduced.
