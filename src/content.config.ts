import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const md = (base: string) => glob({ pattern: '**/*.{md,mdx}', base: `./src/content/${base}` });

const myth = defineCollection({
  loader: md('myth'),
  schema: z.object({
    myth: z.string(),
    fact: z.string().optional(),
    order: z.number(),
  }),
});

const update = defineCollection({
  loader: md('update'),
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
  loader: md('exclusion'),
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
  loader: md('faq'),
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
  'Posters for online and print',
  'Leaflets and advisories',
  '2017 Day of Action posters',
  'Protest and event posters',
] as const;

// `image` carries the original download asset (kept full-resolution under
// public/media). Sections in POSTER_SECTIONS render as a thumbnail grid in
// resources.astro; everything else stays as a text-link card list.
export const POSTER_SECTIONS: readonly string[] = [
  'Posters for online and print',
  'Leaflets and advisories',
  '2017 Day of Action posters',
  'Protest and event posters',
];

const resource = defineCollection({
  loader: md('resource'),
  schema: z
    .object({
      title: z.string(),
      section: z.enum(RESOURCE_SECTIONS),
      href: z.string(),
      image: z.string().optional(),
      description: z.string().optional(),
      order: z.number().optional().default(0),
    })
    .refine((v) => v.href.startsWith('/') || /^https?:\/\//.test(v.href), {
      message: 'href must be a full URL or a site-relative path',
      path: ['href'],
    }),
});

const press = defineCollection({
  loader: md('press'),
  schema: z.object({
    title: z.string(),
    publication: z.string(),
    date: z.coerce.date(),
    href: z.string().url(),
  }),
});

const page = defineCollection({
  loader: md('page'),
  schema: z.object({
    title: z.string(),
    intro: z.string().optional(),
    /** Optional hero image (root path under public/, e.g. /media/...). */
    hero: z.string().optional(),
    /** Optional caption rendered as <figcaption> below the hero image. May contain inline HTML. */
    heroCaption: z.string().optional(),
    /** Optional structured fields rendered by the about template. */
    tagline: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    friends: z.array(z.string()).optional(),
    interns: z.array(z.string()).optional(),
    internsNote: z.string().optional(),
    contact: z
      .object({
        email: z.string().optional(),
        twitter: z.string().optional(),
        facebook: z.string().optional(),
        mailingList: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { myth, update, exclusion, faq, resource, press, page };
