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
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: ['Rethink Aadhaar Campaign', 'No2UID'],
    url: SITE_URL,
    description:
      "A non-partisan Indian campaign documenting the welfare exclusion, surveillance risk, and biometric failures of the Aadhaar (UID) project, and pushing back against its coercive expansion.",
    foundingDate: '2017',
    foundingLocation: { '@type': 'Country', name: 'India' },
    areaServed: { '@type': 'Country', name: 'India' },
    address: { '@type': 'PostalAddress', addressCountry: 'IN' },
    knowsAbout: [
      'Aadhaar', 'Unique Identification Authority of India', 'biometric identification',
      'welfare exclusion', 'public distribution system', 'NREGA', 'right to privacy',
      'mass surveillance', 'data protection', 'digital identity',
    ],
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
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'en-IN',
    publisher: { '@id': `${SITE_URL}/#organization` },
    about: { '@id': `${SITE_URL}/#topic-aadhaar` },
    keywords: [
      'Aadhaar', 'UIDAI', 'biometric ID India', 'welfare exclusion',
      'PDS ration Aadhaar', 'NREGA Aadhaar', 'pension Aadhaar',
      'right to privacy India', 'Puttaswamy judgment', 'mass surveillance India',
      'India Stack', 'digital identity', 'hunger deaths Aadhaar',
    ].join(', '),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Place entity for `contentLocation` on exclusion stories. Free-form
 *  location string is preserved verbatim (e.g. "Khunti, Jharkhand"); we
 *  only add the country code to anchor it to India. */
export function place(name: string, country = 'IN'): JsonLd {
  return {
    '@type': 'Place',
    name,
    address: { '@type': 'PostalAddress', addressLocality: name, addressCountry: country },
  };
}

/** AboutPage for /about — pairs with the Organization graph for richer
 *  answer-engine context ("who runs this site?"). */
export function aboutPage(input: { url: string; description?: string }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: input.url.startsWith('http') ? input.url : `${SITE_URL}${input.url}`,
    inLanguage: 'en-IN',
    description: input.description,
    mainEntity: { '@id': `${SITE_URL}/#organization` },
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };
}

/** Event/PublicationEvent — used for the Campaign 2025 launch on
 *  Human Rights Day. Tells answer engines this is a dated, named release
 *  with named endorsing organisations, not just a static page. */
export function event(input: {
  name: string;
  url: string;
  startDate: string;       // ISO date
  endDate?: string;        // ISO date — for ongoing campaigns
  description?: string;
  organizerName?: string;
  locationName?: string;   // free-form, defaults to "India"
}): JsonLd {
  const out: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PublicationEvent',
    name: input.name,
    url: input.url.startsWith('http') ? input.url : `${SITE_URL}${input.url}`,
    startDate: input.startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
    location: { '@type': 'Country', name: input.locationName ?? 'India' },
    organizer: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-IN',
  };
  if (input.endDate) out.endDate = input.endDate;
  if (input.description) out.description = input.description;
  return out;
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
  /** Geographic context — exclusion stories pass district/state. */
  contentLocation?: JsonLd;
}): JsonLd {
  const out: JsonLd = {
    '@context': 'https://schema.org',
    '@type': input.type ?? 'Article',
    mainEntityOfPage: input.url,
    headline: input.title,
    datePublished: input.datePublished.toISOString(),
    dateModified: (input.dateModified ?? input.datePublished).toISOString(),
    author: { '@type': 'Organization', name: input.authorName ?? SITE_NAME },
    publisher: { '@id': `${SITE_URL}/#organization` },
    isPartOf: { '@id': `${SITE_URL}/#website` },
    inLanguage: 'en-IN',
  };
  if (input.description) out.description = input.description;
  if (input.image) out.image = input.image.startsWith('http') ? input.image : `${SITE_URL}${input.image}`;
  if (input.section) out.articleSection = input.section;
  if (input.mentions?.length) out.mentions = input.mentions;
  if (input.contentLocation) out.contentLocation = input.contentLocation;
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
    '@id': `${SITE_URL}/#topic-aadhaar`,
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
