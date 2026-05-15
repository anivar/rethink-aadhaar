// Remark plugin: turn a bare YouTube / Vimeo / Twitter (X) / Facebook URL
// on its own line into a privacy-respecting embed. Inline `[link](url)`
// references are left alone — only solo-URL paragraphs are upgraded.
//
// Editor authoring:
//
//   Some intro paragraph.
//
//   https://www.youtube.com/watch?v=dQw4w9WgXcQ
//   https://x.com/no2uid/status/1983744249624719760
//   https://www.facebook.com/no2uid/videos/1234567890
//
//   More body.
//
// - YouTube → youtube-nocookie.com responsive iframe.
// - Vimeo → player.vimeo.com responsive iframe.
// - Twitter/X → blockquote.twitter-tweet (data-dnt="true"); widgets.js is
//   loaded once, lazily, by BaseLayout when any tweet is on the page.
// - Facebook → blockquote.fb-xfbml-parse-ignore + canonical link; we link
//   to the post rather than load Facebook's SDK (no script-tag injection).
//
// CSS for `.video-embed`, `.tweet-embed`, `.fb-embed` lives in
// src/styles/global.css.

import { visit } from 'unist-util-visit';

const YT =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})|youtu\.be\/([A-Za-z0-9_-]{11}))(?:[&?][^\s]*)?$/;
const VIMEO = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)(?:[/?#].*)?$/;
// Capture handle + status id so we can build a clean canonical URL.
const TWEET =
  /^https?:\/\/(?:mobile\.)?(?:www\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,15})\/status\/(\d{5,25})(?:[/?#].*)?$/;
const FB_POST =
  /^https?:\/\/(?:www\.|m\.)?facebook\.com\/([^/]+)\/(posts|videos)\/([0-9A-Za-z]+)(?:[/?#].*)?$/;

function urlOfSoloParagraph(node) {
  if (node.type !== 'paragraph' || node.children.length === 0) return null;
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
  if (node.children.length > 1) {
    const meaningful = node.children.filter((c) => !(c.type === 'text' && c.value.trim() === ''));
    if (meaningful.length === 1 && meaningful.length < node.children.length) {
      return urlOfSoloParagraph({ ...node, children: meaningful });
    }
  }
  return null;
}

function youtubeEmbed(id, url) {
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

function vimeoEmbed(id, url) {
  return (
    `<div class="video-embed" data-provider="vimeo">` +
    `<iframe src="https://player.vimeo.com/video/${id}" ` +
    `title="Vimeo video" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" ` +
    `allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>` +
    `<p class="video-embed-fallback"><a href="${url}" rel="noopener">Watch on Vimeo</a></p>` +
    `</div>`
  );
}

function tweetEmbed(handle, id) {
  // Canonical URL on twitter.com (X redirects this fine; widgets.js still
  // expects twitter.com/status URLs as the cite target).
  const url = `https://twitter.com/${handle}/status/${id}`;
  return (
    `<div class="tweet-embed">` +
    `<blockquote class="twitter-tweet" data-dnt="true" data-conversation="none">` +
    `<a href="${url}">View tweet on X (Twitter)</a>` +
    `</blockquote>` +
    `</div>`
  );
}

function facebookEmbed(handle, kind, _id, url) {
  // No Facebook SDK injection — just a styled card linking to the post.
  // Keeps the page free of FB tracking pixels. Users who want the rich
  // preview click through.
  const label = kind === 'videos' ? 'Watch on Facebook' : 'View post on Facebook';
  return (
    `<div class="fb-embed">` +
    `<p class="fb-embed-meta">Facebook · @${handle}</p>` +
    `<p class="fb-embed-link"><a href="${url}" rel="noopener" target="_blank">${label} →</a></p>` +
    `</div>`
  );
}

// Inline HTML script tags pointing at platform.twitter.com/widgets.js arrive
// as `html` nodes in mdast (markdown raw HTML). They never reach the rehype
// `element` walker, so strip them here. BaseLayout injects exactly one
// IntersectionObserver-gated copy of widgets.js per page.
const TWITTER_WIDGETS_TAG =
  /<script[^>]*\bsrc=(?:"|')(?:https?:)?\/\/platform\.twitter\.com\/widgets\.js[^"']*(?:"|')[^>]*><\/script>/gi;

export default function remarkEmbeds() {
  return (tree) => {
    visit(tree, 'html', (node) => {
      if (typeof node.value === 'string' && /platform\.twitter\.com\/widgets\.js/i.test(node.value)) {
        node.value = node.value.replace(TWITTER_WIDGETS_TAG, '').trim();
      }
    });
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index == null) return;
      const url = urlOfSoloParagraph(node);
      if (!url) return;
      let m = url.match(YT);
      if (m) {
        parent.children[index] = { type: 'html', value: youtubeEmbed(m[1] || m[2], url) };
        return;
      }
      m = url.match(VIMEO);
      if (m) {
        parent.children[index] = { type: 'html', value: vimeoEmbed(m[1], url) };
        return;
      }
      m = url.match(TWEET);
      if (m) {
        parent.children[index] = { type: 'html', value: tweetEmbed(m[1], m[2]) };
        return;
      }
      m = url.match(FB_POST);
      if (m) {
        parent.children[index] = { type: 'html', value: facebookEmbed(m[1], m[2], m[3], url) };
      }
    });
  };
}
