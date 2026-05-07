import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeBaseHref from './src/lib/rehype-base-href.mjs';

// Site URL + base path are overridden in CI for GH Pages (see .github/workflows/deploy.yml).
const SITE = process.env.SITE_URL ?? 'https://rethinkaadhaar.in';
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  trailingSlash: 'ignore',
  markdown: {
    rehypePlugins: [[rehypeBaseHref, { base: BASE }]],
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
