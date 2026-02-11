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
  const order = [...LIBRARY_ORDER];
  if (!Array.isArray(value) || value.length === 0) {
    return order;
  }
  const filtered = value.filter(
    (key) => typeof key === "string" && key.trim() && order.includes(key)
  );
  if (filtered.length === 0) {
    return order;
  }
  return order.filter((key) => filtered.includes(key));
}

export function buildLibrarySections(keys: string[]): GameLibrarySection[] {
  return keys.map((key) => ({
    key,
    type: LIBRARY_TYPES[key] || "games",
  }));
}
