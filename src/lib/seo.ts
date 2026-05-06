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
  /** Baseline schema.org entities discussed by the page. */
  mentions?: JsonLd[];
  /** Voice-assistant readable selectors. */
  speakable?: string[];
}): JsonLd {
  const out: JsonLd = {
    '@context': 'https://schema.org',
    '@type': input.type ?? 'Article',
    mainEntityOfPage: input.url,
    headline: input.title,
    datePublished: input.datePublished.toISOString(),
    dateModified: (input.dateModified ?? input.datePublished).toISOString(),
    author: { '@type': 'Organization', name: input.authorName ?? SITE_NAME },
    publisher: org(),
    inLanguage: 'en-IN',
  };
  if (input.description) out.description = input.description;
  if (input.image) out.image = input.image.startsWith('http') ? input.image : `${SITE_URL}${input.image}`;
  if (input.section) out.articleSection = input.section;
  if (input.mentions?.length) out.mentions = input.mentions;
  if (input.speakable?.length) {
    out.speakable = { '@type': 'SpeakableSpecification', cssSelector: input.speakable };
  }
  return out;
}

/** Canonical entities referenced across the site. Attached as `mentions`
 *  on every article so answer engines (ChatGPT, Perplexity, Google AI
 *  Overviews) can disambiguate "Aadhaar" / "UIDAI" / the privacy ruling
 *  via Wikidata + Wikipedia identifiers. */
export const MENTIONS: JsonLd[] = [
  {
    '@type': 'Thing',
    name: 'Aadhaar',
    sameAs: [
      'https://en.wikipedia.org/wiki/Aadhaar',
      'https://www.wikidata.org/wiki/Q1815901',
    ],
  },
  {
    '@type': 'GovernmentOrganization',
    name: 'Unique Identification Authority of India',
    alternateName: 'UIDAI',
    sameAs: [
      'https://en.wikipedia.org/wiki/Unique_Identification_Authority_of_India',
      'https://www.wikidata.org/wiki/Q7889036',
      'https://uidai.gov.in/',
    ],
  },
  {
    '@type': 'GovernmentOrganization',
    name: 'Supreme Court of India',
    sameAs: [
      'https://en.wikipedia.org/wiki/Supreme_Court_of_India',
      'https://www.wikidata.org/wiki/Q11602',
    ],
  },
  {
    '@type': 'Legislation',
    name: 'Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016',
    sameAs: 'https://en.wikipedia.org/wiki/Aadhaar_Act,_2016',
  },
  {
    '@type': 'CreativeWork',
    name: 'Justice K. S. Puttaswamy (Retd.) v. Union of India',
    sameAs: 'https://en.wikipedia.org/wiki/Justice_K._S._Puttaswamy_(Retd.)_v._Union_of_India',
  },
];

/** ClaimReview JSON-LD per myth — schema.org/ClaimReview gives Google
 *  fact-check rich results and tells answer engines that this page
 *  reviewed the claim and reached a verdict. Each myth becomes one
 *  ClaimReview block on the /myths page. */
export function claimReview(input: {
  url: string;
  claim: string;
  verdict: string;
  ratingName?: string;       // "False" | "Misleading" | "Mostly False"
  ratingValue?: number;      // 1 = false, 5 = true; we use 2 = mostly false
  datePublished?: Date;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    url: input.url.startsWith('http') ? input.url : `${SITE_URL}${input.url}`,
    datePublished: (input.datePublished ?? new Date()).toISOString().slice(0, 10),
    author: org(),
    claimReviewed: input.claim,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: input.ratingValue ?? 2,
      bestRating: 5,
      worstRating: 1,
      alternateName: input.ratingName ?? 'Misleading',
    },
    itemReviewed: {
      '@type': 'Claim',
      datePublished: '2009-09-28',
      appearance: 'https://uidai.gov.in/',
      author: { '@type': 'Organization', name: 'Various' },
      text: input.claim,
    },
    reviewBody: input.verdict,
  };
}

export function faqPage(items: { question: string; answer: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.faq-question', '.faq-answer'],
    },
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['.faq-answer'],
        },
      },
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
