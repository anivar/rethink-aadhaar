// JSON-LD builders. Each page calls the relevant builder(s) and passes the
// result to BaseLayout via the `jsonLd` prop, which emits one or more
// <script type="application/ld+json"> tags. Schemas update automatically as
// content collections change — no hand-maintained structured data.

const SITE_NAME = 'Rethink Aadhaar';
const SITE_URL  = 'https://rethinkaadhaar.in';

export type JsonLd = Record<string, unknown>;

export function org(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    sameAs: [
      'https://twitter.com/no2uid',
      'https://www.facebook.com/no2uid/',
    ],
    logo: `${SITE_URL}/brand/logo-mark.png`,
  };
}

export function website(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'en-IN',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumb(trail: { name: string; url: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: t.url.startsWith('http') ? t.url : `${SITE_URL}${t.url}`,
    })),
  };
}

export function article(input: {
  type?: 'Article' | 'NewsArticle' | 'ReportageNewsArticle';
  url: string;
  title: string;
  description?: string;
  datePublished: Date;
  dateModified?: Date;
  image?: string;
  authorName?: string;
  section?: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': input.type ?? 'Article',
    mainEntityOfPage: input.url,
    headline: input.title,
    description: input.description,
    datePublished: input.datePublished.toISOString(),
    dateModified: (input.dateModified ?? input.datePublished).toISOString(),
    image: input.image ? (input.image.startsWith('http') ? input.image : `${SITE_URL}${input.image}`) : undefined,
    author: { '@type': 'Organization', name: input.authorName ?? SITE_NAME },
    publisher: org(),
    articleSection: input.section,
    inLanguage: 'en-IN',
  };
}

export function faqPage(items: { question: string; answer: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  };
}

export function itemList(input: {
  name: string;
  url: string;
  items: { name: string; url: string; description?: string }[];
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    url: input.url.startsWith('http') ? input.url : `${SITE_URL}${input.url}`,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: it.url.startsWith('http') ? it.url : `${SITE_URL}${it.url}`,
      name: it.name,
      description: it.description,
    })),
  };
}

export function collectionPage(input: {
  name: string;
  url: string;
  description?: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    url: input.url.startsWith('http') ? input.url : `${SITE_URL}${input.url}`,
    description: input.description,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };
}
