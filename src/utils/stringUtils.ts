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

/** Separators that indicate a sub-collection title (e.g. "Parent: Child") */
const SUBTITLE_SEPARATORS = [":", "-", ";", "_", "/", "\\", "@", "#"];

/**
 * Returns true if childTitle is a sub-collection-style title of parentTitle
 * (e.g. "Acme" and "Acme: Sports" or "Acme - Action").
 */
export function isSubCollectionTitle(parentTitle: string, childTitle: string): boolean {
  const parent = parentTitle.trim();
  const child = childTitle.trim();
  if (!parent || !child || child.length <= parent.length) return false;
  if (!child.startsWith(parent)) return false;
  const rest = child.slice(parent.length);
  const restTrimmed = rest.replace(/^\s+/, "");
  if (!restTrimmed) return false;
  const first = restTrimmed[0];
  return SUBTITLE_SEPARATORS.includes(first);
}

