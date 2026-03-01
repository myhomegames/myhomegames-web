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

