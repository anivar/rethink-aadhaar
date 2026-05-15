// Remark plugin: turn a bare YouTube URL on its own line into a privacy-
// respecting (youtube-nocookie.com) responsive embed.
//
// Editor authoring:
//
//   Some intro paragraph.
//
//   https://www.youtube.com/watch?v=dQw4w9WgXcQ
//
//   More body.
//
// The middle paragraph (a single URL, nothing else) becomes an embed.
// Inline `[link](https://youtube.com/watch?v=…)` references are left alone.
//
// Vimeo handled the same way.
//
// CSS for `.video-embed` lives in src/styles/global.css.

import { visit } from 'unist-util-visit';

const YT =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})|youtu\.be\/([A-Za-z0-9_-]{11}))(?:[&?][^\s]*)?$/;
const VIMEO = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)(?:[/?#].*)?$/;

function urlOfSoloParagraph(node) {
  if (node.type !== 'paragraph' || node.children.length === 0) return null;
  // Single text node OR single link whose label === url (markdown autolink).
  if (node.children.length === 1) {
    const c = node.children[0];
    if (c.type === 'text') return c.value.trim();
    if (
      c.type === 'link' &&
      c.children.length === 1 &&
      c.children[0].type === 'text' &&
      c.children[0].value.trim() === c.url.trim()
    )
      return c.url.trim();
  }
  // Tolerate leading/trailing whitespace text nodes around a single autolink —
  // but only recurse if the filter actually shrank the list, otherwise an
  // all-bold/all-emphasis paragraph (`**...**`) would recurse forever.
  if (node.children.length > 1) {
    const meaningful = node.children.filter((c) => !(c.type === 'text' && c.value.trim() === ''));
    if (meaningful.length === 1 && meaningful.length < node.children.length) {
      return urlOfSoloParagraph({ ...node, children: meaningful });
    }
  }
  return null;
}

function embedHtml(provider, id, url) {
  if (provider === 'youtube') {
    return (
      `<div class="video-embed" data-provider="youtube">` +
      `<iframe src="https://www.youtube-nocookie.com/embed/${id}" ` +
      `title="YouTube video" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" ` +
      `allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
      `allowfullscreen></iframe>` +
      `<p class="video-embed-fallback"><a href="${url}" rel="noopener">Watch on YouTube</a></p>` +
      `</div>`
    );
  }
  return (
    `<div class="video-embed" data-provider="vimeo">` +
    `<iframe src="https://player.vimeo.com/video/${id}" ` +
    `title="Vimeo video" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" ` +
    `allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>` +
    `<p class="video-embed-fallback"><a href="${url}" rel="noopener">Watch on Vimeo</a></p>` +
    `</div>`
  );
}

export default function remarkYoutube() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index == null) return;
      const url = urlOfSoloParagraph(node);
      if (!url) return;
      let m = url.match(YT);
      if (m) {
        parent.children[index] = { type: 'html', value: embedHtml('youtube', m[1] || m[2], url) };
        return;
      }
      m = url.match(VIMEO);
      if (m) {
        parent.children[index] = { type: 'html', value: embedHtml('vimeo', m[1], url) };
      }
    });
  };
}
