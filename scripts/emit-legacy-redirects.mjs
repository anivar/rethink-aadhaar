#!/usr/bin/env node
// Emits HTML stubs at legacy Squarespace URLs that meta-refresh + canonical to
// the current Astro routes. GitHub Pages can't issue real HTTP 30x redirects,
// so this is the standard fallback. Run AFTER `astro build` against `dist/`.
//
// Reads sourceUrl from each update/exclusion front-matter, maps the legacy
// `/blog/YYYY/M/D/slug` (or `/testimonials/...`) path to the new entry URL,
// then writes a tiny HTML file at `dist<old_path>/index.html`. Honours
// BASE_PATH so previews under `/rethink/` keep working.

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const DIST = join(ROOT, 'dist');
const SITE = (process.env.SITE_URL ?? 'https://rethinkaadhaar.in').replace(/\/$/, '');
const BASE = (process.env.BASE_PATH ?? '/').replace(/\/?$/, '/');

const COLLECTIONS = [
  { dir: 'src/content/update',    newPrefix: 'blog' },
  { dir: 'src/content/exclusion', newPrefix: 'testimonials' },
];

function parseFrontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    fm[kv[1]] = v;
  }
  return fm;
}

function legacyPathFromSourceUrl(sourceUrl) {
  try {
    const u = new URL(sourceUrl);
    return u.pathname.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function newPathForEntry(filename, newPrefix) {
  const slug = filename.replace(/\.mdx?$/, '');
  return `${BASE}${newPrefix}/${slug}/`;
}

function stubHtml(targetPath, title) {
  const targetAbs = `${SITE}${targetPath}`;
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<title>Redirecting — ${escapeHtml(title)}</title>
<link rel="canonical" href="${targetAbs}">
<meta name="robots" content="noindex,follow">
<meta http-equiv="refresh" content="0; url=${targetAbs}">
<script>location.replace(${JSON.stringify(targetAbs)});</script>
</head>
<body>
<p>This page has moved. <a href="${targetAbs}">Continue to ${escapeHtml(title)}</a>.</p>
</body>
</html>
`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function listMd(dir) {
  const abs = join(ROOT, dir);
  const out = [];
  for (const name of await readdir(abs)) {
    if (!/\.mdx?$/.test(name)) continue;
    out.push({ name, path: join(abs, name) });
  }
  return out;
}

async function main() {
  if (!existsSync(DIST)) {
    console.error(`[legacy-redirects] dist/ not found at ${DIST}. Run \`astro build\` first.`);
    process.exit(1);
  }

  let written = 0;
  let skipped = 0;
  let missing = 0;
  let collisions = 0;

  for (const { dir, newPrefix } of COLLECTIONS) {
    const files = await listMd(dir);
    for (const { name, path } of files) {
      const src = await readFile(path, 'utf8');
      const fm = parseFrontMatter(src);
      if (!fm.sourceUrl) { missing++; continue; }

      const oldPath = legacyPathFromSourceUrl(fm.sourceUrl);
      if (!oldPath) { missing++; continue; }

      const newPath = newPathForEntry(name, newPrefix);
      const stubDir = join(DIST, oldPath.replace(/^\//, ''));
      const stubFile = join(stubDir, 'index.html');

      if (existsSync(stubFile)) {
        // Don't clobber a real built page (would be a routing collision).
        collisions++;
        continue;
      }

      await mkdir(stubDir, { recursive: true });
      await writeFile(stubFile, stubHtml(newPath, fm.title ?? 'Rethink Aadhaar'));
      written++;
    }
  }

  console.log(`[legacy-redirects] wrote=${written} skipped=${skipped} no-sourceUrl=${missing} collisions=${collisions}`);
}

main().catch((err) => {
  console.error('[legacy-redirects] failed:', err);
  process.exit(1);
});
