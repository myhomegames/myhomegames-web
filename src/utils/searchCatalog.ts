import type { CollectionItem, GameItem } from "../types";

export const RECENT_SEARCHES_KEY = "recentSearches";
export const LAST_SEARCH_QUERY_KEY = "mhgLastSearchQuery";
export const MAX_RECENT_SEARCHES = 10;
export const MIN_SEARCH_QUERY_LENGTH = 2;

export type SearchCatalogHit = {
  searchQuery: string;
  games: GameItem[];
  collections: CollectionItem[];
  developers: CollectionItem[];
  publishers: CollectionItem[];
};

export function loadRecentSearches(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return loadRecentSearches();
  const updated = [
    trimmed,
    ...loadRecentSearches().filter((s) => s !== trimmed),
  ].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    /* ignore quota */
  }
  return updated;
}

export function removeRecentSearch(query: string): string[] {
  const updated = loadRecentSearches().filter((s) => s !== query);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
  return updated;
}

export function loadLastSearchQuery(): string {
  try {
    return localStorage.getItem(LAST_SEARCH_QUERY_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function saveLastSearchQuery(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(LAST_SEARCH_QUERY_KEY, trimmed);
  } catch {
    /* ignore */
  }
}

export function filterSearchCatalog(
  query: string,
  games: GameItem[],
  collections: CollectionItem[],
  developers: CollectionItem[] = [],
  publishers: CollectionItem[] = [],
): SearchCatalogHit {
  const trimmed = query.trim();
  if (trimmed.length < MIN_SEARCH_QUERY_LENGTH) {
    return {
      searchQuery: trimmed,
      games: [],
      collections: [],
      developers: [],
      publishers: [],
    };
  }
  const queryLower = trimmed.toLowerCase();
  return {
    searchQuery: trimmed,
    games: games.filter((game) => game.title.toLowerCase().includes(queryLower)),
    collections: collections.filter((collection) =>
      collection.title.toLowerCase().includes(queryLower),
    ),
    developers: developers.filter((d) =>
      (d.title || "").toLowerCase().includes(queryLower),
    ),
    publishers: publishers.filter((p) =>
      (p.title || "").toLowerCase().includes(queryLower),
    ),
  };
}
