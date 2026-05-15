#!/usr/bin/env bun
// Recover verbatim body content into EXISTING local Markdown files from a
// Squarespace WXR export. Preserves frontmatter; replaces only the body.
//
// migrate-wxr.ts SKIPS posts that already have a local file (its job is to
// add what's missing). This script is the inverse: it walks WXR posts that
// MATCH an existing file and overwrites the body with the WXR-derived
// markdown, optionally only when the local body is significantly shorter
// (so we never clobber a hand-curated long-form entry).
//
// Image handling and HTML cleanup mirror migrate-wxr.ts so the on-disk
// shape stays consistent across both flows.
//
// Usage:
//   bun run scripts/recover-from-wxr.ts <export.xml>
//                       # dry-run; lists files that would change + image fetch plan
//   bun run scripts/recover-from-wxr.ts <export.xml> --write
//                       # rewrite bodies + download images
//   bun run scripts/recover-from-wxr.ts <export.xml> --write --threshold 0.7
//                       # only rewrite when local < 70% of upstream chars
//   bun run scripts/recover-from-wxr.ts <export.xml> --write --no-fetch
//                       # rewrite only; skip image downloads
//   bun run scripts/recover-from-wxr.ts <export.xml> --write --col exclusion
//                       # restrict to one collection
//   bun run scripts/recover-from-wxr.ts <export.xml> --only <slug-substring>
//                       # narrow to a single file (handy for a one-off retry)

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const SRC = resolve(ROOT, 'src/content');

const args = process.argv.slice(2);
const xmlPath = args.find((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1]?.startsWith('--')));
const WRITE = args.includes('--write');
const NO_FETCH = args.includes('--no-fetch');
const FORCE = args.includes('--force');
const colArg = (() => {
  const i = args.indexOf('--col');
  return i >= 0 ? (args[i + 1] as 'update' | 'exclusion') : undefined;
})();
const only = (() => {
  const i = args.indexOf('--only');
  return i >= 0 ? args[i + 1] : undefined;
})();
const THRESHOLD = (() => {
  const i = args.indexOf('--threshold');
  return i >= 0 ? Number(args[i + 1]) : FORCE ? 1 : 0.7;
})();

if (!xmlPath) {
  console.error(
    'Usage: bun run scripts/recover-from-wxr.ts <export.xml> [--write] [--threshold N] [--col update|exclusion] [--only <slug>] [--no-fetch] [--force]',
  );
  process.exit(1);
}

// ---- WXR parsing (same shape as migrate-wxr.ts) ----------------------------

type WxrPost = {
  title: string;
  link: string;
  name: string;
  date: string;
  status: string;
  type: string;
  content: string;
};

function tag(itemXml: string, name: string): string {
  const re = new RegExp(`<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${name}>`);
  const m = itemXml.match(re);
  return (m?.[1] ?? m?.[2] ?? '').trim();
}

function parseWxr(path: string): WxrPost[] {
  const xml = readFileSync(path, 'utf8');
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.map((raw) => ({
    title: tag(raw, 'title'),
    link: tag(raw, 'link'),
    name: tag(raw, 'wp:post_name'),
    date: tag(raw, 'wp:post_date').slice(0, 10),
    status: tag(raw, 'wp:status'),
    type: tag(raw, 'wp:post_type'),
    content: tag(raw, 'content:encoded'),
  }));
}

// ---- Existing-file index ---------------------------------------------------

type Existing = {
  col: 'update' | 'exclusion';
  file: string;
  path: string;
  slug: string;
  date: string;
  title: string;
  sourceUrl: string;
  frontmatter: string;
  body: string;
};

function readMd(path: string) {
  const raw = readFileSync(path, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return m ? { frontmatter: m[1], body: m[2] } : { frontmatter: '', body: raw };
}

function parseExisting(): Existing[] {
  const out: Existing[] = [];
  for (const col of ['update', 'exclusion'] as const) {
    const dir = resolve(SRC, col);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
      const path = resolve(dir, f);
      const { frontmatter, body } = readMd(path);
      const fm: Record<string, string> = {};
      for (const line of frontmatter.split('\n')) {
        const kv = line.match(/^(\w+):\s*(.*)$/);
        if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
      }
      const stem = f.replace(/\.md$/, '');
      const md = stem.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
      out.push({
        col,
        file: f,
        path,
        slug: md ? md[2] : stem,
        date: md ? md[1] : (fm.date ?? '').slice(0, 10),
        title: fm.title ?? '',
        sourceUrl: fm.sourceUrl ?? '',
        frontmatter,
        body,
      });
    }
  }
  return out;
}

// ---- Match WXR → existing (mirror migrate-wxr.ts logic) --------------------

const titleTokens = (s: string) =>
  new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 2));

function urlPath(u: string): string {
  const m = u.match(/(\/(?:blog|testimonials|data-leaks)\/\d{4}\/\d{1,2}\/\d{1,2})(?:\/|$)/);
  return m ? m[1] : '';
}

function findMatch(w: WxrPost, existing: Existing[]): Existing | null {
  const wxrTail = w.link.replace(/\/$/, '').split('/').pop() ?? '';
  const wxrPath = urlPath(w.link);
  const normTitle = w.title.trim();
  const wt = titleTokens(w.title);

  for (const e of existing) {
    if (e.date === w.date && e.title.trim() === normTitle && normTitle.length > 0) return e;
  }
  if (wxrPath && (wxrTail === '-' || wxrTail === '')) {
    for (const e of existing) {
      if (!e.sourceUrl) continue;
      const eTail = e.sourceUrl.replace(/\/$/, '').split('/').pop() ?? '';
      if (urlPath(e.sourceUrl) === wxrPath && (eTail === '' || eTail === '-' || /^\d+$/.test(eTail))) {
        return e;
      }
    }
  }
  for (const e of existing) {
    if (e.sourceUrl && wxrTail && wxrTail !== '-' && e.sourceUrl.endsWith(`/${wxrTail}`)) return e;
    if (e.sourceUrl?.endsWith(w.link)) return e;
  }
  for (const e of existing) {
    if (e.date !== w.date) continue;
    const et = titleTokens(e.title);
    if (et.size === 0 || wt.size === 0) continue;
    let inter = 0;
    for (const t of wt) if (et.has(t)) inter++;
    if (inter / Math.max(wt.size, 1) >= 0.5) return e;
  }
  return null;
}

// ---- HTML helpers (mirror migrate-wxr.ts) ----------------------------------

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));

function localImage(url: string): string | null {
  const m = url.match(/squarespace-cdn\.com\/content\/v1\/[^/]+\/([^/]+)\/([^?"'\s]+)/);
  if (!m) return null;
  const [, dirHash, fname] = m;
  const safe = decodeURIComponent(fname).replace(/\+/g, '-').replace(/\s+/g, ' ');
  return `/media/${dirHash}-${safe}`;
}

function stripHtmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function cleanBody(html: string): string {
  return html
    .replace(/<div[^>]*class="sqs-[^"]*"[^>]*>/g, '')
    .replace(/<div[^>]*data-sqsp[^>]*>/g, '')
    .replace(/<\/div>/g, '')
    .replace(/\s+style="[^"]*"/g, '')
    .replace(/\s+class="[^"]*"/g, '')
    .replace(/\s+data-sqsp[a-z-]*="[^"]*"/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function rewriteImages(html: string): { html: string; downloads: Map<string, string> } {
  const downloads = new Map<string, string>();
  const out = html.replace(/(src|href)="([^"]+squarespace[^"]+)"/gi, (m, attr, url) => {
    const local = localImage(url);
    if (!local) return m;
    downloads.set(url, local);
    return `${attr}="${local}"`;
  });
  return { html: out, downloads };
}

async function downloadImage(remote: string, localPath: string) {
  const dest = resolve(ROOT, `public${localPath}`);
  if (existsSync(dest)) return 'exists' as const;
  if (!WRITE || NO_FETCH) return 'skipped' as const;
  try {
    const url = remote.split('?')[0];
    const r = await fetch(url, { headers: { 'user-agent': 'rethink-recover-wxr/1.0' } });
    if (!r.ok) {
      console.warn(`    ! HTTP ${r.status} for ${url}`);
      return 'failed' as const;
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    return 'downloaded' as const;
  } catch (e) {
    console.warn(`    ! download error: ${(e as Error).message}`);
    return 'failed' as const;
  }
}

// ---- Main ------------------------------------------------------------------

const all = parseWxr(xmlPath);
const posts = all.filter((p) => p.type === 'post' && p.status === 'publish');
const existing = parseExisting();

let scanned = 0;
let rewrote = 0;
let skippedExisting = 0;
let skippedNoMatch = 0;
let imagesArchived = 0;

console.log(`WXR posts (published): ${posts.length}.  Local files: ${existing.length}.`);
console.log(
  `Mode: ${WRITE ? 'WRITE' : 'dry-run'}.  Threshold: local < ${THRESHOLD * 100}% of upstream chars.`,
);
if (only) console.log(`Filter: --only ${only}`);
if (colArg) console.log(`Filter: --col ${colArg}`);
console.log('');

for (const w of posts) {
  const match = findMatch(w, existing);
  if (!match) {
    skippedNoMatch++;
    continue;
  }
  if (colArg && match.col !== colArg) continue;
  if (only && !match.file.includes(only) && !w.link.includes(only)) continue;

  scanned++;
  // Compare on raw HTML length, not text-after-strip: video-only entries
  // (iframe with no surrounding prose) strip to 0 chars but ARE the content.
  const localCleaned = match.body.replace(/^>\s*Read the original at[\s\S]*$/m, '').trim();
  const upstreamCleaned = w.content.trim();
  if (upstreamCleaned.length === 0) {
    skippedExisting++;
    continue;
  }
  const ratio = localCleaned.length / Math.max(upstreamCleaned.length, 1);
  if (ratio >= THRESHOLD && !FORCE) {
    skippedExisting++;
    continue;
  }
  const localBodyLen = localCleaned.length;
  const upstreamBodyLen = upstreamCleaned.length;

  const { html: rewritten, downloads } = rewriteImages(w.content);
  const cleaned = cleanBody(rewritten);

  const newFile = `---\n${match.frontmatter}\n---\n\n${cleaned}\n`;

  console.log(
    `${WRITE ? '✓' : '·'} ${match.col}/${match.file}  local=${localBodyLen} upstream=${upstreamBodyLen} ratio=${ratio.toFixed(2)} imgs=${downloads.size}`,
  );

  if (WRITE) writeFileSync(match.path, newFile);
  rewrote++;

  for (const [remote, local] of downloads) {
    const status = await downloadImage(remote, local);
    if (status === 'downloaded' || status === 'exists') imagesArchived++;
  }
}

console.log('');
console.log(
  `Summary: scanned=${scanned} rewritten=${rewrote} skipped-by-threshold=${skippedExisting} no-local-match=${skippedNoMatch} images=${imagesArchived}`,
);
if (!WRITE) console.log('(dry-run; pass --write to apply.)');
