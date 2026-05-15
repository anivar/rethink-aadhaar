// Rehype plugin: upgrade WXR-imported `<blockquote>` tweet embeds into
// proper `class="twitter-tweet"` blocks so widgets.js can enhance them,
// and strip duplicated `<script src="…platform.twitter.com/widgets.js">`
// tags (we load that script exactly once, lazily, from BaseLayout).
//
// Squarespace's official tweet embed pattern was:
//
//   <blockquote><p ...>tweet text</p>— Author <a href="https://twitter.com/.../status/N">date</a></blockquote>
//   <script async src="//platform.twitter.com/widgets.js"></script>
//
// The `<blockquote>` lost its `class="twitter-tweet"` attribute somewhere
// in the export, so widgets.js (when it does load) silently skips it. This
// plugin restores the class and DNT flag on any blockquote that contains a
// link to a tweet status URL.
//
// Removing the script tags here means we don't ship N copies of the same
// script per page; BaseLayout injects one IntersectionObserver-gated copy
// that fires only when a `.twitter-tweet` enters the viewport.

import { visit } from 'unist-util-visit';

const TWEET_HREF = /(?:^|\/\/)(?:mobile\.)?(?:www\.)?(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/\d+/;

function isTweetLink(node) {
  if (node?.tagName !== 'a') return false;
  const href = node.properties?.href;
  return typeof href === 'string' && TWEET_HREF.test(href);
}

function blockquoteContainsTweetLink(node) {
  let found = false;
  visit(node, 'element', (el) => {
    if (isTweetLink(el)) {
      found = true;
      return false; // halt walk
    }
  });
  return found;
}

function isWidgetsScript(node) {
  if (node?.tagName !== 'script') return false;
  const src = node.properties?.src;
  return typeof src === 'string' && /platform\.twitter\.com\/widgets\.js/.test(src);
}

export default function rehypeTwitterUpgrade() {
  return (tree) => {
    // 1. Upgrade blockquote → twitter-tweet
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'blockquote') return;
      if (!blockquoteContainsTweetLink(node)) return;
      const cls = node.properties?.className;
      const list = Array.isArray(cls) ? cls : cls ? [String(cls)] : [];
      if (!list.includes('twitter-tweet')) list.push('twitter-tweet');
      node.properties = { ...(node.properties || {}), className: list, dataDnt: 'true' };
    });

    // 2. Strip duplicated widget scripts (handled centrally in BaseLayout).
    //    Markdown raw HTML lands as either `element` script nodes (when
    //    rehype-raw runs) or `raw` text nodes (default Astro pipeline) —
    //    handle both.
    const RAW_WIDGETS =
      /<script[^>]*\bsrc=["'](?:https?:)?\/\/platform\.twitter\.com\/widgets\.js[^"']*["'][^>]*><\/script>/gi;
    function strip(arr) {
      if (!Array.isArray(arr)) return arr;
      return arr
        .filter((c) => !isWidgetsScript(c))
        .map((c) => {
          if (c.type === 'raw' && typeof c.value === 'string') {
            const next = c.value.replace(RAW_WIDGETS, '').trim();
            if (!next) return null;
            return { ...c, value: next };
          }
          return c;
        })
        .filter(Boolean);
    }
    visit(tree, (node) => {
      if (Array.isArray(node.children)) node.children = strip(node.children);
    });
    if (Array.isArray(tree.children)) tree.children = strip(tree.children);
  };
}
