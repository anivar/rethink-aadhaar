// Build-aware link helper. When deployed under a sub-path (e.g. GitHub Pages
// project site at /rethink-aadhaar/), Astro's `base` config kicks in but
// raw `<a href="/foo">` strings are NOT auto-prefixed. Always wrap internal
// links with `link()` so they resolve correctly at every deploy target.

const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

export function link(path: string): string {
  if (!path) return path;
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  if (path === '/') return BASE || '/';
  return `${BASE}${path}`;
}

/** Absolute URL (origin + base + path) — for canonical, JSON-LD, og:image. */
export function absoluteUrl(path: string, site: URL | string): string {
  const u = new URL(typeof site === 'string' ? site : site.toString());
  return new URL(link(path), u).toString();
}
