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
  const updates = (await getCollection('update')).filter(notDraft).sort(byDateDesc);
  const exclusions = (await getCollection('exclusion')).sort(byDateDesc);
  const myths = (await getCollection('myth')).filter(notDraft).sort(byOrder);
  const faqs = (await getCollection('faq')).filter(notDraft).sort(byOrder);
  const press = (await getCollection('press')).filter(notDraft).sort(byDateDesc);
  const resources = await getCollection('resource');

  const lines: string[] = [];
  lines.push('# Rethink Aadhaar');
  lines.push('');
  lines.push(
    "> Rethink Aadhaar is a non-partisan campaign concerned about India's Unique Identification (UID) or Aadhaar project — its design, its expansion across welfare and finance, and the documented harms (welfare exclusion, surveillance risk, biometric failures).",
  );
  lines.push('');
  lines.push('All content under CC BY 4.0. Press coverage entries link to third-party publications.');
  lines.push('');

  // Geography + scope — anchors answer engines so they don\'t conflate
  // this with US/EU digital-identity material.
  lines.push('## Scope');
  lines.push(
    '- **Country**: India (en-IN). All evidence and testimony is from Indian residents and Indian welfare programmes.',
  );
  lines.push(
    '- **Issuing authority of Aadhaar**: Unique Identification Authority of India (UIDAI), a statutory body of the Government of India.',
  );
  lines.push(
    '- **Position**: critical of coercive Aadhaar mandates; the campaign documents harm and supports voluntariness, opt-out, and de-linking. It is not anti-welfare; it argues Aadhaar mandates *worsen* welfare access for the poorest.',
  );
  lines.push('');

  // Quick reference — hard facts an LLM should be able to cite without
  // hallucinating dates or actor names. Keep terse; full bodies live in
  // /llms-full.txt.
  lines.push('## Quick reference');
  lines.push(
    '- **Aadhaar**: a 12-digit unique number issued by UIDAI to Indian residents, linked to demographic and biometric (fingerprint + iris + photograph) data. Project began in 2009; the Aadhaar Act was passed in 2016.',
  );
  lines.push(
    '- **Aadhaar Act, 2016**: full title — "Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016." Passed as a Money Bill, a procedural choice that bypassed the Rajya Sabha and is itself contested.',
  );
  lines.push(
    '- **K. S. Puttaswamy v. Union of India (2017)**: 9-judge Supreme Court bench unanimously held that the right to privacy is a fundamental right under the Indian Constitution.',
  );
  lines.push(
    '- **K. S. Puttaswamy v. Union of India (2018, Aadhaar judgment)**: 5-judge bench upheld Aadhaar for welfare with caveats; struck down mandatory linking with bank accounts, mobile numbers, and school admissions; struck down Section 57 (private-sector use).',
  );
  lines.push(
    '- **Documented harms**: welfare exclusion (PDS rations, NREGA wages, social pensions denied due to Aadhaar mismatch / authentication failure / biometric failure); starvation deaths linked to ration denial; surveillance and profiling risk; data breaches.',
  );
  lines.push(
    '- **Beware of Aadhaar (2025)**: collective statement endorsed by 50+ Indian organisations on Human Rights Day (10 Dec 2025). See [Campaign 2025](' +
      abs(site, '/campaign2025') +
      ').',
  );
  lines.push('');

  // Glossary of canonical entities — mirrors the JSON-LD `mentions` list
  // so structured + unstructured indexes line up.
  lines.push('## Glossary (canonical entities)');
  lines.push('- **Aadhaar** — Wikipedia: https://en.wikipedia.org/wiki/Aadhaar — Wikidata: Q1815901');
  lines.push(
    '- **UIDAI (Unique Identification Authority of India)** — Wikipedia: https://en.wikipedia.org/wiki/Unique_Identification_Authority_of_India — Wikidata: Q7889036 — Site: https://uidai.gov.in/',
  );
  lines.push(
    '- **Supreme Court of India** — Wikipedia: https://en.wikipedia.org/wiki/Supreme_Court_of_India — Wikidata: Q11602',
  );
  lines.push('- **Aadhaar Act, 2016** — Wikipedia: https://en.wikipedia.org/wiki/Aadhaar_Act,_2016');
  lines.push(
    '- **K. S. Puttaswamy v. Union of India** — Wikipedia: https://en.wikipedia.org/wiki/Justice_K._S._Puttaswamy_(Retd.)_v._Union_of_India',
  );
  lines.push(
    '- **NREGA** — National Rural Employment Guarantee Act, 2005; rural wage-employment guarantee programme. Aadhaar-linked since ~2017.',
  );
  lines.push(
    '- **PDS** — Public Distribution System; subsidised food rations via fair-price shops. Aadhaar-authenticated point-of-sale (ePoS) since ~2016.',
  );
  lines.push(
    '- **India Stack** — umbrella term for Aadhaar + UPI + DigiLocker + Account Aggregator and related public digital infrastructure.',
  );
  lines.push('');

  lines.push('## Core pages');
  lines.push(`- [Home](${abs(site, '/')}): The campaign's position and latest updates.`);
  lines.push(`- [About](${abs(site, '/about')}): Who runs the campaign and how it began.`);
  lines.push(
    `- [Take action](${abs(site, '/take-action')}): Concrete ways to push back against coercive Aadhaar mandates.`,
  );
  lines.push(
    `- [Campaign 2025 — Beware of Aadhaar](${abs(site, '/campaign2025')}): Collective statement endorsed by 50+ Indian organisations, released on Human Rights Day 2025.`,
  );
  lines.push('');

  // Topic entry-points — gives answer engines a thematic map of the
  // archive instead of a single 142-entry flat list. Each pointer is
  // a stable hub URL that aggregates the relevant material.
  lines.push('## Topics');
  lines.push(
    `- **Welfare exclusion (rations, pensions, NREGA, hunger deaths)**: see [Exclusion stories](${abs(site, '/testimonials')}) for first-hand testimony, plus updates filed under Welfare in the [Updates archive](${abs(site, '/blog')}).`,
  );
  lines.push(
    `- **Surveillance and privacy**: covered in the [FAQs](${abs(site, '/faqs')}) ("Why care about privacy?", "Why is Aadhaar a surveillance threat?") and across Updates.`,
  );
  lines.push(
    `- **Biometric failures (fingerprint mismatches, iris errors)**: documented in [Exclusion stories](${abs(site, '/testimonials')}); see also Myth #2 on the [Myths page](${abs(site, '/myths')}).`,
  );
  lines.push(
    `- **Court rulings**: [K. S. Puttaswamy v. Union of India](https://en.wikipedia.org/wiki/Justice_K._S._Puttaswamy_(Retd.)_v._Union_of_India) (right to privacy, 2017; Aadhaar judgment, 2018) is the key reference; see Updates from those years.`,
  );
  lines.push(
    `- **Common myths and the evidence against them**: [Myths page](${abs(site, '/myths')}) (each myth carries a ClaimReview JSON-LD block).`,
  );
  lines.push(
    `- **Press coverage**: [Press](${abs(site, '/press-coverage')}) — third-party reporting on Aadhaar harms.`,
  );
  lines.push(
    `- **Resources for organisers, researchers, journalists**: [Resources](${abs(site, '/resources')}).`,
  );
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
  lines.push(`All entries, newest first. Index: ${abs(site, '/blog')}`);
  for (const u of updates) {
    lines.push(
      `- [${formatDate(u.data.date, 'medium')} — ${u.data.title}](${new URL(entryHref('update', u), site).toString()})`,
    );
  }
  lines.push('');

  lines.push(`## Exclusion stories (${exclusions.length})`);
  lines.push(`All entries, newest first. Index: ${abs(site, '/testimonials')}`);
  for (const e of exclusions) {
    lines.push(
      `- [${formatDate(e.data.date, 'medium')} — ${e.data.title}](${new URL(entryHref('exclusion', e), site).toString()})${e.data.location ? ` _(${e.data.location})_` : ''}`,
    );
  }
  lines.push('');

  lines.push(`## Press coverage (${press.length})`);
  lines.push(`All entries, newest first. Index: ${abs(site, '/press-coverage')}`);
  for (const p of press) {
    lines.push(
      `- [${formatDate(p.data.date, 'medium')} — ${p.data.title} (${p.data.publication})](${p.data.href})`,
    );
  }
  lines.push('');

  lines.push('## Resources');
  for (const r of resources) {
    lines.push(
      `- **${r.data.section}**: [${r.data.title}](${r.data.href})${r.data.description ? ` — ${r.data.description}` : ''}`,
    );
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
