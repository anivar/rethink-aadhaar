# Changes vs. the live rethinkaadhaar.in

This rebuild preserves the editorial voice, IA, palette, and typography of the original Squarespace site, while modernising the front-end. Every change below is intentional — content meaning is unchanged.

## Platform

| Original | This rebuild |
|---|---|
| Squarespace 7.1 (server-rendered, runtime CSS/JS) | Astro 5 static export (HTML + minimal client JS) |
| Squarespace CMS | Markdown / MDX in Git, Zod-validated content collections |
| Squarespace CDN images | Local `/public/media/` (downloaded once, version-controlled) |

## Navigation & shell

- **Sticky header with backdrop blur** — header stays visible on scroll, with a subtle translucent blur. Original is a static top bar.
- **View transitions** — Astro's `<ClientRouter />` cross-fades between routes. No SPA framework; falls back to plain navigation if unsupported.
- **Active-link indicator** — current section gets a 2px accent (red) underline.
- **Mobile drawer** — full-height, single column, accessible toggle button (`aria-expanded` / `aria-controls`).
- **Skip-to-content link** — visible on focus, jumps to `<main id="content">`.
- **Dismissible announcement bar** — black bar above the header, dismissed state stored in `localStorage` so it doesn't reappear per visit.

## Theming

- **Dark mode** — `prefers-color-scheme` default + manual toggle (sun/moon button), persisted in `localStorage`. Applied via Tailwind's `class` strategy with a tiny inline bootstrap script in `<head>` to prevent FOUC.
- **Cream page background** for /myths preserved, but adapts to dark mode.
- **Design tokens** centralised — `--accent #D62636`, `--button #141413`, `--myth #F5B81D`, `--cream #F4ECDD` exposed as CSS variables in `src/styles/global.css`.

## Typography

- **Self-hosted fonts** — `@fontsource/roboto` (display, weights 400/700/900) and `@fontsource/source-serif-pro` (body, 400/600). No third-party font CDN, no FOIT.
- **`text-balance` on hero titles** and `text-pretty` on body paragraphs for nicer line-breaking on supporting browsers.
- **Hero clamp** — `clamp(2.75rem, 9vw, 6.75rem)` Roboto 900 with `letter-spacing: -0.02em`, matching the original visual weight at every viewport without media queries.

## Motion

- **`fade-up` on first paint** — articles, hero titles and cards animate in with a 12px translate + opacity. **Wrapped in `@media (prefers-reduced-motion: reduce)`** — animations fully disabled when the user opts out.

## Accessibility

- **2px red focus ring** with 2px offset on every interactive element (buttons, links, form fields), respecting Tailwind's `focus-visible` only.
- **Semantic landmarks** — `<header>`, `<nav>`, `<main>`, `<footer>` everywhere; one `<h1>` per page.
- **Alt text** on all migrated images (falls back to derived caption when OG metadata had none).
- **External link affordance** — outbound links carry `↗` glyph + `aria-hidden="true"` so screen readers don't announce decoration.
- **Form labels** — visible labels on the signup form, `aria-label` on the dismiss button.

## Components touched up

- **`MythCard`** — adds a `Myth N / Total` counter at the top of each myth, making the sequence readable on the long /myths page.
- **`FeaturedStory`** — the latest update is promoted into a cream block on the homepage with a "Read full story →" affordance, instead of being just another card in the grid.
- **`StickyAction`** — small fixed pill at bottom-right linking to /take-action, visible on /myths and /testimonials, dismissable.
- **Black starburst** in the footer is inlined SVG (60 rays, sweep -180° to 0°), matching the original woodblock-style mark but scaling crisply at any DPR.

## Layout / responsive

- **Card grid** uses CSS grid with `repeat(auto-fit, minmax(...))`, replacing the fixed-column Squarespace layout — collapses to a single column under ~640px without media-query bloat.
- **Press coverage** is grouped by year with sticky year headers and a `divide-y` list, replacing the original flat chronological wall.
- **Resources page** groups by typed `section` enum (Primers / Government documents / Hunger deaths 2015–18 / Case documents / Templates / Articles archive) instead of free-form sections.

## SEO & feeds

- **`astro-seo`** — canonical, OG, Twitter, JSON-LD on every page.
- **Sitemap index** auto-generated via `@astrojs/sitemap`.
- **RSS** at `/rss.xml` with `<language>en-in</language>` and full update list.
- **404 page** with helpful navigation links.

## Performance

- **Zero client-side framework**, no React/Vue runtime.
- Only client JS shipped: announcement-bar dismiss, theme toggle, mobile menu toggle, view-transitions polyfill — all small inline scripts or single-island components.
- Self-hosted fonts subset by `@fontsource` per weight; preloaded via `<link rel="preload">`.
- Images served from `/media/` with original dimensions; lazy-loaded by default.

## Content that is editorial — not a code change

These are not "changes" so much as decisions made during migration:

- **Migrated blog posts (120):** front-matter (title, date, hero, excerpt) is recovered from the original page's OG tags. The Markdown body is a short OG-derived summary plus a "Read the full statement at the original site →" outbound link to the live URL. Full article text is **not** mirrored — readers are sent back to the original publication for the canonical version.
- **Press coverage entries (60):** title + outlet + date + outbound URL only. No body text from third-party publishers is reproduced.
- **Exclusion stories (24):** stub entries with metadata and outbound link to the original; no narrative body mirrored.
- **The 11-point "Beware of Aadhaar" statement** on the homepage is paraphrased with attribution + outbound link to the original site.

## What was deliberately not added

- No comments, no analytics, no social-login. The original site has none either.
- No CMS UI — content lives in Git. Editors add a Markdown file and open a PR.
- No service worker / PWA — would add complexity for negligible benefit on a static site.
