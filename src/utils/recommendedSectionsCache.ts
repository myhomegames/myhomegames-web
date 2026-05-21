import type { GameItem } from "../types";

export type RecommendedSectionCache = {
  id: string;
  games: GameItem[];
};

let sectionsCache: RecommendedSectionCache[] | null = null;

export function getRecommendedSectionsCache(): RecommendedSectionCache[] | null {
  return sectionsCache;
}

export function setRecommendedSectionsCache(sections: RecommendedSectionCache[]): void {
  sectionsCache = sections;
}

export function getRecommendedSectionFromCache(sectionId: string): RecommendedSectionCache | null {
  if (!sectionsCache) return null;
  return sectionsCache.find((s) => String(s.id) === String(sectionId)) ?? null;
}

/** Router state when opening a section from the strip index (no `/recommended` refetch). */
export type RecommendedSectionsNavState = {
  recommendedSectionsSnapshot: RecommendedSectionCache[];
  skipRecommendedFetch: true;
};
