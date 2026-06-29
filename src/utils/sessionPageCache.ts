import { API_BASE } from "../config";
import type { CollectionItem, GameItem } from "../types";

const CACHE_VERSION = 1;

export type RecommendedSectionSessionCache = {
  id: string;
  games: GameItem[];
};

type CacheEnvelope<T> = {
  v: number;
  apiBase: string;
  data: T;
};

function buildKey(suffix: string): string {
  return `mhg:sc:${encodeURIComponent(API_BASE)}:${suffix}`;
}

function readEnvelope<T>(suffix: string): T | null {
  try {
    const raw = sessionStorage.getItem(buildKey(suffix));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (parsed.v !== CACHE_VERSION || parsed.apiBase !== API_BASE) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeEnvelope<T>(suffix: string, data: T): void {
  try {
    const envelope: CacheEnvelope<T> = {
      v: CACHE_VERSION,
      apiBase: API_BASE,
      data,
    };
    sessionStorage.setItem(buildKey(suffix), JSON.stringify(envelope));
  } catch {
    /* sessionStorage full or unavailable */
  }
}

export function readLibraryGamesSessionCache(): GameItem[] | null {
  const data = readEnvelope<GameItem[]>("library-games");
  return Array.isArray(data) ? data : null;
}

export function writeLibraryGamesSessionCache(games: GameItem[]): void {
  writeEnvelope("library-games", games);
}

export type CollectionsSessionCache = {
  collections: CollectionItem[];
  collectionGameIds: Record<string, string[]>;
};

export function readCollectionsSessionCache(): CollectionsSessionCache | null {
  const data = readEnvelope<CollectionsSessionCache>("collections");
  if (!data || !Array.isArray(data.collections)) return null;
  return {
    collections: data.collections,
    collectionGameIds: data.collectionGameIds ?? {},
  };
}

export function writeCollectionsSessionCache(
  collections: CollectionItem[],
  collectionGameIds: Map<string, string[]>,
): void {
  writeEnvelope("collections", {
    collections,
    collectionGameIds: Object.fromEntries(collectionGameIds),
  });
}

export type CompanyListSessionCache = {
  items: CollectionItem[];
  gameIds: Record<string, string[]>;
};

export function readDevelopersSessionCache(): CompanyListSessionCache | null {
  const data = readEnvelope<CompanyListSessionCache>("developers");
  if (!data || !Array.isArray(data.items)) return null;
  return { items: data.items, gameIds: data.gameIds ?? {} };
}

export function writeDevelopersSessionCache(
  items: CollectionItem[],
  gameIds: Map<string, string[]>,
): void {
  writeEnvelope("developers", {
    items,
    gameIds: Object.fromEntries(gameIds),
  });
}

export function readPublishersSessionCache(): CompanyListSessionCache | null {
  const data = readEnvelope<CompanyListSessionCache>("publishers");
  if (!data || !Array.isArray(data.items)) return null;
  return { items: data.items, gameIds: data.gameIds ?? {} };
}

export function writePublishersSessionCache(
  items: CollectionItem[],
  gameIds: Map<string, string[]>,
): void {
  writeEnvelope("publishers", {
    items,
    gameIds: Object.fromEntries(gameIds),
  });
}

export function readRecommendedSectionsSessionCache(): RecommendedSectionSessionCache[] | null {
  const data = readEnvelope<RecommendedSectionSessionCache[]>("recommended-sections");
  return Array.isArray(data) ? data : null;
}

export function writeRecommendedSectionsSessionCache(
  sections: RecommendedSectionSessionCache[],
): void {
  writeEnvelope("recommended-sections", sections);
}

export function recordToGameIdsMap(record: Record<string, string[]>): Map<string, string[]> {
  return new Map(Object.entries(record));
}
