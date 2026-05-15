#!/usr/bin/env bun
// Audit coverage of upstream Squarespace content vs local Markdown.
//
// Three reports:
//   1. Coverage gaps  — upstream URLs that have no matching local file.
//   2. Body shrinkage — local body length < THRESHOLD * upstream body length.
//   3. Broken links   — local sourceUrl that returns non-200 upstream.
//
// Usage:
//   bun run scripts/audit-coverage.ts                 # full scan
//   bun run scripts/audit-coverage.ts --kind update   # only updates
//   bun run scripts/audit-coverage.ts --limit 20      # cap upstream fetches per kind
//   bun run scripts/audit-coverage.ts --threshold 0.7 # shrinkage cutoff (default 0.7)
//   bun run scripts/audit-coverage.ts --out report.md # write report to file
//
// The upstream sitemap lives at the staging origin which serves the same
// content under both rethinkuid.squarespace.com and rethinkaadhaar.in.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const UPSTREAM = 'https://rethinkuid.squarespace.com';
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const HEADERS = { 'user-agent': UA, referer: `${UPSTREAM}/` };

type Kind = 'update' | 'exclusion';
const KINDS: Record<Kind, { dir: string; upstreamPrefix: string }> = {
  update: { dir: 'src/content/update', upstreamPrefix: '/blog/' },
  exclusion: { dir: 'src/content/exclusion', upstreamPrefix: '/testimonials/' },
};

function parseArgs(argv: string[]) {
  const out: { kind?: Kind; limit?: number; threshold: number; outFile?: string } = { threshold: 0.7 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kind') out.kind = argv[++i] as Kind;
    else if (a === '--limit') out.limit = Number(argv[++i]);
    else if (a === '--threshold') out.threshold = Number(argv[++i]);
    else if (a === '--out') out.outFile = argv[++i];
  }
  return out;
}
const flags = parseArgs(process.argv.slice(2));

async function fetchText(url: string) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// Parse frontmatter + body. Trivial parser: only extracts the keys we need.
function readMarkdown(path: string) {
  const raw = readFileSync(path, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { sourceUrl: undefined as string | undefined, body: raw };
  const fm = m[1];
  const body = m[2];
  const u = fm.match(/^sourceUrl:\s*['"]?([^'"\n]+)['"]?\s*$/m);
  return { sourceUrl: u ? u[1] : undefined, body };
}

// Normalize: drop all HTML tags, collapse whitespace, return char count.
function textLen(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

// Pull the post-body subtree out of a Squarespace article page. Returns
// raw HTML so we can also count images later if we want; textLen() handles
// stripping. Falls back to whole page if marker absent (safer than throwing).
function extractPostBodyHtml(html: string): string {
  const startMarker = 'data-layout-label="Post Body"';
  const i = html.indexOf(startMarker);
  if (i < 0) return html;
  // Walk forward from the enclosing <div ...> open tag.
  const divOpen = html.lastIndexOf('<div ', i);
  if (divOpen < 0) return html;
  // Naive but adequate: find the matching close by counting <div>/</div>.
  let depth = 0;
  let j = divOpen;
  while (j < html.length) {
    const open = html.indexOf('<div', j);
    const close = html.indexOf('</div>', j);
    if (close < 0) break;
    if (open >= 0 && open < close) {
      depth++;
      j = open + 4;
    } else {
      depth--;
      j = close + 6;
      if (depth === 0) return html.slice(divOpen, j);
    }
  }
  return html.slice(divOpen);
}

// Local body length, with frontmatter already stripped by readMarkdown.
// Strip the conventional "> Read the original at <url>" trailer the sync
// script appends, so it doesn't inflate the local count.
function localBodyLen(body: string) {
  const cleaned = body.replace(/^>\s*Read the original at[\s\S]*$/m, '').trim();
  return cleaned.length;
}

function listLocal(kind: Kind) {
  const dir = resolve(ROOT, KINDS[kind].dir);
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  return files.map((f) => {
    const path = resolve(dir, f);
    const { sourceUrl, body } = readMarkdown(path);
    return { file: f, path, sourceUrl, localLen: localBodyLen(body) };
  });
}

// Sitemap URL → kind. Strip trailing slash, normalize host.
function classifyUrl(u: string): { kind: Kind; canonical: string } | null {
  const noSlash = u.replace(/\/$/, '');
  for (const k of Object.keys(KINDS) as Kind[]) {
    if (noSlash.includes(KINDS[k].upstreamPrefix.slice(0, -1) + '/')) {
      // Skip collection root and tag pages.
      const tail = noSlash.split(KINDS[k].upstreamPrefix)[1];
      if (!tail || tail.startsWith('tag/') || tail.startsWith('category/')) return null;
      return { kind: k, canonical: noSlash };
    }
  }
  return null;
}

// Squarespace's sitemap uses unpadded month/day (`/2018/1/17/`) but the
// migrate script wrote padded paths (`/2018/01/17/`). Strip leading zeros
// from the date components so the two forms compare equal.
function normalizeUrl(u: string) {
  return u
    .replace(/\/$/, '')
    .replace('https://rethinkaadhaar.in', UPSTREAM)
    .replace(/\/(\d{4})\/0?(\d{1,2})\/0?(\d{1,2})\//, '/$1/$2/$3/');
}

async function fetchUpstreamSitemap(): Promise<{ kind: Kind; url: string }[]> {
  const xml = await fetchText(`${UPSTREAM}/sitemap.xml`);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const out: { kind: Kind; url: string }[] = [];
  for (const u of locs) {
    const c = classifyUrl(u);
    if (c) out.push({ kind: c.kind, url: normalizeUrl(c.canonical) });
  }
  return out;
}

async function main() {
  console.log('Fetching upstream sitemap…');
  const upstream = await fetchUpstreamSitemap();
  const upstreamByKind: Record<Kind, Set<string>> = {
    update: new Set(),
    exclusion: new Set(),
  };
  for (const { kind, url } of upstream) upstreamByKind[kind].add(url);
  console.log(
    `Upstream: ${upstreamByKind.update.size} updates, ${upstreamByKind.exclusion.size} exclusions.`,
  );

  const lines: string[] = [];
  const print = (s = '') => {
    console.log(s);
    lines.push(s);
  };

  print(`# Upstream coverage audit\n`);
  print(`_Generated: ${new Date().toISOString()}_  `);
  print(`_Upstream: ${UPSTREAM}_  `);
  print(`_Shrinkage threshold: local < ${flags.threshold * 100}% of upstream chars._\n`);

  for (const kind of Object.keys(KINDS) as Kind[]) {
    if (flags.kind && flags.kind !== kind) continue;

    print(`## ${kind}s\n`);
    const local = listLocal(kind);
    const localByUrl = new Map<string, (typeof local)[number]>();
    const localNoSrc: typeof local = [];
    for (const e of local) {
      if (!e.sourceUrl) {
        localNoSrc.push(e);
      } else {
        localByUrl.set(normalizeUrl(e.sourceUrl), e);
      }
    }

    const upstreamUrls = [...upstreamByKind[kind]];
    const missing = upstreamUrls.filter((u) => !localByUrl.has(u));
    const orphans = [...localByUrl.entries()].filter(([u]) => !upstreamByKind[kind].has(u));

    print(`Local: ${local.length}, with sourceUrl: ${local.length - localNoSrc.length}.`);
    print(`Upstream: ${upstreamUrls.length}.`);
    print('');

    print(`### 1. Coverage gaps — upstream not in local (${missing.length})\n`);
    if (missing.length === 0) print('_None._\n');
    for (const u of missing) print(`- ${u}`);
    print('');

    print(`### 2. Local files with no sourceUrl (${localNoSrc.length})\n`);
    if (localNoSrc.length === 0) print('_None._\n');
    for (const e of localNoSrc) print(`- ${e.file}`);
    print('');

    print(`### 3. Local sourceUrl not found upstream (${orphans.length})\n`);
    print('_(Could be renamed slugs, archived posts, or wrong sourceUrl values.)_\n');
    if (orphans.length === 0) print('_None._\n');
    for (const [u, e] of orphans) print(`- ${e.file} → ${u}`);
    print('');

    print(`### 4. Body shrinkage (local < ${flags.threshold * 100}% of upstream)\n`);
    const matched = [...localByUrl.entries()].filter(([u]) => upstreamByKind[kind].has(u));
    const toCheck = flags.limit ? matched.slice(0, flags.limit) : matched;
    print(`_Checking ${toCheck.length}/${matched.length} matched entries._\n`);

    const shrunk: { file: string; url: string; localLen: number; upstreamLen: number; ratio: number }[] = [];
    let i = 0;
    for (const [url, entry] of toCheck) {
      i++;
      try {
        const html = await fetchText(url);
        const upstreamLen = textLen(extractPostBodyHtml(html));
        const ratio = upstreamLen === 0 ? 1 : entry.localLen / upstreamLen;
        if (ratio < flags.threshold) {
          shrunk.push({ file: entry.file, url, localLen: entry.localLen, upstreamLen, ratio });
        }
        if (i % 20 === 0) console.log(`  …${i}/${toCheck.length}`);
      } catch (err) {
        console.warn(`  ✗ ${url} — ${(err as Error).message}`);
      }
    }
    shrunk.sort((a, b) => a.ratio - b.ratio);
    print(`Found ${shrunk.length} shrunk entries:\n`);
    print('| ratio | local | upstream | file |');
    print('|------:|------:|---------:|------|');
    for (const s of shrunk) {
      print(`| ${s.ratio.toFixed(2)} | ${s.localLen} | ${s.upstreamLen} | ${s.file} |`);
    }
    print('');
  }

  if (flags.outFile) {
    writeFileSync(resolve(ROOT, flags.outFile), lines.join('\n'));
    console.log(`\nReport written to ${flags.outFile}.`);
  }
}

await main();
