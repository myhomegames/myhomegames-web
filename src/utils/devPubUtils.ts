/**
 * Utilities for converting developers/publishers between
 * { id: number; name: string }[] (API format) and string[] (used for filters, tags, etc.)
 */

export type DevPubItem = { id: number; name: string };

/**
 * Converts developers/publishers array to string[] of IDs for use in filters, tag editors, etc.
 */
export function toDevPubIds(
  arr: DevPubItem[] | undefined | null
): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map((x) => String(x.id));
}

/**
 * Converts string[] of IDs back to { id, name }[] when names are available from a lookup.
 */
export function idsToDevPub(
  ids: string[],
  lookup: Array<{ id: string | number; title?: string; name?: string }>
): DevPubItem[] {
  if (!ids || ids.length === 0) return [];
  return ids
    .map((id) => {
      const match = lookup.find((x) => String(x.id) === String(id));
      if (!match) return null;
      const name = match.name ?? match.title ?? String(id);
      return { id: Number(id), name };
    })
    .filter((x): x is DevPubItem => x !== null);
}
