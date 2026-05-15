#!/usr/bin/env bun
// One-shot recovery: scan every update/exclusion .md that has a `sourceUrl:`,
// fetch the upstream Squarespace page, find YouTube/Vimeo iframes (direct or
// embedly-wrapped), and append the canonical URL on its own line at the end
// of the body. The remark-youtube plugin then renders the embed at build
// time. URLs already present in the body are skipped.
//
// The custom .in domain now points at the new static site, so fetches go via
// rethinkuid.squarespace.com — that's where the original Squarespace content
// still lives.
//
//   bun run scripts/recover-videos.ts            # dry-run, list what'd change
//   bun run scripts/recover-videos.ts --write    # actually edit the files

import { Glob } from 'bun';
import { resolve } from 'node:path';

const COLLECTIONS = ['update', 'exclusion'];
const HOST_REWRITE: Array<[RegExp, string]> = [
  [/^https?:\/\/rethinkaadhaar\.in/i, 'https://rethinkuid.squarespace.com'],
];
const FETCH_DELAY_MS = 200;
const WRITE = process.argv.includes('--write');

type Found = { provider: 'youtube' | 'vimeo'; id: string };

function rewriteHost(url: string): string {
  for (const [re, to] of HOST_REWRITE) if (re.test(url)) return url.replace(re, to);
  return url;
}

function tryDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function harvest(seen: Map<string, Found>, raw: string) {
  const src = tryDecode(raw);
  let yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/);
  if (!yt) yt = src.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (!yt) yt = src.match(/youtube\.com\/watch\?(?:[^"&\s]*&)?v=([A-Za-z0-9_-]{11})/);
  if (yt) {
    seen.set(`yt:${yt[1]}`, { provider: 'youtube', id: yt[1] });
    return;
  }
  const vim = src.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/);
  if (vim) seen.set(`vm:${vim[1]}`, { provider: 'vimeo', id: vim[1] });
}

function extract(html: string): Found[] {
  const seen = new Map<string, Found>();
  // Iframe embeds (direct + embedly-wrapped).
  for (const m of html.matchAll(/<iframe\b[^>]*\bsrc="([^"]+)"/gi)) harvest(seen, m[1]);
  // Anchor links to videos — the original Squarespace posts usually surface
  // videos this way (text links) rather than as iframe embeds. We treat both
  // as recoverable so the new embed plugin can render them inline.
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
    const href = m[1];
    if (!/youtube\.com|youtu\.be|vimeo\.com/i.test(href)) continue;
    harvest(seen, href);
  }
  return [...seen.values()];
}

// True when the body already contains the video on its own paragraph line —
// i.e. the remark plugin would already render it as an embed. Inline anchor
// references that *mention* the same ID don't count: the recovery's job is
// precisely to surface those as standalone embeds.
function bodyHasEmbed(body: string, v: Found): boolean {
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t.includes(v.id)) continue;
    if (
      v.provider === 'youtube' &&
      /^https?:\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[A-Za-z0-9_-]{11}/.test(
        t,
      )
    )
      return true;
    if (v.provider === 'vimeo' && /^https?:\/\/(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?\d+/.test(t))
      return true;
  }
  return false;
}

function canonicalUrl(v: Found): string {
  return v.provider === 'youtube' ? `https://www.youtube.com/watch?v=${v.id}` : `https://vimeo.com/${v.id}`;
}

async function processFile(path: string) {
  const text = await Bun.file(path).text();
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) return null;
  const [, fm, body] = fmMatch;
  const srcMatch = fm.match(/^sourceUrl:\s*"([^"]+)"/m);
  if (!srcMatch) return { skip: 'no sourceUrl' as const };
  const url = rewriteHost(srcMatch[1]);

  // Squarespace slugs sometimes have a trailing dash that the migration
  // script stripped; retry with `-` appended on a 404.
  async function get(target: string): Promise<Response> {
    return fetch(target, {
      headers: {
        'user-agent': 'rethink-aadhaar-video-recovery/1.0 (+https://github.com/No2UID/rethink-aadhaar)',
      },
      redirect: 'follow',
    });
  }
  let res: Response;
  try {
    res = await get(url);
    if (res.status === 404 && !url.endsWith('-')) {
      const retry = await get(`${url}-`);
      if (retry.ok) res = retry;
    }
  } catch (e) {
    return { error: String((e as Error).message) };
  }
  if (!res.ok) return { error: `HTTP ${res.status}`, url };
  const html = await res.text();
  const videos = extract(html);
  if (videos.length === 0) return { count: 0 };

  const newOnes = videos.filter((v) => !bodyHasEmbed(body, v));
  if (newOnes.length === 0) return { count: videos.length, allPresent: true };

  if (WRITE) {
    const additions = newOnes.map(canonicalUrl).join('\n\n');
    const newBody = `${body.replace(/\s+$/, '')}\n\n${additions}\n`;
    const newText = `---\n${fm}\n---\n${newBody}`;
    await Bun.write(path, newText);
  }
  return { added: newOnes.map(canonicalUrl) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let totalAdded = 0;
let filesTouched = 0;
let errors = 0;
let scanned = 0;

for (const col of COLLECTIONS) {
  const dir = resolve('src/content', col);
  const files = (await Array.fromAsync(new Glob('*.md').scan({ cwd: dir, absolute: true }))).sort();
  console.log(`\n== ${col} (${files.length} files) ==`);
  for (const f of files) {
    scanned++;
    const result = await processFile(f);
    const name = f.split('/').pop();
    if (!result || 'skip' in result) continue;
    if ('error' in result) {
      console.log(`  ! ${result.error}  ${name}`);
      errors++;
    } else if ('added' in result) {
      console.log(`  + ${result.added.length} video(s) → ${name}`);
      for (const u of result.added) console.log(`      ${u}`);
      totalAdded += result.added.length;
      filesTouched++;
    }
    await sleep(FETCH_DELAY_MS);
  }
}

console.log(
  `\nDone. Scanned ${scanned} files. ${WRITE ? 'Wrote' : 'Would write'} ${totalAdded} video(s) into ${filesTouched} file(s). ${errors} fetch error(s).`,
);
if (!WRITE) console.log('Re-run with --write to apply.');
