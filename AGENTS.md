# Rethink Aadhaar — Agent Guide

## Project

Static site for [rethinkaadhaar.in](https://rethinkaadhaar.in) — an accessibility-first Astro rebuild of the Rethink Aadhaar campaign site. Content published under CC BY 4.0.

## Tech Stack

- **Astro 6** (static output, TypeScript strict)
- **Tailwind v4** (CSS-first `@theme` config) + `@tailwindcss/typography`
- **MDX** content via Astro Content Collections (Zod-typed)
- **Biome** for linting + formatting
- **Bun** 1.3+ runtime + package manager

## Essential Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server on :4321 |
| `bun run build` | optimize-images + astro check + build + scripts |
| `bun run preview` | Serve dist/ on :4321 |
| `bun run check` | Biome lint + format check (read-only) |
| `bun run fix` | Biome auto-fix (safe rules only) |
| `bun run lint` | Biome lint only |
| `bun run format` | Biome format --write |
| `just <cmd>` | Wrapper for any of the above |

## Type Checking

- `astro check` runs as part of `bun run build`
- Extends `astro/tsconfigs/strict`
- Path alias: `~/*` maps to `src/*`

## Code Conventions

- **Formatting**: Biome, single quotes, 2-space indent, 110 line width, trailing commas always, semicolons always
- **Imports**: `useImportType` off (use explicit `import type`), `useNodejsImportProtocol` warn
- **No unused variables/imports** warn in JS/TS, off in `.astro` files
- **No non-null assertions** allowed (`noNonNullAssertion: off`)
- **No explicit any** allowed (`noExplicitAny: off`)
- **Astro files**: Arrow functions off; unused vars/imports checks off

## Project Structure

```
src/
  components/     — Astro components (PascalCase.astro)
  layouts/        — BaseLayout.astro
  pages/          — Route pages
  content/        — MDX content collections
  lib/            — Core utilities (single source of truth)
    format.ts     — Date formatting (5 standard styles)
    entries.ts    — entryHref(), sort/filter, collection types
    categories.ts — Collection categories for scripts
    seo.ts        — JSON-LD builders
    link.ts       — Base-path-aware link()
  content.config.ts — Zod schemas for all collections
styles/           — Global CSS / Tailwind config
scripts/          — Build-time scripts (TypeScript)
content-source/   — External content source
```

## Content Collections (Zod-typed)

- `myth` — myth/fact pairs with order
- `update` — blog/news entries with date, draft flag, source URL
- `exclusion` — exclusion stories with location, summary
- `faq` — FAQ entries with question/short description
- `resource` — resources grouped by section
- `press` — press coverage entries with publication name
- `page` — static pages (about, code-of-conduct, etc.)

## Deployment

GitHub Pages auto-deployed from `main` via `.github/workflows/deploy.yml`. PR checks run via `pr-check.yml`.

## Key Details

- Site URL and base path overridden in CI via env vars `SITE_URL` and `BASE_PATH`
- `<ClientRouter />` for view transitions
- Dark mode via `class` strategy + `localStorage`
- Fonts: Inter, Fraunces, JetBrains Mono (self-hosted woff2)
- Content uses `rehype-base-href` plugin for portable internal links
