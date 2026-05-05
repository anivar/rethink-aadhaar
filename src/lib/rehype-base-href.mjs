// Rehype plugin: rewrite root-relative <a href="/foo"> and <img src="/bar">
// inside MDX/Markdown so they pick up Astro's `base` prefix at build time.
//
// Astro auto-prefixes hrefs/srcs in templates that go through Vite, but raw
// Markdown links don't. This plugin walks the rendered HAST and prepends
// import.meta.env.BASE_URL (passed in at config time) to any root path.

import { visit } from 'unist-util-visit';

export default function rehypeBaseHref({ base = '/' } = {}) {
  const trimmed = base.replace(/\/$/, '');
  return (tree) => {
    visit(tree, 'element', (node) => {
      const attrs = ['href', 'src'];
      for (const a of attrs) {
        const v = node.properties?.[a];
        if (typeof v !== 'string') continue;
        // Only root paths, not protocol-relative or absolute URLs or anchors.
        if (!v.startsWith('/') || v.startsWith('//')) continue;
        if (trimmed && !v.startsWith(trimmed + '/') && v !== trimmed) {
          node.properties[a] = `${trimmed}${v}`;
        }
      }
    });
  };
}
