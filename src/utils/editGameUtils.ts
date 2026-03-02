/**
 * Pure helpers for game edit form (websites normalization and comparison).
 * Used by EditGameModal and tested in editGameUtils.test.ts.
 */

export type WebsiteEntry = { url: string; category?: number };

export function normalizeWebsites(
  list?: Array<{ url: string; category?: number }> | null
): WebsiteEntry[] {
  return (Array.isArray(list) ? list : [])
    .map((w) => ({ url: w.url.trim(), category: w.category }))
    .filter((w) => w.url);
}

export function areWebsitesEqual(
  a: Array<{ url: string; category?: number }>,
  b: Array<{ url: string; category?: number }>
): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.url === b[i].url && x.category === b[i].category);
}
