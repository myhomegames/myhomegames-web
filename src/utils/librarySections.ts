import type { GameLibrarySection } from "../types";

export const CORE_LIBRARY_KEYS = [
  "recommended",
  "library",
  "collections",
  "categories",
] as const;

export const OPTIONAL_LIBRARY_KEYS = [
  "platforms",
  "themes",
  "gameEngines",
  "gameModes",
  "playerPerspectives",
] as const;

export const LIBRARY_ORDER = [
  ...CORE_LIBRARY_KEYS,
  ...OPTIONAL_LIBRARY_KEYS,
] as const;

const LIBRARY_TYPES: Record<string, GameLibrarySection["type"]> = {
  recommended: "games",
  library: "games",
  collections: "collections",
  categories: "games",
  platforms: "games",
  themes: "games",
  gameEngines: "games",
  gameModes: "games",
  playerPerspectives: "games",
};

export function normalizeVisibleLibraries(value?: string[] | null): string[] {
  const normalized = new Set<string>(CORE_LIBRARY_KEYS);
  if (Array.isArray(value)) {
    value.forEach((key) => {
      if (typeof key === "string" && key.trim()) {
        normalized.add(key);
      }
    });
  }
  return LIBRARY_ORDER.filter((key) => normalized.has(key));
}

export function buildLibrarySections(keys: string[]): GameLibrarySection[] {
  return keys.map((key) => ({
    key,
    type: LIBRARY_TYPES[key] || "games",
  }));
}
