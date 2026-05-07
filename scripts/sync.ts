#!/usr/bin/env bun
// Sync new content from the live rethinkaadhaar.in site.
//
// What it does:
//   1. Fetches https://rethinkaadhaar.in/sitemap.xml
//   2. Filters URLs by category (/blog/* → update, /testimonials/* → exclusion)
//   3. For each URL not already represented locally (matched by slug),
//      fetches the page, extracts og:title + og:description + datePublished
//      + og:image, and writes a new draft Markdown file under the right
//      collection.
//
// Press coverage cannot be auto-synced — it's a curated, hand-built list of
// third-party publications, not pages on rethinkaadhaar.in. Add new entries
// with `bun run new -- press ...`.
//
// Usage:
//   bun run sync                 # dry-run: list new URLs, write nothing
//   bun run sync -- --write      # write new draft files
//   bun run sync -- --since 2026-01-01    # only entries on/after this date

import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATEGORIES, type CategoryKey } from '~/lib/categories';

const ROOT = resolve(import.meta.dir, '..');
const SITE = 'https://rethinkaadhaar.in';

function parseArgs(argv: string[]) {
  const flags: { write: boolean; since?: string } = { write: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--write') flags.write = true;
    else if (argv[i] === '--since') flags.since = argv[++i];
  }
  return flags;
}
const flags = parseArgs(process.argv.slice(2));

async function fetchText(url: string) {
  const r = await fetch(url, { headers: { 'user-agent': 'rethink-sync/1.0' } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
}

function existingSlugs(dir: string) {
  try {
    return new Set(
      readdirSync(resolve(ROOT, dir))
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, '')),
    );
  } catch {
    return new Set<string>();
  }
}

// Squarespace URLs look like /blog/2024/3/12/headline-slug.
// Squarespace also pads month/day with no leading zero.
function urlToParts(href: string) {
  const m = href.match(/^\/(blog|testimonials)\/(\d{4})\/(\d{1,2})\/(\d{1,2})\/(.+?)\/?$/);
  if (!m) return null;
  const [, kind, y, mo, d, slug] = m;
  const date = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return { kind, date, slug, fullSlug: `${date}-${slug}` };
}

function ogMeta(html: string, prop: string) {
  const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'));
  return m ? m[1] : null;
}
function nameMeta(html: string, name: string) {
  const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'));
  return m ? m[1] : null;
}
function jsonLdDate(html: string) {
  const m = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
  return m ? m[1].slice(0, 10) : null;
}

async function syncCategory(catKey: CategoryKey) {
  const cfg = CATEGORIES[catKey];
  console.log(`\n=== ${cfg.label} (${cfg.upstreamPath}) ===`);

  const sitemapXml = await fetchText(`${SITE}/sitemap.xml`);
  const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const candidates = urls
    .map((u) => u.replace(SITE, ''))
    .map((p) => ({ path: p, parts: urlToParts(p) }))
    .filter((x) => x.parts && `/${x.parts.kind}` === cfg.upstreamPath);

  const existing = existingSlugs(cfg.collectionDir);
  const fresh = candidates.filter(({ parts }) => !existing.has(parts.fullSlug));

  const filtered = flags.since ? fresh.filter(({ parts }) => parts.date >= flags.since) : fresh;
  console.log(
    `Upstream: ${candidates.length}  local: ${existing.size}  new: ${filtered.length}${flags.since ? ` (since ${flags.since})` : ''}`,
  );
  if (!flags.write) {
    for (const { path, parts } of filtered.slice(0, 50)) console.log(`  + ${parts.date}  ${path}`);
    if (filtered.length > 50) console.log(`  … ${filtered.length - 50} more`);
    return { added: 0, found: filtered.length };
  }

  let added = 0;
  for (const { path, parts } of filtered) {
    try {
      const html = await fetchText(`${SITE}${path}`);
      const title = ogMeta(html, 'title') ?? parts.slug.replace(/-/g, ' ');
      const desc = ogMeta(html, 'description') ?? nameMeta(html, 'description') ?? '';
      const image = ogMeta(html, 'image');
      const date = jsonLdDate(html) ?? parts.date;
      const sourceUrl = `${SITE}${path}`;
      const file = resolve(ROOT, cfg.collectionDir, `${parts.fullSlug}.md`);

      const fm = ['---'];
      fm.push(`title: ${JSON.stringify(title.replace(/&amp;/g, '&'))}`);
      fm.push(`date: ${date}`);
      if (catKey === 'update') {
        if (desc) fm.push(`excerpt: ${JSON.stringify(desc.slice(0, 320))}`);
        if (image) fm.push(`hero: ${JSON.stringify(image)}`);
        fm.push(`sourceUrl: ${JSON.stringify(sourceUrl)}`);
        fm.push('draft: true');
      } else {
        if (desc) fm.push(`summary: ${JSON.stringify(desc.slice(0, 320))}`);
        if (image) fm.push(`shareImage: ${JSON.stringify(image)}`);
        fm.push(`sourceUrl: ${JSON.stringify(sourceUrl)}`);
      }
      fm.push('---', '');
      fm.push(desc || `<!-- Migrated stub. Read the original at ${sourceUrl} -->`);
      fm.push('');
      fm.push(`> Read the original at [${sourceUrl}](${sourceUrl}).`);
      fm.push('');
      // Bun.write creates parent dirs implicitly.
      await Bun.write(file, fm.join('\n'));
      console.log(`  ✓ ${parts.fullSlug}.md`);
      added++;
    } catch (err) {
      console.warn(`  ✗ ${path} — ${(err as Error).message}`);
    }
  }
  return { added, found: filtered.length };
}

const totals = { added: 0, found: 0 };
for (const k of ['update', 'exclusion'] as const) {
  const r = await syncCategory(k);
  totals.added += r.added;
  totals.found += r.found;
}
console.log(
  `\nDone. ${flags.write ? `${totals.added} files written.` : `${totals.found} would be written. Re-run with --write to commit.`}`,
);
