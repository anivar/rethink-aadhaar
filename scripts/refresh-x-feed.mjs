#!/usr/bin/env node
/**
 * Pulls the latest posts from @no2uid via public Nitter / RSSHub mirrors and:
 *   1. writes the latest N to src/data/x-feed.json (used by the homepage strip)
 *   2. merges every post into a per-month archive at
 *      src/data/x-archive/YYYY-MM.json (deduped by tweet id, oldest-first)
 *
 * No Twitter API key required. If every mirror fails the existing files are
 * left untouched, so a transient outage does NOT blank the site.
 *
 * Exits 0 with `changed=true` written to $GITHUB_OUTPUT only when something
 * actually changed on disk, so the workflow can skip a no-op commit.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const HANDLE = process.env.X_HANDLE ?? 'no2uid';
const LIVE_LIMIT = Number(process.env.X_LIVE_LIMIT ?? 8);
const FETCH_LIMIT = Number(process.env.X_FETCH_LIMIT ?? 40);
const TIMEOUT_MS = 12_000;

const DEFAULT_SOURCES = [
  `https://rsshub.app/twitter/user/${HANDLE}/include_rts=1`,
  `https://nitter.privacydev.net/${HANDLE}/with_replies/rss`,
  `https://nitter.poast.org/${HANDLE}/with_replies/rss`,
  `https://nitter.tiekoetter.com/${HANDLE}/with_replies/rss`,
  `https://nitter.net/${HANDLE}/with_replies/rss`,
];
const SOURCES =
  process.env.X_FEED_SOURCES?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? DEFAULT_SOURCES;

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'src', 'data');
const LIVE_PATH = join(DATA_DIR, 'x-feed.json');
const ARCHIVE_DIR = join(DATA_DIR, 'x-archive');

async function fetchWithTimeout(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { 'User-Agent': 'rethink-aadhaar-feed/1.0 (+https://rethinkaadhaar.in)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const unwrap = (s) =>
  s
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .trim();
const stripHtml = (s) =>
  decode(
    s
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

function pickTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? unwrap(m[1]).trim() : '';
}

function parseFeed(xml) {
  const items = [];
  const re = /<item[\s>][\s\S]*?<\/item>/g;
  for (const m of xml.matchAll(re)) {
    const block = m[0];
    const link = pickTag(block, 'link');
    const titleRaw = pickTag(block, 'title');
    const descRaw = pickTag(block, 'description');
    const pubDate = pickTag(block, 'pubDate');
    const creator = pickTag(block, 'dc:creator');

    const idMatch = link.match(/status\/(\d+)/);
    if (!idMatch) continue;
    const id = idMatch[1];

    const text = stripHtml(titleRaw || descRaw);
    if (!text) continue;

    const isRetweet =
      /^RT\s/i.test(titleRaw) || (creator && !creator.toLowerCase().includes(HANDLE.toLowerCase()));

    items.push({
      id,
      url: `https://twitter.com/${HANDLE}/status/${id}`,
      date: pubDate ? new Date(pubDate).toISOString() : null,
      text,
      isRetweet: Boolean(isRetweet),
    });
  }
  items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return items.slice(0, FETCH_LIMIT);
}

async function tryFetch(url) {
  const xml = await fetchWithTimeout(url);
  if (!xml?.includes('<item')) throw new Error('feed contains no items');
  const posts = parseFeed(xml);
  if (posts.length === 0) throw new Error('parsed zero posts');
  return posts;
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function archiveKeyFor(iso) {
  if (!iso) return 'undated';
  return iso.slice(0, 7); // YYYY-MM
}

function mergeArchive(posts) {
  if (!existsSync(ARCHIVE_DIR)) mkdirSync(ARCHIVE_DIR, { recursive: true });

  // Group incoming by month, then merge into each month's file.
  const byMonth = new Map();
  for (const p of posts) {
    const key = archiveKeyFor(p.date);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(p);
  }

  let touched = 0;
  for (const [key, incoming] of byMonth) {
    const path = join(ARCHIVE_DIR, `${key}.json`);
    const existing = readJson(path, { handle: HANDLE, month: key, posts: [] });
    const seen = new Map(existing.posts.map((p) => [p.id, p]));
    let added = 0;
    for (const p of incoming) {
      if (!seen.has(p.id)) {
        seen.set(p.id, p);
        added++;
      }
    }
    if (added === 0) continue;
    const merged = [...seen.values()].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    writeJson(path, { handle: HANDLE, month: key, posts: merged });
    console.log(`[x-feed] archive ${key}: +${added} (total ${merged.length})`);
    touched++;
  }
  return touched;
}

async function main() {
  const errors = [];
  for (const src of SOURCES) {
    try {
      const posts = await tryFetch(src);

      const liveNext = {
        handle: HANDLE,
        fetchedAt: new Date().toISOString(),
        source: new URL(src).host,
        posts: posts.slice(0, LIVE_LIMIT),
      };

      const livePrev = readJson(LIVE_PATH, null);
      const liveSame = livePrev && JSON.stringify(livePrev.posts ?? []) === JSON.stringify(liveNext.posts);

      let changed = false;
      if (!liveSame) {
        writeJson(LIVE_PATH, liveNext);
        console.log(`[x-feed] live: ${liveNext.posts.length} posts via ${liveNext.source}`);
        changed = true;
      } else {
        console.log(`[x-feed] live: no change (${liveNext.posts.length} posts via ${liveNext.source})`);
      }

      const archiveTouched = mergeArchive(posts);
      if (archiveTouched > 0) changed = true;

      if (changed && process.env.GITHUB_OUTPUT) {
        appendFileSync(process.env.GITHUB_OUTPUT, 'changed=true\n');
      }
      if (!changed) console.log('[x-feed] nothing to commit');
      return;
    } catch (err) {
      errors.push(`${src}: ${err.message}`);
    }
  }

  console.warn('[x-feed] all sources failed; keeping existing cache');
  for (const e of errors) console.warn('  -', e);
}

main().catch((err) => {
  console.error('[x-feed] unexpected error:', err);
  process.exit(1);
});
