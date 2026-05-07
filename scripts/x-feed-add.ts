#!/usr/bin/env bun
/**
 * Manual entry helper for the @no2uid archive. Use this when the cron mirrors
 * are unreachable but you have post details to hand (a screenshot, a reply
 * notification, a quoted excerpt elsewhere).
 *
 * Two modes:
 *
 *   1. Bulk from a YAML/JSON-ish file:
 *        bun scripts/x-feed-add.ts scripts/x-feed-seed.json
 *      The file may be either a JSON array of entries, OR a JSONL stream
 *      (one entry per line).
 *
 *   2. Single entry via CLI flags:
 *        bun scripts/x-feed-add.ts \
 *          --id 1234567890 \
 *          --date 2025-12-10 \
 *          --text "Beware of Aadhaar — released today on Human Rights Day."
 *
 * Required fields per entry: id, date (ISO or YYYY-MM-DD), text.
 * Optional: isRetweet (bool), url (defaults to twitter.com/<handle>/status/<id>).
 *
 * Each entry is appended to the per-month archive (deduped by id) and, if
 * newer than what's currently in src/data/x-feed.json, the live feed is
 * regenerated from the merged archive (newest first).
 */

import { Glob } from 'bun';
import { join, resolve } from 'node:path';

const HANDLE = process.env.X_HANDLE ?? 'no2uid';
const LIVE_LIMIT = Number(process.env.X_LIVE_LIMIT ?? 8);

const DATA_DIR = resolve(import.meta.dir, '..', 'src', 'data');
const LIVE_PATH = join(DATA_DIR, 'x-feed.json');
const ARCHIVE_DIR = join(DATA_DIR, 'x-archive');

interface XPost {
  id: string;
  url: string;
  date: string;
  text: string;
  isRetweet: boolean;
}

interface MonthArchive {
  handle: string;
  month: string;
  posts: XPost[];
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return (await Bun.file(path).json()) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, data: unknown) {
  // Bun.write creates parent dirs implicitly.
  await Bun.write(path, `${JSON.stringify(data, null, 2)}\n`);
}

function normalise(raw: Record<string, unknown>): XPost {
  if (!raw.id) throw new Error(`entry missing id: ${JSON.stringify(raw)}`);
  if (!raw.text) throw new Error(`entry ${raw.id} missing text`);
  if (!raw.date) throw new Error(`entry ${raw.id} missing date`);

  const id = String(raw.id).trim();
  const date = new Date(String(raw.date)).toISOString();
  const url = (raw.url as string) ?? `https://twitter.com/${HANDLE}/status/${id}`;
  const text = String(raw.text).replace(/\s+/g, ' ').trim();
  const isRetweet = Boolean(raw.isRetweet);

  return { id, url, date, text, isRetweet };
}

function parseArgs(argv: string[]) {
  const args: { _: string[]; flags: Record<string, string | true> } = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args.flags[key] = next;
        i++;
      } else args.flags[key] = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function loadEntries(path: string): Promise<Record<string, unknown>[]> {
  const raw = (await Bun.file(path).text()).trim();
  // Try JSON array first; else treat as JSONL.
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.posts)) return parsed.posts;
    throw new Error('JSON file must be an array or { posts: [...] }');
  } catch {
    return raw
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  }
}

async function mergeOne(entry: XPost) {
  const month = entry.date.slice(0, 7);
  const path = join(ARCHIVE_DIR, `${month}.json`);
  const existing = await readJson<MonthArchive>(path, { handle: HANDLE, month, posts: [] });
  const seen = new Map(existing.posts.map((p) => [p.id, p]));
  if (seen.has(entry.id)) return false;
  seen.set(entry.id, entry);
  const merged = [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));
  await writeJson(path, { handle: HANDLE, month, posts: merged });
  return true;
}

async function regenerateLiveFromArchive() {
  const all: XPost[] = [];
  for await (const f of new Glob('*.json').scan({ cwd: ARCHIVE_DIR })) {
    const data = await readJson<MonthArchive | null>(join(ARCHIVE_DIR, f), null);
    if (data?.posts) all.push(...data.posts);
  }
  if (all.length === 0) return;
  all.sort((a, b) => b.date.localeCompare(a.date));
  const live = {
    handle: HANDLE,
    fetchedAt: new Date().toISOString(),
    source: 'manual',
    posts: all.slice(0, LIVE_LIMIT),
  };
  await writeJson(LIVE_PATH, live);
  console.log(`[x-feed-add] live: ${live.posts.length} posts (newest first) regenerated from archive`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let entries: Record<string, unknown>[] = [];

  if (args._.length > 0) {
    entries = await loadEntries(args._[0]);
  } else if (args.flags.id) {
    entries = [
      {
        id: args.flags.id,
        date: args.flags.date,
        text: args.flags.text,
        url: args.flags.url,
        isRetweet: args.flags.retweet === true || args.flags.retweet === 'true',
      },
    ];
  } else {
    console.error('Usage:');
    console.error('  bun scripts/x-feed-add.ts <file.json>');
    console.error('  bun scripts/x-feed-add.ts --id <id> --date <iso> --text "..." [--retweet]');
    process.exit(2);
  }

  let added = 0;
  for (const raw of entries) {
    const entry = normalise(raw);
    if (await mergeOne(entry)) {
      console.log(`[x-feed-add] +${entry.id} (${entry.date.slice(0, 10)}) ${entry.text.slice(0, 60)}…`);
      added++;
    } else {
      console.log(`[x-feed-add] skip ${entry.id} (already in archive)`);
    }
  }

  console.log(`[x-feed-add] ${added} added of ${entries.length} requested`);
  await regenerateLiveFromArchive();
}

await main();
