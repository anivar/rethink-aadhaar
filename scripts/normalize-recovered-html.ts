#!/usr/bin/env bun
// Post-process recovered Markdown bodies so HTML imported from Squarespace
// renders correctly:
//   1. Lines indented with 4+ spaces are CommonMark indented code blocks.
//      The recovered HTML inherits div-nesting indentation that has no
//      semantic meaning here — strip leading whitespace from any line that
//      starts with `<` so HTML blocks are parsed as HTML, not code.
//   2. Collapse runs of 3+ blank lines to 2.
//   3. Normalize `<iframe src="//www.youtube.com/embed/...">` to the
//      privacy-respecting `youtube-nocookie.com` host (matches the policy
//      already applied to bare URLs by remark-youtube.mjs).
//
// Usage:
//   bun run scripts/normalize-recovered-html.ts          # dry-run
//   bun run scripts/normalize-recovered-html.ts --write  # apply

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const dirs = [
  'src/content/update',
  'src/content/exclusion',
  'src/content/myth',
  'src/content/faq',
  'src/content/page',
];
const WRITE = process.argv.includes('--write');

function fix(body: string): string {
  const dedented = body
    .split('\n')
    .map((l) => (/^\s+</.test(l) ? l.replace(/^\s+/, '') : l))
    .join('\n');

  return (
    dedented
      .replace(
        /<iframe([^>]*?)src="(?:https?:)?\/\/(?:www\.)?youtube\.com\/embed\//gi,
        '<iframe$1src="https://www.youtube-nocookie.com/embed/',
      )
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  );
}

let changed = 0;
let scanned = 0;
const examples: string[] = [];

for (const d of dirs) {
  const dir = resolve(ROOT, d);
  let files: string[];
  try {
    files = readdirSync(dir).filter((n) => n.endsWith('.md'));
  } catch {
    continue;
  }
  for (const f of files) {
    scanned++;
    const path = resolve(dir, f);
    const raw = readFileSync(path, 'utf8');
    const m = raw.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
    if (!m) continue;
    const [, fm, body] = m;
    const newBody = fix(body);
    if (newBody === body) continue;
    changed++;
    if (examples.length < 8) examples.push(`${d}/${f}`);
    if (WRITE) writeFileSync(path, fm + newBody);
  }
}

console.log(`scanned=${scanned} changed=${changed}`);
for (const e of examples) console.log('  ·', e);
if (!WRITE) console.log('(dry-run; pass --write to apply.)');
