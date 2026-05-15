// Stable per-myth slug derived from the myth headline.
// Matches upstream Squarespace slugs (e.g. "aadhaar-is-identity-for-those-who-lack-an-identity")
// so old links keep working as targets and search results land on the same page.
export function mythSlug(myth: string): string {
  return myth
    .toLowerCase()
    .replace(/['"."]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
