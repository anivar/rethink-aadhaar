#!/usr/bin/env bun
// One-shot migration from a Squarespace → WordPress (WXR) XML export.
// Use this when content exists in a WXR dump but not on the live site (or
// not yet crawled by sync.ts) — e.g. archived posts that pre-date the
// Astro rebuild.
//
// What it does:
//   1. Parses the WXR XML and lists every <item> of type "post".
//   2. Skips posts that already have a matching .md in src/content/ (matched
//      by sourceUrl, by date+title-token overlap, or by slug substring).
//   3. For each truly-missing post:
//        - rewrites images.squarespace-cdn.com/.../HASH2/file URLs →
//          /media/HASH2-file (same convention as migrate-posts.ts)
//        - downloads each referenced image to public/media/ (no clobber)
//        - writes a Markdown file under src/content/{update|exclusion}/
//          with the established frontmatter shape
//   4. Refuses to clobber any existing file.
//
// Usage:
//   bun run scripts/migrate-wxr.ts <export.xml>                       # dry-run
//   bun run scripts/migrate-wxr.ts <export.xml> --write               # write .md + fetch images
//   bun run scripts/migrate-wxr.ts <export.xml> --write --no-fetch    # write .md only (skip image fetch)
//   bun run scripts/migrate-wxr.ts <export.xml> --write --include-drafts

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const SRC = resolve(ROOT, 'src/content');

const args = process.argv.slice(2);
const xmlPath = args.find((a) => !a.startsWith('--'));
const WRITE = args.includes('--write');
const NO_FETCH = args.includes('--no-fetch');
const INCLUDE_DRAFTS = args.includes('--include-drafts');

if (!xmlPath) {
  console.error('Usage: bun run scripts/migrate-wxr.ts <export.xml> [--write] [--include-drafts]');
  process.exit(1);
}

// ---- WXR parsing ------------------------------------------------------------

type WxrPost = {
  title: string;
  link: string;
  name: string;
  date: string;
  status: string;
  type: string;
  content: string;
  cats: string[];
};

// Pull text out of either <tag>...</tag> or <tag><![CDATA[...]]></tag>.
function tag(itemXml: string, name: string): string {
  const re = new RegExp(`<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${name}>`);
  const m = itemXml.match(re);
  return (m?.[1] ?? m?.[2] ?? '').trim();
}

function parseWxr(path: string): WxrPost[] {
  const xml = readFileSync(path, 'utf8');
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.map((raw) => {
    const cats: string[] = [];
    const catRe = /<category[^>]*domain="category"[^>]*nicename="([^"]+)"/g;
    for (const cm of raw.matchAll(catRe)) cats.push(cm[1]);
    return {
      title: tag(raw, 'title'),
      link: tag(raw, 'link'),
      name: tag(raw, 'wp:post_name'),
      date: tag(raw, 'wp:post_date').slice(0, 10),
      status: tag(raw, 'wp:status'),
      type: tag(raw, 'wp:post_type'),
      content: tag(raw, 'content:encoded'),
      cats,
    };
  });
}

// ---- Existing-file index ----------------------------------------------------

type Existing = { col: string; file: string; slug: string; date: string; title: string; sourceUrl: string };

function parseExisting(): Existing[] {
  const out: Existing[] = [];
  for (const col of ['update', 'exclusion', 'press', 'page'] as const) {
    const dir = resolve(SRC, col);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
      const text = readFileSync(resolve(dir, f), 'utf8');
      const m = text.match(/^---\n([\s\S]*?)\n---/);
      const fm: Record<string, string> = {};
      if (m) {
        for (const line of m[1].split('\n')) {
          const kv = line.match(/^(\w+):\s*(.*)$/);
          if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
        }
      }
      const stem = f.replace(/\.md$/, '');
      const md = stem.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
      out.push({
        col,
        file: f,
        slug: md ? md[2] : stem,
        date: md ? md[1] : (fm.date ?? '').slice(0, 10),
        title: fm.title ?? '',
        sourceUrl: fm.sourceUrl ?? '',
      });
    }
  }
  return out;
}

const titleTokens = (s: string) =>
  new Set((s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 2));

// Normalise URLs so /blog/2017/4/26/ and /blog/2017/4/26/- and /blog/2017/4/26/foo
// can be compared sensibly. Returns the date-path part (e.g. "/blog/2017/4/26").
function urlPath(u: string): string {
  const m = u.match(/(\/(?:blog|testimonials|data-leaks)\/\d{4}\/\d{1,2}\/\d{1,2})(?:\/|$)/);
  return m ? m[1] : '';
}

function findMatch(w: WxrPost, existing: Existing[]): Existing | null {
  const wxrTail = w.link.replace(/\/$/, '').split('/').pop() ?? '';
  const wxrPath = urlPath(w.link);
  const normTitle = w.title.trim();
  const wt = titleTokens(w.title);

  // 1. Exact title match on same date — strongest signal, language-agnostic.
  for (const e of existing) {
    if (e.date === w.date && e.title.trim() === normTitle && normTitle.length > 0) return e;
  }
  // 2. Empty-slug Squarespace URLs (/blog/2017/4/26/-) collide with bare-date
  //    existing files whose sourceUrl ends in /blog/2017/4/26/. Only treat as
  //    a match when BOTH sides have an empty slug — otherwise multiple posts
  //    sharing one day's urlPath would produce false positives.
  const wxrSlugPart = w.link.replace(/\/$/, '').split('/').pop() ?? '';
  if (wxrPath && (wxrSlugPart === '-' || wxrSlugPart === '')) {
    for (const e of existing) {
      if (!e.sourceUrl) continue;
      const eSlugPart = e.sourceUrl.replace(/\/$/, '').split('/').pop() ?? '';
      if (
        urlPath(e.sourceUrl) === wxrPath &&
        (eSlugPart === '' || eSlugPart === '-' || /^\d+$/.test(eSlugPart))
      ) {
        return e;
      }
    }
  }
  // 3. sourceUrl tail match (slugged URLs)
  for (const e of existing) {
    if (e.sourceUrl && wxrTail && wxrTail !== '-' && e.sourceUrl.endsWith(`/${wxrTail}`)) return e;
    if (e.sourceUrl?.endsWith(w.link)) return e;
  }
  // 4. Date + title-token overlap (fuzzy fallback)
  for (const e of existing) {
    if (e.date !== w.date) continue;
    const et = titleTokens(e.title);
    if (et.size === 0 || wt.size === 0) continue;
    let inter = 0;
    for (const t of wt) if (et.has(t)) inter++;
    const overlap = inter / Math.max(wt.size, 1);
    if (overlap >= 0.5) return e;
  }
  // 5. Slug substring
  const cands = new Set([w.name, wxrTail, slugify(w.title)].filter((s) => s.length > 4));
  for (const e of existing) {
    for (const c of cands) {
      if (c === e.slug || (c.length > 5 && (e.slug.endsWith(c) || c.endsWith(e.slug)))) return e;
    }
  }
  return null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[-\s]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---- HTML helpers (mirror migrate-posts.ts conventions) ---------------------

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

// Same convention as migrate-posts.ts: take the second hash dir + filename.
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
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function cleanBody(html: string): string {
  return (
    html
      // drop Squarespace wrapper divs
      .replace(/<div[^>]*class="sqs-[^"]*"[^>]*>/g, '')
      .replace(/<div[^>]*data-sqsp[^>]*>/g, '')
      .replace(/<\/div>/g, '')
      // strip inline styles that pollute every Squarespace tag
      .replace(/\s+style="[^"]*"/g, '')
      .replace(/\s+class="[^"]*"/g, '')
      .replace(/\s+data-sqsp[a-z-]*="[^"]*"/g, '')
      // tidy whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
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

// ---- Image archiver ---------------------------------------------------------

async function downloadImage(
  remote: string,
  localPath: string,
): Promise<'downloaded' | 'exists' | 'skipped' | 'failed'> {
  const dest = resolve(ROOT, `public${localPath}`);
  if (existsSync(dest)) return 'exists';
  if (!WRITE || NO_FETCH) return 'skipped';
  try {
    const url = remote.split('?')[0]; // drop ?format=original; works fine on squarespace-cdn
    const r = await fetch(url, { headers: { 'user-agent': 'rethink-migrate-wxr/1.0' } });
    if (!r.ok) {
      console.warn(`    ! HTTP ${r.status} for ${url}`);
      return 'failed';
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    return 'downloaded';
  } catch (e) {
    console.warn(`    ! download error: ${(e as Error).message}`);
    return 'failed';
  }
}

// ---- Per-post writer --------------------------------------------------------

type Outcome = { wrote: boolean; reason: string; col?: string; file?: string; images?: number };

function classify(link: string): 'update' | 'exclusion' | null {
  if (link.startsWith('/blog/')) return 'update';
  if (link.startsWith('/testimonials/') || link.startsWith('/data-leaks/')) return 'exclusion';
  return null;
}

function fileSlug(w: WxrPost): string {
  const tail = w.link.replace(/\/$/, '').split('/').pop() ?? '';
  // Squarespace autogenerates random hash slugs like "9roe4axuruprxujk1sh3nptx29sch6"
  // when an editor leaves the slug blank. Heuristic: long, no hyphens, low vowel
  // density (random alphanumerics ~29%; English words ~40%+).
  const looksLikeRandomHash = (s: string) => {
    if (s.length < 20 || s.includes('-')) return false;
    const letters = s.replace(/[^a-z]/g, '');
    if (letters.length < 10) return false;
    const vowels = (letters.match(/[aeiou]/g) ?? []).length;
    return vowels / letters.length < 0.32;
  };
  const titleSlug = slugify(w.title);
  let candidate = '';
  if (tail && !/^[\d-]+$/.test(tail) && !looksLikeRandomHash(tail)) {
    candidate = tail;
  } else if (w.name && !looksLikeRandomHash(w.name) && !/^[\d/-]+$/.test(w.name)) {
    candidate = w.name;
  } else {
    candidate = titleSlug; // may be empty for non-Latin titles → bare-date filename (matches existing `YYYY-MM-DD-.md` Hindi convention)
  }
  return candidate
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildSourceUrl(link: string): string {
  // Squarespace dates in URLs use no-leading-zero month/day (e.g. /blog/2017/4/26/foo).
  // The link from WXR already follows that, so just prepend the host.
  return `https://rethinkaadhaar.in${link.startsWith('/') ? link : '/' + link}`;
}

async function migrateOne(w: WxrPost, existing: Existing[]): Promise<Outcome> {
  const col = classify(w.link);
  if (!col) return { wrote: false, reason: `unmappable URL ${w.link}` };

  const slug = fileSlug(w);
  // Empty slug is OK for non-Latin titles — produces YYYY-MM-DD-.md to match
  // the existing Hindi convention (e.g. src/content/update/2017-04-26-.md).
  const fname = `${w.date}-${slug}.md`;
  const dest = resolve(SRC, col, fname);
  if (existsSync(dest)) return { wrote: false, reason: `exists: ${col}/${fname}` };

  // Final dedup safety: if the slug already lives anywhere in this collection,
  // skip rather than risk a second copy under a slightly different filename.
  if (existing.some((e) => e.col === col && e.slug === slug)) {
    return { wrote: false, reason: `slug already in ${col}: ${slug}` };
  }

  const { html: rewritten, downloads } = rewriteImages(w.content);
  const cleaned = cleanBody(rewritten);
  const text = stripHtmlToText(cleaned);
  const excerpt = text.slice(0, 320).replace(/\s+\S*$/, '');

  // Hero = first downloaded image (if any)
  const firstLocal = downloads.values().next().value as string | undefined;

  const titleField = JSON.stringify(decodeEntities(w.title));
  const sourceUrl = buildSourceUrl(w.link);
  const summaryKey = col === 'exclusion' ? 'summary' : 'excerpt';

  const fm = [
    '---',
    `title: ${titleField}`,
    `date: ${w.date}`,
    firstLocal ? `${col === 'exclusion' ? 'shareImage' : 'hero'}: ${JSON.stringify(firstLocal)}` : null,
    excerpt ? `${summaryKey}: ${JSON.stringify(excerpt)}` : null,
    `sourceUrl: ${JSON.stringify(sourceUrl)}`,
    w.status === 'draft' ? 'draft: true' : null,
    '---',
    '',
    cleaned,
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');

  let imageReport = 0;
  for (const [remote, local] of downloads) {
    const status = await downloadImage(remote, local);
    if (status !== 'failed') imageReport++;
  }

  if (WRITE) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, fm);
  }

  return { wrote: true, reason: WRITE ? 'wrote' : 'dry-run', col, file: fname, images: imageReport };
}

// ---- Main -------------------------------------------------------------------

const all = parseWxr(xmlPath);
const posts = all.filter(
  (p) => p.type === 'post' && (p.status === 'publish' || (INCLUDE_DRAFTS && p.status === 'draft')),
);
const existing = parseExisting();

console.log(`WXR posts to consider: ${posts.length}  (existing files: ${existing.length})`);
if (!WRITE) console.log('(dry-run; pass --write to create files + download images)');
console.log('');

let wrote = 0;
let skipped = 0;
let imagesArchived = 0;

for (const w of posts) {
  const match = findMatch(w, existing);
  if (match) {
    skipped++;
    continue;
  }
  const out = await migrateOne(w, existing);
  if (out.wrote) {
    wrote++;
    imagesArchived += out.images ?? 0;
    console.log(`+ ${out.col}/${out.file}  (${out.images ?? 0} imgs)  ${w.title.slice(0, 60)}`);
  } else {
    console.log(`- skipped ${w.date}  ${w.title.slice(0, 60)}  → ${out.reason}`);
  }
}

console.log('');
console.log(`Summary: wrote=${wrote} dedup-skipped=${skipped} images-archived=${imagesArchived}`);
