#!/usr/bin/env node
// Minimal post-build SEO sanity check. Runs against `dist/` after
// `astro build`. Fails the build if any of these break — these are
// the things we'd be embarrassed to ship a regression on.
//
// What it checks:
//   - sitemap-index.xml exists and parses as XML
//   - llms.txt and llms-full.txt exist and look populated
//   - robots.txt exists
//   - Home page has: exactly one <title>, a <link rel="canonical">,
//     og:image, og:title, og:type, and ≥3 JSON-LD blocks
//   - Every JSON-LD block parses as valid JSON
//   - At least one Update detail page has Article + Breadcrumb JSON-LD
//
// Deliberately NOT pulling in puppeteer / external crawlers / link
// checkers — overkill for a static archive of this size.

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const DIST = join(ROOT, 'dist');

const failures = [];
function fail(msg) {
  failures.push(msg);
  console.error('  ✗', msg);
}
function pass(msg) {
  console.log('  ✓', msg);
}

async function exists(p) {
  return existsSync(p);
}
async function size(p) {
  return (await stat(p)).size;
}

async function checkFeeds() {
  console.log('# Feeds');
  for (const [path, label] of [
    ['sitemap-index.xml', 'sitemap'],
    ['llms.txt', 'llms.txt'],
    ['llms-full.txt', 'llms-full.txt'],
    ['robots.txt', 'robots.txt'],
    ['rss.xml', 'rss.xml'],
  ]) {
    const p = join(DIST, path);
    if (!(await exists(p))) {
      fail(`${label} missing at ${p}`);
      continue;
    }
    const bytes = await size(p);
    if (bytes < 100) {
      fail(`${label} suspiciously small (${bytes} bytes)`);
      continue;
    }
    if (path === 'sitemap-index.xml') {
      const txt = await readFile(p, 'utf8');
      if (!/^<\?xml/.test(txt)) fail('sitemap-index.xml does not start with <?xml');
      else pass(`${label} (${bytes}B, valid XML head)`);
    } else {
      pass(`${label} (${bytes}B)`);
    }
  }
}

function extractJsonLd(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;
  return Array.from(html.matchAll(re), (m) => m[1].trim());
}

function singleMatch(html, re, label) {
  const matches = html.match(re);
  if (!matches) {
    fail(`${label}: missing`);
    return null;
  }
  if (matches.length > 1) {
    fail(`${label}: ${matches.length} matches (expected 1)`);
    return null;
  }
  return matches[0];
}

async function checkPage(relPath, requirements) {
  console.log(`# ${relPath}`);
  const p = join(DIST, relPath);
  if (!(await exists(p))) {
    fail(`page missing: ${p}`);
    return;
  }
  const html = await readFile(p, 'utf8');

  if (requirements.title) {
    const titles = html.match(/<title>[^<]*<\/title>/g) ?? [];
    if (titles.length !== 1) fail(`expected 1 <title>, got ${titles.length}`);
    else pass(`title: ${titles[0]}`);
  }

  if (requirements.canonical) {
    const m = singleMatch(html, /<link[^>]*rel=["']canonical["'][^>]*>/g, 'canonical');
    if (m) pass('canonical present');
  }

  if (requirements.og) {
    for (const tag of ['og:title', 'og:image', 'og:type']) {
      if (!new RegExp(`property=["']${tag}["']`).test(html)) fail(`og tag missing: ${tag}`);
      else pass(`${tag} present`);
    }
  }

  if (requirements.minLdBlocks) {
    const blocks = extractJsonLd(html);
    if (blocks.length < requirements.minLdBlocks) {
      fail(`expected ≥${requirements.minLdBlocks} JSON-LD blocks, got ${blocks.length}`);
    } else {
      pass(`${blocks.length} JSON-LD blocks`);
    }
    let parseFail = 0;
    const types = [];
    for (const raw of blocks) {
      try {
        types.push(JSON.parse(raw)['@type'] ?? '?');
      } catch (e) {
        parseFail++;
        fail(`JSON-LD parse error: ${e.message}`);
      }
    }
    if (parseFail === 0 && blocks.length) pass(`JSON-LD types: ${types.join(', ')}`);

    if (requirements.expectTypes) {
      for (const t of requirements.expectTypes) {
        if (!types.includes(t)) fail(`missing JSON-LD @type: ${t}`);
        else pass(`@type ${t} present`);
      }
    }
  }
}

async function findFirstUpdatePage() {
  const blog = join(DIST, 'blog');
  if (!(await exists(blog))) return null;
  for (const name of await readdir(blog)) {
    if (/^\d{4}-/.test(name)) {
      const p = join('blog', name, 'index.html');
      if (await exists(join(DIST, p))) return p;
    }
  }
  return null;
}

async function main() {
  if (!(await exists(DIST))) {
    console.error('dist/ missing — run `npm run build` first.');
    process.exit(1);
  }

  await checkFeeds();
  await checkPage('index.html', {
    title: true,
    canonical: true,
    og: true,
    minLdBlocks: 3,
    expectTypes: ['WebSite', 'Organization'],
  });
  await checkPage('myths/index.html', {
    title: true,
    canonical: true,
    minLdBlocks: 3,
    expectTypes: ['ItemList'],
  });
  await checkPage('faqs/index.html', {
    title: true,
    canonical: true,
    minLdBlocks: 3,
    expectTypes: ['FAQPage'],
  });

  const update = await findFirstUpdatePage();
  if (!update) fail('no Update detail page found under dist/blog/');
  else
    await checkPage(update, {
      title: true,
      canonical: true,
      og: true,
      minLdBlocks: 4,
      expectTypes: ['NewsArticle', 'BreadcrumbList'],
    });

  console.log('');
  if (failures.length) {
    console.error(`SEO check FAILED — ${failures.length} issue(s):`);
    for (const f of failures) console.error('  -', f);
    process.exit(1);
  }
  console.log('SEO check passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
