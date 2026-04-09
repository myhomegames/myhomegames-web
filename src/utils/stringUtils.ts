/**
 * Normalizes a string for comparison by removing special characters
 * and converting to lowercase. Ignores leading "The " and "A " for sorting.
 */
export function normalizeForSort(str: string): string {
  if (!str) return "";
  const withoutArticle = str.replace(/^(The|A)\s+/i, "").trim();
  return withoutArticle
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w\s]/g, "") // Remove all special characters (keep only alphanumeric and spaces)
    .trim();
}

/**
 * Compares two strings ignoring special characters
 */
export function compareTitles(a: string, b: string): number {
  const normalizedA = normalizeForSort(a || "");
  const normalizedB = normalizeForSort(b || "");
  return normalizedA.localeCompare(normalizedB);
}

/**
 * Returns only items that are not "children" of any other item in the list.
 * Children are detected by explicit `childs` ids in metadata.
 * Use this for root-level lists (Collections, Developers, Publishers pages) so
 * sub-items are only shown inside their parent's detail page.
 */
export function filterRootCollectionLikes<T extends { id: string | number; childs?: Array<string | number> | null }>(items: T[]): T[] {
  const childIds = new Set<string>();
  for (const item of items) {
    const childs = Array.isArray(item.childs) ? item.childs : [];
    for (const childId of childs) {
      if (childId == null) continue;
      childIds.add(String(childId));
    }
  }
  return items.filter((item) => {
    return !childIds.has(String(item.id));
  });
}

