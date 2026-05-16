// llms-full.txt — full text of all on-site content for LLM crawlers.
// Now that migrated stubs no longer carry the "Migrated from the live
// site…" boilerplate (see scripts/scrub-boilerplate.ts), update and
// exclusion bodies are meaningful editorial summaries and worth indexing.
// Re-generated at build time from the content collections.

import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { byDateDesc, byOrder, notDraft } from '~/lib/entries';
import { formatDate } from '~/lib/format';

export async function GET(_: APIContext) {
  const pages = await getCollection('page');
  const myths = (await getCollection('myth')).filter(notDraft).sort(byOrder);
  const faqs = (await getCollection('faq')).filter(notDraft).sort(byOrder);
  const updates = (await getCollection('update')).filter(notDraft).sort(byDateDesc);
  const exclusions = (await getCollection('exclusion')).filter(notDraft).sort(byDateDesc);

  const out: string[] = [];
  out.push('# Rethink Aadhaar — full content');
  out.push('');

  for (const p of pages) {
    out.push(`## ${p.data.title}`);
    out.push('');
    out.push(p.body?.trim() ?? '');
    out.push('');
  }

  out.push('## Myths');
  out.push('');
  for (const m of myths) {
    out.push(`### Myth: ${m.data.myth}`);
    if (m.data.fact) out.push(`Fact: ${m.data.fact}`);
    out.push('');
    out.push(m.body?.trim() ?? '');
    out.push('');
  }

  out.push('## FAQs');
  out.push('');
  for (const f of faqs) {
    out.push(`### ${f.data.question}`);
    out.push('');
    out.push(f.body?.trim() ?? '');
    out.push('');
  }

  out.push('## Updates');
  out.push('');
  for (const u of updates) {
    out.push(`### ${formatDate(u.data.date, 'medium')} — ${u.data.title}`);
    if (u.data.excerpt) {
      out.push('');
      out.push(`> ${u.data.excerpt}`);
    }
    if (u.data.sourceUrl) {
      out.push('');
      out.push(`Original: ${u.data.sourceUrl}`);
    }
    const body = u.body?.trim();
    if (body) {
      out.push('');
      out.push(body);
    }
    out.push('');
  }

  out.push('## Exclusion stories');
  out.push('');
  for (const e of exclusions) {
    out.push(
      `### ${formatDate(e.data.date, 'medium')} — ${e.data.title}${e.data.location ? ` (${e.data.location})` : ''}`,
    );
    if (e.data.summary) {
      out.push('');
      out.push(`> ${e.data.summary}`);
    }
    if (e.data.sourceUrl) {
      out.push('');
      out.push(`Original: ${e.data.sourceUrl}`);
    }
    const body = e.body?.trim();
    if (body) {
      out.push('');
      out.push(body);
    }
    out.push('');
  }

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
