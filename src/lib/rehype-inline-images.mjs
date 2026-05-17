// Rehype plugin: give inline body images the same treatment hero images
// already get via Picture.astro — a WebP `<source>`, intrinsic
// width/height (no layout shift), and lazy decoding.
//
// Markdown `![alt](/media/x.png)` renders as a bare `<img>`: no WebP,
// no dimensions, no loading hint. scripts/optimize-images.ts has already
// produced a `.webp` sibling for every JPG/PNG under public/media at
// build time, so here we just wrap the <img> in a <picture> that points
// at it and stamp on the real dimensions read from the source file.
//
// Runs AFTER rehype-base-href, so `src` is already base-prefixed; we
// strip the base back off only to locate the file on disk. Only
// /media/*.{jpg,jpeg,png} element images are touched — embed iframes,
// remote images and raw-HTML <img> strings are left alone. AVIF is not
// referenced: optimize-images.ts only emits AVIF for the hero LCP list.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { visit } from 'unist-util-visit';

export default function rehypeInlineImages({ base = '/' } = {}) {
  const trimmed = base.replace(/\/$/, '');
  return async (tree) => {
    const targets = [];
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'img' || !parent || typeof index !== 'number') return;
      const src = node.properties?.src;
      if (typeof src !== 'string') return;
      let rel = src;
      if (trimmed && rel.startsWith(`${trimmed}/`)) rel = rel.slice(trimmed.length);
      if (!/^\/media\/.+\.(jpe?g|png)$/i.test(rel)) return;
      const file = join('public', rel);
      if (!existsSync(file)) return;
      targets.push({
        node,
        index,
        parent,
        file,
        webpSrc: src.replace(/\.(jpe?g|png)$/i, '.webp'),
        webpFile: join('public', rel.replace(/\.(jpe?g|png)$/i, '.webp')),
      });
    });
    await Promise.all(
      targets.map(async (t) => {
        let width;
        let height;
        try {
          const meta = await sharp(t.file).metadata();
          width = meta.width;
          height = meta.height;
        } catch {
          // Unreadable source: still add lazy/decoding, skip dimensions.
        }
        const img = t.node;
        img.properties = { ...img.properties, loading: 'lazy', decoding: 'async' };
        if (width && height) {
          img.properties.width = width;
          img.properties.height = height;
        }
        const children = [];
        if (existsSync(t.webpFile)) {
          children.push({
            type: 'element',
            tagName: 'source',
            properties: { srcSet: t.webpSrc, type: 'image/webp' },
            children: [],
          });
        }
        children.push(img);
        t.parent.children[t.index] = {
          type: 'element',
          tagName: 'picture',
          properties: {},
          children,
        };
      }),
    );
  };
}
