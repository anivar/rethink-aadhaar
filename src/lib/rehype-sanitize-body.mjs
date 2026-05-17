// Rehype plugin: strip the executable surface from rendered body HTML
// without touching structural markup or the embed pipeline.
//
// Why this exists: Astro's default markdown pipeline passes raw HTML
// (including a pasted `<script>`) straight through. Body content is
// authored via the CMS by trusted collaborators, but snippets are often
// copy-pasted from third-party "embed" boxes that smuggle a tracker or
// widget `<script>`. With auto-merge there is no human review gate, so
// anything pasted goes live. This neutralises the dangerous bits:
//
//   - `<script>` tags  — both real `element` nodes (if a future
//     rehype-raw runs) and `raw` string nodes (the default pipeline).
//   - inline `on*=` event-handler attributes.
//   - `javascript:` and `data:text/html` URLs in href/src.
//
// Everything else — imported `<p>/<ol>/<table>/<blockquote>`, the
// `.video-embed`/`.tweet-embed`/`.fb-embed` blocks emitted by
// remark-embeds, iframes pointing at youtube-nocookie / vimeo — is left
// verbatim. No allowlist reparse, so the ~277 recovered posts are
// unaffected. widgets.js is still injected once, lazily, by BaseLayout.

import { SKIP, visit } from 'unist-util-visit';

const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
const SCRIPT_OPEN = /<\/?script\b[^>]*>/gi;
const ON_ATTR = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const BAD_URL_ATTR =
  /(\s(?:href|src|xlink:href)\s*=\s*)(?:"\s*(?:javascript:|data:text\/html)[^"]*"|'\s*(?:javascript:|data:text\/html)[^']*'|(?:javascript:|data:text\/html)[^\s>]+)/gi;
const BAD_URL_VALUE = /^\s*(?:javascript:|data:text\/html)/i;

function cleanRaw(s) {
  return s
    .replace(SCRIPT_BLOCK, '')
    .replace(SCRIPT_OPEN, '')
    .replace(ON_ATTR, '')
    .replace(BAD_URL_ATTR, '$1"#"');
}

export default function rehypeSanitizeBody() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'script' && parent && typeof index === 'number') {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
      const props = node.properties;
      if (props) {
        for (const k of Object.keys(props)) {
          if (/^on[a-z]+$/i.test(k)) delete props[k];
        }
        for (const a of ['href', 'src', 'xlinkHref']) {
          const v = props[a];
          if (typeof v === 'string' && BAD_URL_VALUE.test(v)) props[a] = '#';
        }
      }
    });
    visit(tree, 'raw', (node) => {
      if (typeof node.value === 'string') node.value = cleanRaw(node.value);
    });
  };
}
