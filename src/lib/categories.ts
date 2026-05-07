// Single source of truth for "which content categories get regular updates".
// Both the editor scaffolder (scripts/new.ts) and the upstream sync
// (scripts/sync.ts) read this — adding a new updatable collection means
// editing this one file.

export type CategoryKey = 'update' | 'exclusion' | 'press';

export interface CategoryConfig {
  key: CategoryKey;
  label: string; // human label
  collectionDir: string; // src/content/<dir>
  routePrefix: string; // public URL prefix
  upstreamPath: string; // path on rethinkaadhaar.in to crawl for new entries
  /** Required front-matter fields the scaffolder will prompt for. */
  required: readonly string[];
  /** Optional fields the scaffolder offers. */
  optional: readonly string[];
  /** How a slug is built for a new entry given a date and a kebab title. */
  slug: (dateISO: string, kebab: string) => string;
}

export const CATEGORIES: Record<CategoryKey, CategoryConfig> = {
  update: {
    key: 'update',
    label: 'Update / press release',
    collectionDir: 'src/content/update',
    routePrefix: '/blog/',
    upstreamPath: '/blog',
    required: ['title', 'date'],
    optional: ['excerpt', 'hero', 'sourceUrl', 'draft'],
    slug: (date, kebab) => `${date}-${kebab}`,
  },
  exclusion: {
    key: 'exclusion',
    label: 'Exclusion story',
    collectionDir: 'src/content/exclusion',
    routePrefix: '/testimonials/',
    upstreamPath: '/testimonials',
    required: ['title', 'date'],
    optional: ['location', 'summary', 'sourceUrl', 'shareImage'],
    slug: (date, kebab) => `${date}-${kebab}`,
  },
  press: {
    key: 'press',
    label: 'Press coverage entry',
    collectionDir: 'src/content/press',
    routePrefix: '/press-coverage', // single index page
    upstreamPath: '/press-coverage',
    required: ['title', 'publication', 'date', 'href'],
    optional: [],
    slug: (date, kebab) => `${date}-${kebab}`,
  },
};

export const CATEGORY_LIST: CategoryConfig[] = Object.values(CATEGORIES);

export function kebab(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
