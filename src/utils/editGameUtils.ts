/**
 * Pure helpers for game edit form (websites and similarGames).
 * Used by EditGameModal and tested in editGameUtils.test.ts.
 */

export type WebsiteEntry = { url: string; category?: number };

export type SimilarGameEntry = { id: number; name: string };

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

export function normalizeSimilarGames(
  list?: Array<{ id: number | string; name?: string }> | null
): SimilarGameEntry[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<number>();
  return list
    .filter((item) => item && item.id != null)
    .map((item) => {
      const id = Number(item.id);
      return { id, name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : String(item.id) };
    })
    .filter((o) => !Number.isNaN(o.id))
    .filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
}

export function areSimilarGamesEqual(
  a: SimilarGameEntry[],
  b: SimilarGameEntry[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.id === b[i].id && x.name === b[i].name);
}
