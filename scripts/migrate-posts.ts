#!/usr/bin/env bun
// One-shot migration: turn each /blog and /testimonials HTML page into a
// front-matter Markdown stub. Editors can fill in the body later.
import { Glob } from 'bun';
import { resolve } from 'node:path';

const RAW = resolve('content-source/raw');
const OUT_BLOG = resolve('src/content/update');
const OUT_EXC = resolve('src/content/exclusion');

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(Number.parseInt(h, 16)));

function pick(html: string, re: RegExp) {
  const m = html.match(re);
  return m ? decode(m[1]).trim() : null;
}

function localImage(url: string | null) {
  // images.squarespace-cdn.com/content/v1/HASH1/HASH2/filename.ext
  if (!url) return null;
  const m = url.match(/squarespace-cdn\.com\/content\/v1\/[^/]+\/([^/]+)\/([^?"'\s]+)/);
  if (!m) return null;
  const [, dirHash, fname] = m;
  const safe = fname.replace(/\+/g, '-').replace(/%20/g, '-');
  return `/media/${dirHash}-${safe}`;
}

function slugFromFile(name: string, prefix: string) {
  // blog__2026__4__30__news-update-april-2026.html → 2026-04-30-news-update-april-2026
  const stem = name.replace(/\.html$/, '');
  const parts = stem.split('__');
  if (parts[0] !== prefix) return null;
  const [, y, m, d, ...rest] = parts;
  if (!y || !m || !d) return null;
  const slug = rest
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const pad = (s: string) => String(Number.parseInt(s, 10)).padStart(2, '0');
  return { date: `${y}-${pad(m)}-${pad(d)}`, slug };
}

async function processOne(file: string, prefix: string, outDir: string) {
  const html = await Bun.file(resolve(RAW, file)).text();
  const meta = slugFromFile(file, prefix);
  if (!meta) return false;
  const titleRaw =
    pick(html, /<meta\s+property="og:title"\s+content="([^"]+)"/i) ?? pick(html, /<title>([^<]+)<\/title>/i);
  if (!titleRaw) return false;
  const title = titleRaw.replace(/\s*[—–]\s*Rethink Aadhaar\s*$/i, '').trim();
  const desc = pick(html, /<meta\s+property="og:description"\s+content="([^"]+)"/i) || '';
  const ogImg = pick(html, /<meta\s+property="og:image"\s+content="([^"]+)"/i);
  const hero = localImage(ogImg);
  const liveUrl = `https://rethinkaadhaar.in/${prefix}/${meta.date.split('-')[0]}/${Number.parseInt(meta.date.split('-')[1], 10)}/${Number.parseInt(meta.date.split('-')[2], 10)}/${meta.slug.replace(/^[0-9-]+-/, '')}`;
  const truncDesc = desc.length > 320 ? `${desc.slice(0, 320).replace(/\s+\S*$/, '')}…` : desc;
  const fname = `${meta.date}-${meta.slug.replace(/^[0-9-]+-/, '')}.md`.replace(/--+/g, '-');
  const outPath = resolve(outDir, fname);
  if (await Bun.file(outPath).exists()) return false; // don't clobber hand-written posts
  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `date: ${meta.date}`,
    hero ? `hero: ${JSON.stringify(hero)}` : null,
    truncDesc ? `excerpt: ${JSON.stringify(truncDesc)}` : null,
    `sourceUrl: ${JSON.stringify(liveUrl)}`,
    '---',
    '',
    truncDesc ? `${truncDesc}\n` : '',
    `> Migrated from the live site. The full original post is at [${liveUrl}](${liveUrl}).`,
    '',
  ]
    .filter(Boolean)
    .join('\n');
  // Bun.write creates parent dirs implicitly.
  await Bun.write(outPath, fm);
  return true;
}

let blog = 0;
let exc = 0;
const names = (await Array.fromAsync(new Glob('*.html').scan({ cwd: RAW }))).sort();
for (const f of names) {
  if (f.startsWith('blog__')) blog += (await processOne(f, 'blog', OUT_BLOG)) ? 1 : 0;
  if (f.startsWith('testimonials__')) exc += (await processOne(f, 'testimonials', OUT_EXC)) ? 1 : 0;
}
console.log(`Migrated: ${blog} blog posts, ${exc} exclusion stories`);
