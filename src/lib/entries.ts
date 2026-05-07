// Helpers for working with content-collection entries.
// One place that knows how to turn an entry id into a URL.

import type { CollectionEntry } from 'astro:content';
import { link } from '~/lib/link';

const URL_PREFIX = {
  update: '/blog/',
  exclusion: '/testimonials/',
  page: '/',
} as const;

type RoutedCollection = keyof typeof URL_PREFIX;

export function entryHref<C extends RoutedCollection>(collection: C, entry: { id: string }): string {
  const slug = entry.id.replace(/\.md$/, '').replace(/\.mdx$/, '');
  return link(`${URL_PREFIX[collection]}${slug}/`);
}

export function bySlugDesc<T extends { id: string }>(a: T, b: T): number {
  return b.id.localeCompare(a.id);
}

export function byDateDesc<T extends { data: { date: Date } }>(a: T, b: T): number {
  return b.data.date.getTime() - a.data.date.getTime();
}

export function byOrder<T extends { data: { order: number } }>(a: T, b: T): number {
  return a.data.order - b.data.order;
}

export function groupByYear<T extends { data: { date: Date } }>(entries: T[]): Map<number, T[]> {
  const m = new Map<number, T[]>();
  for (const e of entries) {
    const y = e.data.date.getUTCFullYear();
    if (!m.has(y)) m.set(y, []);
    m.get(y)?.push(e);
  }
  return m;
}

export function notDraft<T extends { data: { draft?: boolean } }>(e: T): boolean {
  return !e.data.draft;
}

// Type aliases used by pages — keeps imports tidy.
export type UpdateEntry = CollectionEntry<'update'>;
export type ExclusionEntry = CollectionEntry<'exclusion'>;
export type PressEntry = CollectionEntry<'press'>;
export type MythEntry = CollectionEntry<'myth'>;
export type FaqEntry = CollectionEntry<'faq'>;
export type ResourceEntry = CollectionEntry<'resource'>;
export type PageEntry = CollectionEntry<'page'>;
