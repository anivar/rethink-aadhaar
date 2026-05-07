// Single source of truth for date formatting across the site.
// Use these instead of inline toLocaleDateString or hand-rolled padStart.

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Standardised — only these styles exist anywhere in the codebase.
//   short     → "12/03/2024"        (rare; machine-ish)
//   medium    → "12 Mar 2024"       (every listing, card, list item)
//   long      → "12 March 2024"     (hero eyebrows, detail pages)
//   monthYear → "Mar 2024"          (year-grouped lists where day is noise)
//   iso       → "2024-03-12T00:00:00.000Z"  (RSS, sitemap, JSON-LD)
export type DateStyle = 'short' | 'medium' | 'long' | 'monthYear' | 'iso';

export function formatDate(d: Date, style: DateStyle = 'medium'): string {
  const day = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  switch (style) {
    case 'short':
      return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    case 'medium':
      return `${day} ${MONTHS_SHORT[month]} ${year}`;
    case 'long':
      return `${day} ${MONTHS_LONG[month]} ${year}`;
    case 'monthYear':
      return `${MONTHS_SHORT[month]} ${year}`;
    case 'iso':
      return d.toISOString();
  }
}

export function year(d: Date): number {
  return d.getUTCFullYear();
}
