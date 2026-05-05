import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { byDateDesc, entryHref, notDraft } from '~/lib/entries';

export async function GET(context: APIContext) {
  const posts = (await getCollection('update')).filter(notDraft).sort(byDateDesc);

  return rss({
    title: 'Rethink Aadhaar — Updates',
    description: 'Press releases, statements and analysis from the Rethink Aadhaar campaign.',
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.excerpt ?? '',
      link: entryHref('update', p),
    })),
    customData: '<language>en-in</language>',
  });
}
