# Rethink Aadhaar — Claude Instructions

## Project
Static site for rethinkaadhaar.in — Astro 6, Tailwind v4, MDX Content Collections, Biome, Bun.

## Commands
- `bun run dev` — dev server
- `bun run build` — full build (typecheck + build + scripts)
- `bun run check` — Biome lint + format check
- `bun run fix` — Biome auto-fix

## Code Style
- Biome formatting: single quotes, 2-space indent, 110 width, trailing commas, semicolons
- Astro components in PascalCase
- Utilities in `src/lib/` — single source of truth pattern
- Path alias `~/*` → `src/*`
- No JS doc comments unless explaining public API

## Content
- Zod-typed content collections in `src/content.config.ts`
- Use `entryHref()` from `src/lib/entries.ts` for internal links
- Use `link()` from `src/lib/link.ts` for base-path-aware URLs
- Draft entries: `draft: true` in frontmatter hides from indexes/RSS/sitemap
