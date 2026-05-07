#!/usr/bin/env bun
// Scaffold a new content entry: `bun run new -- <category> "Title here"`
//
//   bun run new -- update    "Statement on the latest exclusion incident"
//   bun run new -- exclusion "Aadhaar-linked pension denial in Khunti"
//   bun run new -- press     "Outlet — headline" --publication "The Wire" --href https://...
//
// Always writes the entry as a draft (so it shows up in `bun run sync` reports
// and is excluded from RSS/index until you flip `draft: false`).

import { resolve, join } from 'node:path';
import { CATEGORIES, ROOT, kebab, todayISO } from './_categories.mjs';

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      args.flags[a.slice(2)] = argv[++i];
    } else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const [categoryKey, ...titleWords] = args._;
const title = titleWords.join(' ').trim();
const cfg = CATEGORIES[categoryKey];

if (!cfg || !title) {
  console.error('Usage: bun run new -- <update|exclusion|press> "Title here" [--flag value...]');
  console.error('Categories:', Object.keys(CATEGORIES).join(', '));
  process.exit(1);
}

const date = args.flags.date ?? todayISO();
const slug = `${date}-${kebab(title)}`;
const dir = resolve(ROOT, cfg.collectionDir);
const file = join(dir, `${slug}.md`);
if (await Bun.file(file).exists()) {
  console.error(`✗ Already exists: ${file}`);
  process.exit(1);
}

const fm = [];
fm.push('---');
fm.push(`title: ${JSON.stringify(title)}`);
fm.push(`date: ${date}`);

if (categoryKey === 'update') {
  if (args.flags.excerpt) fm.push(`excerpt: ${JSON.stringify(args.flags.excerpt)}`);
  if (args.flags.hero) fm.push(`hero: ${JSON.stringify(args.flags.hero)}`);
  if (args.flags.sourceUrl) fm.push(`sourceUrl: ${JSON.stringify(args.flags.sourceUrl)}`);
  fm.push('draft: true');
}
if (categoryKey === 'exclusion') {
  if (args.flags.location) fm.push(`location: ${JSON.stringify(args.flags.location)}`);
  if (args.flags.summary) fm.push(`summary: ${JSON.stringify(args.flags.summary)}`);
  if (args.flags.sourceUrl) fm.push(`sourceUrl: ${JSON.stringify(args.flags.sourceUrl)}`);
}
if (categoryKey === 'press') {
  if (!args.flags.publication || !args.flags.href) {
    console.error('press needs --publication "Outlet name" --href https://...');
    process.exit(1);
  }
  fm.push(`publication: ${JSON.stringify(args.flags.publication)}`);
  fm.push(`href: ${JSON.stringify(args.flags.href)}`);
}
fm.push('---');
fm.push('');
fm.push('<!-- Write the body here in Markdown. -->');
fm.push('');

// Bun.write creates parent directories implicitly.
await Bun.write(file, fm.join('\n'));
console.log(`✓ Created ${file.replace(`${ROOT}/`, '')}`);
console.log('  Edit the body, then flip `draft: true` → `draft: false` (updates only).');
