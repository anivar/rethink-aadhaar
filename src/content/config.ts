import { defineCollection, z } from 'astro:content';

const myth = defineCollection({
  type: 'content',
  schema: z.object({
    myth: z.string(),
    fact: z.string().optional(),
    order: z.number(),
  }),
});

const update = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    hero: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    excerpt: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

const exclusion = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    location: z.string().optional(),
    summary: z.string().optional(),
    shareImage: z.string().optional(),
    sourceUrl: z.string().url().optional(),
  }),
});

const faq = defineCollection({
  type: 'content',
  schema: z.object({
    question: z.string(),
    short: z.string().optional(),
    order: z.number(),
  }),
});

const RESOURCE_SECTIONS = [
  'Primers',
  'Government documents',
  'Hunger deaths 2015–18',
  'Case documents',
  'Templates',
  'Articles archive',
] as const;

const resource = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    section: z.enum(RESOURCE_SECTIONS),
    href: z.string().url(),
    description: z.string().optional(),
    order: z.number().optional().default(0),
  }),
});

const press = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    publication: z.string(),
    date: z.coerce.date(),
    href: z.string().url(),
  }),
});

const page = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    intro: z.string().optional(),
  }),
});

export const collections = { myth, update, exclusion, faq, resource, press, page };
