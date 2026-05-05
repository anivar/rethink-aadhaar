// llms.txt — index of pages and content for LLM crawlers (https://llmstxt.org/).
// Auto-generated from collections at build time. Adding a new entry to any
// collection updates this file automatically — no manual maintenance.

import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { byDateDesc, byOrder, entryHref, notDraft } from '~/lib/entries';
import { formatDate } from '~/lib/format';
import { link } from '~/lib/link';

function abs(site: URL, path: string): string {
  return new URL(link(path), site).toString();
}

export async function GET(context: APIContext) {
  const site = context.site!;
  const updates    = (await getCollection('update')).filter(notDraft).sort(byDateDesc);
  const exclusions = (await getCollection('exclusion')).sort(byDateDesc);
  const myths      = (await getCollection('myth')).sort(byOrder);
  const faqs       = (await getCollection('faq')).sort(byOrder);
  const press      = (await getCollection('press')).sort(byDateDesc);
  const resources  = await getCollection('resource');

  const lines: string[] = [];
  lines.push('# Rethink Aadhaar');
  lines.push('');
  lines.push('> Rethink Aadhaar is a non-partisan campaign concerned about India\'s Unique Identification (UID) or Aadhaar project — its design, its expansion across welfare and finance, and the documented harms (welfare exclusion, surveillance risk, biometric failures).');
  lines.push('');
  lines.push('All content under CC BY 4.0. Press coverage entries link to third-party publications.');
  lines.push('');

  lines.push('## Core pages');
  lines.push(`- [Home](${abs(site, '/')}): The campaign\'s position and latest updates.`);
  lines.push(`- [About](${abs(site, '/about')}): Who runs the campaign and how it began.`);
  lines.push(`- [Take action](${abs(site, '/take-action')}): Concrete ways to push back against coercive Aadhaar mandates.`);
  lines.push(`- [Campaign 2025 — Beware of Aadhaar](${abs(site, '/campaign2025')}): Collective statement endorsed by 50+ Indian organisations, released on Human Rights Day 2025.`);
  lines.push('');

  lines.push('## Myths about Aadhaar');
  for (const m of myths) {
    lines.push(`- ${m.data.myth}${m.data.fact ? ` — Fact: ${m.data.fact}` : ''}`);
  }
  lines.push('');

  lines.push('## FAQs');
  for (const f of faqs) {
    lines.push(`- **${f.data.question}**${f.data.short ? ` — ${f.data.short}` : ''}`);
  }
  lines.push('');

  lines.push(`## Updates (${updates.length})`);
  lines.push(`Latest 30. Full archive: ${abs(site, '/blog')}`);
  for (const u of updates.slice(0, 30)) {
    lines.push(`- [${formatDate(u.data.date, 'medium')} — ${u.data.title}](${new URL(entryHref('update', u), site).toString()})`);
  }
  lines.push('');

  lines.push(`## Exclusion stories (${exclusions.length})`);
  lines.push(`Latest 30. Full archive: ${abs(site, '/testimonials')}`);
  for (const e of exclusions.slice(0, 30)) {
    lines.push(`- [${formatDate(e.data.date, 'medium')} — ${e.data.title}](${new URL(entryHref('exclusion', e), site).toString()})${e.data.location ? ` _(${e.data.location})_` : ''}`);
  }
  lines.push('');

  lines.push(`## Press coverage (${press.length})`);
  lines.push(`Latest 30. Full archive: ${abs(site, '/press-coverage')}`);
  for (const p of press.slice(0, 30)) {
    lines.push(`- [${formatDate(p.data.date, 'medium')} — ${p.data.title} (${p.data.publication})](${p.data.href})`);
  }
  lines.push('');

  lines.push('## Resources');
  for (const r of resources) {
    lines.push(`- **${r.data.section}**: [${r.data.title}](${r.data.href})${r.data.description ? ` — ${r.data.description}` : ''}`);
  }
  lines.push('');

  lines.push('## Feeds');
  lines.push(`- RSS: ${abs(site, '/rss.xml')}`);
  lines.push(`- Sitemap: ${abs(site, '/sitemap-index.xml')}`);
  lines.push(`- Full content for LLMs: ${abs(site, '/llms-full.txt')}`);

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
