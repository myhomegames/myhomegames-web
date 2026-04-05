import i18n from "../i18n/config";

/** All documented IGDB `game_type` ids (0–14). */
export const IGDB_GAME_TYPE_IDS: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
];

/** English defaults when a locale key is missing (unknown id or incomplete resources). */
const IGDB_GAME_TYPE_FALLBACK_EN: Record<number, string> = {
  0: "Main Game",
  1: "DLC",
  2: "Expansion",
  3: "Bundle",
  4: "Standalone Expansion",
  5: "Mod",
  6: "Episode",
  7: "Season",
  8: "Remake",
  9: "Remaster",
  10: "Expanded Game",
  11: "Port",
  12: "Fork",
  13: "Pack",
  14: "Update",
};

export function getIgdbGameTypeLabel(id: number): string {
  const fallback = IGDB_GAME_TYPE_FALLBACK_EN[id] ?? `Game type ${id}`;
  return String(i18n.t(`igdbGameTypes.${id}`, { defaultValue: fallback }));
}

/** API sends numeric id only; accepts legacy { id } for older cached payloads. */
export function toGameTypeId(
  value: number | { id: number } | null | undefined
): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "object" && value !== null && typeof value.id === "number" && !Number.isNaN(value.id)) {
    return value.id;
  }
  return undefined;
}

/** Display label for info UI from stored id (uses current i18n language). */
export function displayGameType(type: number | null | undefined): string {
  if (type == null || typeof type !== "number" || Number.isNaN(type)) return "";
  return getIgdbGameTypeLabel(type);
}

/**
 * IGDB type id 0 = Main Game. Used for "solo principali": exclude DLC, remasters, etc.
 * If `type` is missing (legacy / not stored), treat as main. List APIs include `type` when set in metadata.
 */
export function isMainGameType(game: { type?: number | { id: number } | null }): boolean {
  const id = toGameTypeId(game.type);
  if (id === undefined) return true;
  return id === 0;
}
