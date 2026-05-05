import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Site URL is overridden in CI for the GH Pages build (see .github/workflows/deploy.yml).
const SITE = process.env.SITE_URL ?? 'https://rethinkaadhaar.in';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      // Higher priority for the home and the actively-updated indexes.
      serialize(item) {
        const u = new URL(item.url);
        const p = u.pathname.replace(/\/$/, '');
        if (p === '') item.priority = 1.0;
        else if (['/blog', '/testimonials', '/press-coverage', '/myths', '/faqs', '/resources', '/take-action', '/campaign2025'].includes(p)) item.priority = 0.9;
        return item;
      },
    }),
  ],
  build: { format: 'directory' },
  vite: { ssr: { noExternal: ['@fontsource/*'] } },
});
