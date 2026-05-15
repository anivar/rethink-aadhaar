#!/usr/bin/env bun
// Audit local page-collection bodies vs WXR pages so we can spot missing
// content from the original Squarespace site.
//
// Usage:
//   bun run scripts/audit-pages.ts <export.xml>

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const xmlPath = process.argv[2];
if (!xmlPath) {
  console.error('Usage: bun run scripts/audit-pages.ts <export.xml>');
  process.exit(1);
}

const xml = readFileSync(xmlPath, 'utf8');

function tag(itemXml: string, name: string): string {
  const re = new RegExp(`<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${name}>`);
  const m = itemXml.match(re);
  return (m?.[1] ?? m?.[2] ?? '').trim();
}

const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
const pages = items
  .map((raw) => ({
    title: tag(raw, 'title'),
    link: tag(raw, 'link'),
    name: tag(raw, 'wp:post_name'),
    status: tag(raw, 'wp:status'),
    type: tag(raw, 'wp:post_type'),
    content: tag(raw, 'content:encoded'),
  }))
  .filter((p) => p.type === 'page');

console.log(`WXR pages (any status): ${pages.length}\n`);

const localDir = resolve(ROOT, 'src/content/page');
const localFiles = readdirSync(localDir).filter((f) => f.endsWith('.md'));
const localBySlug = new Map<string, { file: string; len: number }>();
for (const f of localFiles) {
  const body = readFileSync(resolve(localDir, f), 'utf8').replace(/^---[\s\S]*?---\n/, '');
  localBySlug.set(f.replace(/\.md$/, ''), { file: f, len: body.trim().length });
}

console.log('## WXR pages → local match\n');
for (const p of pages.sort((a, b) => a.link.localeCompare(b.link))) {
  const slugCandidates = [
    p.name,
    p.link.replace(/\/$/, '').split('/').pop() ?? '',
    p.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  ].filter(Boolean);
  let match = '';
  for (const s of slugCandidates) {
    if (localBySlug.has(s)) {
      match = s;
      break;
    }
  }
  const upstreamLen = p.content.trim().length;
  const localLen = match ? localBySlug.get(match)!.len : 0;
  const ratio = upstreamLen ? localLen / upstreamLen : 0;
  const flag = !match ? '✗ MISSING' : ratio < 0.5 ? '⚠ shorter' : ratio > 2 ? '+ longer' : '✓';
  console.log(
    `${flag.padEnd(11)} ${p.status.padEnd(8)} upstream=${String(upstreamLen).padStart(6)} local=${String(localLen).padStart(6)} ratio=${ratio.toFixed(2)}  ${p.link}  → ${match || '(no local file)'}`,
  );
}

console.log('\n## Local files with no WXR match\n');
const matchedSlugs = new Set<string>();
for (const p of pages) {
  for (const s of [p.name, p.link.replace(/\/$/, '').split('/').pop() ?? '']) {
    if (s && localBySlug.has(s)) matchedSlugs.add(s);
  }
}
for (const [slug, e] of localBySlug) {
  if (!matchedSlugs.has(slug)) console.log(`  · ${e.file} (len=${e.len})`);
}
