#!/usr/bin/env bun
// Strip the "Migrated from the live site…" boilerplate paragraph from
// content bodies. Idempotent — re-runs are no-ops.
//
// The redundancy: every detail page already renders a separate
// "Read the original at rethinkaadhaar.in ↗" CTA driven by the
// `sourceUrl` front-matter field. The in-body line duplicates it and
// breaks the prose. Front-matter `sourceUrl` is preserved.
//
// Usage:  bun scripts/scrub-boilerplate.mjs            (writes)
//         bun scripts/scrub-boilerplate.mjs --dry      (reports only)

import { Glob } from 'bun';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const CONTENT = join(ROOT, 'src', 'content');
const dry = process.argv.includes('--dry');

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
let total = 0;

for await (const rel of new Glob('**/*.md').scan({ cwd: CONTENT })) {
  total++;
  const path = join(CONTENT, rel);
  const before = await Bun.file(path).text();
  let after = before;
  for (const re of PATTERNS) after = after.replace(re, '');
  // Collapse 3+ trailing newlines to a single trailing newline.
  after = after.replace(/\n{3,}$/, '\n').replace(/\s+$/, '\n');
  if (after !== before) {
    changed++;
    if (!dry) await Bun.write(path, after);
  } else {
    unchanged++;
  }
}

console.log(
  `${dry ? '[dry-run] would update' : 'Updated'} ${changed} files; ${unchanged} already clean (of ${total} total).`,
);
