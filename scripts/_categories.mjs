// JS mirror of src/lib/categories.ts so node scripts can use it without
// transpilation. Keep in sync — both files reference the same dirs/prefixes.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const CATEGORIES = {
  update: {
    key: 'update',
    label: 'Update / press release',
    collectionDir: 'src/content/update',
    routePrefix: '/blog/',
    upstreamPath: '/blog',
    required: ['title', 'date'],
    optional: ['excerpt', 'hero', 'sourceUrl', 'draft'],
  },
  exclusion: {
    key: 'exclusion',
    label: 'Exclusion story',
    collectionDir: 'src/content/exclusion',
    routePrefix: '/testimonials/',
    upstreamPath: '/testimonials',
    required: ['title', 'date'],
    optional: ['location', 'summary', 'sourceUrl', 'shareImage'],
  },
  press: {
    key: 'press',
    label: 'Press coverage entry',
    collectionDir: 'src/content/press',
    routePrefix: '/press-coverage',
    upstreamPath: '/press-coverage',
    required: ['title', 'publication', 'date', 'href'],
    optional: [],
  },
};

export function kebab(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
