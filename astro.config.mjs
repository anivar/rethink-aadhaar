import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeBaseHref from './src/lib/rehype-base-href.mjs';
import remarkEmbeds from './src/lib/remark-embeds.mjs';
import rehypeTwitterUpgrade from './src/lib/rehype-twitter-upgrade.mjs';
import rehypeSanitizeBody from './src/lib/rehype-sanitize-body.mjs';
import rehypeInlineImages from './src/lib/rehype-inline-images.mjs';

// Site URL + base path are overridden in CI for GH Pages (see .github/workflows/deploy.yml).
const SITE = process.env.SITE_URL ?? 'https://rethinkaadhaar.in';
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  trailingSlash: 'ignore',
  markdown: {
    remarkPlugins: [remarkEmbeds],
    // Order matters: twitter-upgrade restores tweet blockquotes →
    // sanitize strips the executable surface (script/on*/js: urls) →
    // base-href makes /media srcs base-aware → inline-images then wraps
    // those (now base-prefixed) <img>s in WebP <picture> with dimensions.
    rehypePlugins: [
      rehypeTwitterUpgrade,
      rehypeSanitizeBody,
      [rehypeBaseHref, { base: BASE }],
      [rehypeInlineImages, { base: BASE }],
    ],
  },
  integrations: [
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      // Internal-only routes (design reference, etc.) shouldn't surface in
      // search results.
      filter: (page) => !/\/styleguide\/?$/.test(page),
      // Higher priority for the home and the actively-updated indexes.
      serialize(item) {
        const u = new URL(item.url);
        const p = u.pathname.replace(/\/$/, '');
        if (p === '') item.priority = 1.0;
        else if (
          [
            '/blog',
            '/testimonials',
            '/press-coverage',
            '/myths',
            '/faqs',
            '/resources',
            '/take-action',
            '/campaign2025',
          ].includes(p)
        )
          item.priority = 0.9;
        return item;
      },
    }),
  ],
  build: { format: 'directory' },
  vite: {
    plugins: [tailwindcss()],
    ssr: { noExternal: ['@fontsource/*'] },
  },
});
