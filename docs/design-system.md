# Design system — v2

Editorial-poster identity for Rethink Aadhaar. Cream paper as the default
canvas, dark as opt-in. Fluid type, fluid space, no breakpoints sprinkled
through component classes.

The live reference is `/styleguide` (excluded from the sitemap, `noindex`).
This document is the written companion — it explains the *why* behind the
choices.

---

## Foundations

### Colour

Tokens live as RGB triplets in `@layer base` so opacity utilities
(`bg-bg/85`) resolve through Tailwind's `<alpha-value>`. Never hard-code
hex values in components — always reference the token.

| Token              | Light          | Dark           | Use                                                |
| ------------------ | -------------- | -------------- | -------------------------------------------------- |
| `--color-bg`       | `#F7F2E8`      | `#0F0D0A`      | Page background                                    |
| `--color-ink`      | `#111111`      | `#F3ECE0`      | Primary text + button fills                        |
| `--color-rule`     | `#E7DFCD`      | `#2A2620`      | Hairlines, dividers                                |
| `--color-surface`  | `#FFFFFF`      | `#1A1814`      | Cards, panels                                      |
| `--color-muted`    | `#5B554C`      | `#A8A195`      | Secondary text — passes WCAG AA on `--color-bg`    |
| `--color-accent`   | `#D7282F`      | `#D7282F`      | Brand red — links, eyebrows, focus, CTA borders   |
| `--color-myth`     | `#F5B81D`      | `#F5B81D`      | Myth/Fact callouts                                 |

Dark mode is **opt-in via the `.dark` class on `<html>`**, not OS pref.
The toggle persists to localStorage; the `astro:after-swap` listener in
`BaseLayout.astro` re-syncs the class on every view transition.

`color-scheme: light | dark` is set on `:root` and `.dark` so native UI
(scrollbars, form controls, selection) adapts.

`@media (prefers-contrast: more)` punches up `--rule` and `--muted` for
users who request higher contrast (WCAG 2.2 1.4.6 helper).

### Type

Three self-hosted variable faces via `@fontsource-variable`:

| Family            | Use                                                           |
| ----------------- | ------------------------------------------------------------- |
| `Fraunces`        | Display headings (`h1`–`h3`, `hero-display` utility)          |
| `Inter`           | Body, UI, `caps` utility (eyebrows, nav, button labels)       |
| `JetBrains Mono`  | `caps-mono` utility — documentary labels (Q01, dates, MYTH)   |

Each ships per-subset woff2 with `unicode-range`, so the browser only
fetches the subsets it actually renders. Total font payload is well under
180KB (the 2026 perf budget for a content site).

The fluid type scale is `clamp()`-based, interpolating between 320 and
1440px viewport. Resize the window on `/styleguide` to verify.

| Token             | Min       | Max       | Use                                                |
| ----------------- | --------- | --------- | -------------------------------------------------- |
| `--text-display`  | 2rem      | 6.5rem    | `hero-display` utility — homepage lockup only      |
| `--text-h1`       | 2.25rem   | 4.5rem    | Page titles via `<h1>` or `HeroTitle variant=page` |
| `--text-h2`       | 1.75rem   | 2.75rem   | Section headings                                   |
| `--text-h3`       | 1.25rem   | 1.625rem  | Subsection / card titles                           |
| `--text-body`     | 1rem      | 1.0625rem | Body copy                                          |
| `--text-small`    | 0.875rem  | —         | Captions, footnotes                                |
| `--text-eyebrow`  | 0.78rem   | —         | `eyebrow` utility                                  |

**Why `--text-display` is homepage-only.** Fraunces ExtraBold has wider
glyph metrics than Inter; "TAKE ACTION" at the display size doesn't fit
in a 327px viewport (375 − 48 padding). The `HeroTitle` component
defaults to `variant="page"` to prevent regressions; `variant="display"`
should only be used on `index.astro`.

`text-wrap: pretty` is applied globally to `p, li, blockquote` (2026
baseline-safe). Headings keep `text-wrap: balance` for tighter ragging.

### Space

Section padding lives as named tokens (`--section-y-sm`, `--section-y-md`,
`--section-y-lg`, `--section-y-xl`). **Do not** define numeric
`--spacing-N` values in `@theme` — Tailwind v4 reads those as overriding
the `w-N`/`h-N`/`p-N` utilities, which silently breaks every fixed-size
icon button on the site. (We learned this the hard way; see PR #30.)

### Layout containers

| Class             | Max width    | Use                                              |
| ----------------- | ------------ | ------------------------------------------------ |
| `container-prose` | 56rem        | Default page container                           |
| `container-wide`  | 80rem        | Header, full-bleed sections                      |
| `measure`         | 65ch         | Long-form prose (article body)                   |

---

## Components

### Buttons

Three utilities, all built on the shared `btn` base (`caps` label,
`inline-flex`, `transition-colors`):

- `btn-primary` — filled, ink background, accent left-border
- `btn-secondary` — outline, transparent background, accent left-border
- `btn-link` — inline accent-coloured link with underline offset

Touch-target size (≥24×24 CSS px) is satisfied by the default padding.
Don't shrink below the utility defaults — it's a WCAG 2.2 (2.5.8)
requirement.

The legacy aliases `btn-dark` / `btn-outline` / `btn-ghost` were removed
in the v2 migration. Update any new component code to use the canonical
names directly.

### `HeroTitle`

```astro
<HeroTitle eyebrow="Common questions">FAQs</HeroTitle>          {/* page variant */}
<HeroTitle align="center" variant="display">Rethink Aadhaar</HeroTitle>
```

Props:

| Prop      | Type                       | Default     | Notes                                                  |
| --------- | -------------------------- | ----------- | ------------------------------------------------------ |
| `eyebrow` | `string?`                  | —           | Optional caps label above the title                    |
| `rule`    | `boolean?`                 | display:✓ page:✗ | Red 4-px rule above the eyebrow                  |
| `align`   | `'center' \| 'left'`       | `'center'`  | Text alignment                                         |
| `variant` | `'display' \| 'page'`      | `'page'`    | `display` = homepage hero only (see type scale notes)  |

### `SiteHeader`

Sticky, translucent, with a scroll-driven hairline. Uses
`animation-timeline: scroll()` (2026 baseline-safe) to fade the
border-bottom in once the user has scrolled ~16–48px past the top.
Falls back to an always-on hairline on UAs without
`@supports (animation-timeline: scroll())`.

`prefers-reduced-transparency: reduce` collapses `backdrop-filter` to an
opaque background globally (not just on the header) — see `global.css`.

---

## Accessibility baseline

- WCAG 2.2 target sizes (≥24×24, with `--focus-visible` ring at
  `outline-offset: 3px` for clarity).
- `prefers-reduced-motion` gates all keyframe animations.
- `prefers-reduced-transparency` collapses backdrop-filter usage.
- `prefers-contrast: more` boosts rule + muted token contrast.
- Skip-to-content link in `BaseLayout`.
- `color-scheme` declared on both `:root` and `.dark`.

---

## Performance budget (2026)

| Metric                | Target          |
| --------------------- | --------------- |
| INP                   | ≤ 200 ms        |
| LCP                   | ≤ 2.0 s         |
| CLS                   | ≤ 0.05          |
| Font payload (total)  | ≤ 180 KB woff2  |
| JS bundle (per page)  | ≤ 30 KB         |

`fontsource-variable` per-subset chunking + the absence of any client-side
framework (vanilla JS for the toggle + menu) keeps us comfortably within
all five.
