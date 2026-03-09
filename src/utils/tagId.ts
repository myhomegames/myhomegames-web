/**
 * Same algorithm as server (routes/taglists.js getTagId).
 * Used so IGDB games use the same tag ids (hash of title) as library tags for links.
 */
export function getTagId(tagTitle: string): number {
  let hash = 0;
  const str = String(tagTitle).toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
