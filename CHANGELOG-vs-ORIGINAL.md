# Changes vs. the live rethinkaadhaar.in

## Visual (May 2026 — brand parity pass)

- **Canonical mark restored.** The third-eye / fingerprint-eye logo (sourced from rethinkaadhaar.in, CC BY 4.0) now lives at `public/brand/logo-mark.png` (1024px master) and `public/brand/logo-mark.svg`. The earlier red-square placeholder mark has been retired.
- **Centred logo, split nav.** Header restructured to match canonical: `Myths · Exclusion · Updates · Take Action  | LOGO |  FAQs · Resources · Press · About · Campaign 2025`. Mobile collapses to logo-centre + hamburger right. Dark-mode toggle moved out of the nav into the footer's utility area.
- **Cream paper palette.** Page background switched to canonical warm cream `#F7F2E8`; ink `#111111`; primary red retuned to `#D7282F`; muted `#555555`. Cards are now white-on-cream in light mode (`.card-surface` token) and dark paper in dark mode. The `/myths` page no longer uses a yellow override — it reads on cream like every other page.
- **Hero refreshed.** `RETHINK AADHAAR` is centred, with the 4 px primary-red rule above. Type clamps to `clamp(2.5rem, 11vw, 9rem)`. Intro paragraph centred at ~65 ch. A two-column block (canonical worn-fingerprint hand on the left, serif paragraph on the right) sits below.
- **Statement section centred.** "Beware of Aadhaar — A warning on India's biometric identity model" heading is now centre-aligned and uppercase, matching canonical.
- **Typography upgraded.** Display = Archivo Black; body = Source Serif 4; UI/labels = Roboto. All self-hosted via `@fontsource/*`, `font-display: swap`. The legacy Source Serif Pro package has been dropped.
- **Light is the default.** First-visit auto-dark via `prefers-color-scheme` removed; dark is opt-in via the toggle and persisted in `localStorage`. Brand parity wins over OS theme.
- **Real social SVGs.** Footer now uses inline SVG icons for Email, Twitter / X, Facebook and RSS instead of pipe-separated text links. Card "Read →" affordances use a real arrow SVG that translates on hover.
- **Default `<title>` and og:image.** Title default: "Rethink Aadhaar — Opt-out from Aadhaar. Take action now." OG image default: `/og-default.png` (1200×630, mark + wordmark on cream). Organization JSON-LD `logo` points at the new mark.
- **Announcement copy** retuned: "Rethink Aadhaar. Opt-out from Aadhaar. Take action now →".

### TODOs requiring confirmation before merge
- The canonical mark is **PNG-only** on the upstream Squarespace CDN. `public/brand/logo-mark.svg` wraps the PNG via `<image>` so an SVG file exists at the requested path, but it is not a true vector. Replace with a hand-traced vector when one is available.
- The hand-photo asset (`public/media/1489594687018-…-image-asset.jpeg`) was already present from the initial migration. Licensing follows the upstream CC BY 4.0 attribution preserved on home content.

---

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
- **Persistent announcement bar** — black bar above the header. Originally dismissible; switched to non-dismissible to match the canonical site (see brand-parity pass above).

## Theming

- **Dark mode** — opt-in via the sun/moon toggle, persisted in `localStorage`. (Earlier rebuilds defaulted to `prefers-color-scheme`; that auto-switch was removed as part of brand parity — light is the canonical default.) Applied via Tailwind's `class` strategy with a tiny inline bootstrap script in `<head>` to prevent FOUC.
- **Cream page background** is now site-wide (canonical brand colour), and adapts to dark mode.
- **Design tokens** centralised in `src/styles/global.css` `@theme` — `--color-accent #D7282F`, `--color-button #111111`, `--color-myth #F5B81D`, `--color-cream #F7F2E8`.

## Typography

- **Self-hosted fonts** — `@fontsource-variable/fraunces` (display headings), `@fontsource-variable/inter` (body + UI/caps), `@fontsource-variable/jetbrains-mono` (`caps-mono` documentary labels). Per-subset woff2 with `unicode-range`; total payload <180KB. No third-party font CDN, no FOIT.
- **`text-balance` on hero titles** and `text-pretty` on body paragraphs (now a baseline-safe global default on `p, li, blockquote`).
- **Hero clamp** — `--text-display: clamp(2rem, 0.5rem + 6vw, 6.5rem)`, Fraunces ExtraBold with `letter-spacing: -0.035em`. Tuned so a 7-character uppercase word (RETHINK / AADHAAR) fits the 327-px content width on a 375-px iPhone viewport.

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
