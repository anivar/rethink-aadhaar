#!/usr/bin/env node
// Strip the "Migrated from the live site…" boilerplate paragraph from
// content bodies. Idempotent — re-runs are no-ops.
//
// The redundancy: every detail page already renders a separate
// "Read the original at rethinkaadhaar.in ↗" CTA driven by the
// `sourceUrl` front-matter field. The in-body line duplicates it and
// breaks the prose. Front-matter `sourceUrl` is preserved.
//
// Usage:  node scripts/scrub-boilerplate.mjs            (writes)
//         node scripts/scrub-boilerplate.mjs --dry      (reports only)

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'src', 'content');
const dry = process.argv.includes('--dry');

// Walk all .md files under src/content (any depth).
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (s.isFile() && p.endsWith('.md')) out.push(p);
  }
  return out;
}

// Match the trailing "> Migrated from the live site. The full original post
// is at [URL](URL)." block, with any leading blank lines, anywhere in the body.
// Captures both the blockquote form and a few defensive variants seen in the
// migration output.
const PATTERNS = [
  /\n*>\s*Migrated from the live site\.[^\n]*(?:\n>?\s*[^\n]*)*\s*$/,
  /\n*Migrated from the live site\.[^\n]*$/,
];

let changed = 0;
let unchanged = 0;
const files = walk(CONTENT);

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  for (const re of PATTERNS) after = after.replace(re, '');
  // Collapse 3+ trailing newlines to a single trailing newline.
  after = after.replace(/\n{3,}$/, '\n').replace(/\s+$/, '\n');
  if (after !== before) {
    changed++;
    if (!dry) writeFileSync(file, after);
  } else {
    unchanged++;
  }
}

console.log(
  `${dry ? '[dry-run] would update' : 'Updated'} ${changed} files; ${unchanged} already clean (of ${files.length} total).`,
);
