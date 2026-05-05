// llms-full.txt — full text of all on-site content (myths, FAQs, statements,
// page bodies). Excludes migrated blog/exclusion stubs which only carry
// excerpts and links to the original. Re-generated at build time.

import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { byOrder } from '~/lib/entries';

export async function GET(_: APIContext) {
  const myths = (await getCollection('myth')).sort(byOrder);
  const faqs  = (await getCollection('faq')).sort(byOrder);
  const pages = await getCollection('page');

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

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
