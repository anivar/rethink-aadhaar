// Single source of truth for site navigation. Both desktop tiers and the
// mobile drawer read from this file so nothing drifts.
//
// Groupings double as the section labels in the mobile drawer:
//   primary  → action-first (Take action, Campaign 2025, About, Home)
//   learn    → reference content (Myths, Exclusion, FAQs, Resources)
//   newsroom → time-ordered output (Updates, Press)
//
// `compactInline` lists the items the compact-desktop tier (768–1279) shows
// inline; everything else falls into the "More ▾" disclosure.

export type NavItem = {
  label: string;
  href: string;
};

export const NAV = {
  primary: [
    { label: 'Home', href: '/' },
    { label: 'Take action', href: '/take-action' },
    { label: 'Campaign 2025', href: '/campaign2025' },
    { label: 'About', href: '/about' },
  ],
  learn: [
    { label: 'Myths', href: '/myths' },
    { label: 'Exclusion', href: '/testimonials' },
    { label: 'FAQs', href: '/faqs' },
    { label: 'Resources', href: '/resources' },
  ],
  newsroom: [
    { label: 'Updates', href: '/blog' },
    { label: 'Press', href: '/press-coverage' },
  ],
} satisfies Record<string, NavItem[]>;

// Desktop split-nav (≥1280): canonical layout — left and right of the logo.
export const DESKTOP_LEFT: NavItem[] = [
  { label: 'Myths', href: '/myths' },
  { label: 'Exclusion', href: '/testimonials' },
  { label: 'Updates', href: '/blog' },
  { label: 'Take action', href: '/take-action' },
];

export const DESKTOP_RIGHT: NavItem[] = [
  { label: 'FAQs', href: '/faqs' },
  { label: 'Resources', href: '/resources' },
  { label: 'Press', href: '/press-coverage' },
  { label: 'About', href: '/about' },
  { label: 'Campaign 2025', href: '/campaign2025' },
];

// Compact desktop (768–1279): flat row, "More ▾" picks up the overflow.
// The pinned "TAKE ACTION" CTA renders separately as a btn-primary so it
// always sits visually distinct from the inline links.
export const COMPACT_INLINE: NavItem[] = [
  { label: 'Myths', href: '/myths' },
  { label: 'Exclusion', href: '/testimonials' },
  { label: 'Updates', href: '/blog' },
  { label: 'FAQs', href: '/faqs' },
  { label: 'About', href: '/about' },
];

export const COMPACT_OVERFLOW: NavItem[] = [
  { label: 'Resources', href: '/resources' },
  { label: 'Press', href: '/press-coverage' },
  { label: 'Campaign 2025', href: '/campaign2025' },
];

export const TAKE_ACTION: NavItem = { label: 'Take action', href: '/take-action' };
