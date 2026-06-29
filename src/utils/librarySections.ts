import type { GameLibrarySection } from "../types";

export const CORE_LIBRARY_KEYS = [
  "recommended",
  "library",
  "collections",
  "categories",
  "series",
  "franchise",
] as const;

export const OPTIONAL_LIBRARY_KEYS = [
  "platforms",
  "themes",
  "developers",
  "publishers",
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
  series: "games",
  franchise: "games",
  platforms: "games",
  themes: "games",
  developers: "collections",
  publishers: "collections",
  gameEngines: "games",
  gameModes: "games",
  playerPerspectives: "games",
};

const VALID_KEYS = new Set<string>(LIBRARY_ORDER);

export function normalizeVisibleLibraries(value?: string[] | null): string[] {
  const order = [...LIBRARY_ORDER];
  if (!Array.isArray(value) || value.length === 0) {
    return order;
  }
  const filtered = value.filter(
    (key) => typeof key === "string" && key.trim() && VALID_KEYS.has(key)
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

/** Last saved `visibleLibraries` from settings (sync read for first paint). */
export function readStoredVisibleLibraries(): string[] | null {
  try {
    const stored = localStorage.getItem("visibleLibraries");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((key): key is string => typeof key === "string");
  } catch {
    return null;
  }
}

/**
 * Library bar sections for the first React paint.
 * Uses saved visibility when present; otherwise stays empty until /settings loads
 * so the bar does not briefly show every tab before the configured subset applies.
 */
export function getInitialLibrarySections(): GameLibrarySection[] {
  const stored = readStoredVisibleLibraries();
  if (!stored) {
    return [];
  }
  return buildLibrarySections(normalizeVisibleLibraries(stored));
}
