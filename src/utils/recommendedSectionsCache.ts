import type { GameItem } from "../types";
import {
  readRecommendedSectionsSessionCache,
  writeRecommendedSectionsSessionCache,
} from "./sessionPageCache";

export type RecommendedSectionCache = {
  id: string;
  title?: string;
  games: GameItem[];
};

let sectionsCache: RecommendedSectionCache[] | null =
  readRecommendedSectionsSessionCache();
/** Set when leaving recommended for a game detail; consumed once on return. */
let preserveOnReturnFromGame = false;
/** Set when leaving the strip index for a section (or back to index); consumed once on index mount. */
let preserveOnReturnToIndex = false;

export function getRecommendedSectionsCache(): RecommendedSectionCache[] | null {
  if (!sectionsCache) {
    sectionsCache = readRecommendedSectionsSessionCache();
  }
  return sectionsCache;
}

export function setRecommendedSectionsCache(sections: RecommendedSectionCache[]): void {
  sectionsCache = sections;
  writeRecommendedSectionsSessionCache(sections);
}

export function clearRecommendedSectionsCache(): void {
  sectionsCache = null;
  writeRecommendedSectionsSessionCache([]);
  preserveOnReturnFromGame = false;
  preserveOnReturnToIndex = false;
}

export function clearRecommendedPreserveOnReturnToIndex(): void {
  preserveOnReturnToIndex = false;
}

export function markRecommendedReturnFromGame(): void {
  preserveOnReturnFromGame = true;
}

/** True while returning from a recommended game (does not clear the flag). */
export function peekRecommendedReturnFromGame(): boolean {
  return preserveOnReturnFromGame;
}

/** True once after back from a recommended game; clears the flag. */
export function consumeRecommendedReturnFromGame(): boolean {
  if (!preserveOnReturnFromGame) return false;
  preserveOnReturnFromGame = false;
  return true;
}

/** Set when opening a section from the strip or navigating back to the strip index. */
export function markRecommendedReturnToIndex(): void {
  preserveOnReturnToIndex = true;
}

/** True while returning to the strip index (does not clear the flag). */
export function peekRecommendedReturnToIndex(): boolean {
  return preserveOnReturnToIndex;
}

/** True once after back from a section detail to the strip index; clears the flag. */
export function consumeRecommendedReturnToIndex(): boolean {
  if (!preserveOnReturnToIndex) return false;
  preserveOnReturnToIndex = false;
  return true;
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
