/** Built-in default skin (bundled Plex theme). */
export const BUILTIN_SKIN_PLEX_ID = "builtin-plex";

export const BUILTIN_SKIN_PLEX_NAME = "Plex";

/** Built-in empty bundle to verify skin switching (no theme rules). */
export const BUILTIN_SKIN_EMPTY_ID = "builtin-empty";

export const BUILTIN_SKIN_EMPTY_NAME = "Empty";

const BUILTIN_IDS = new Set<string>([BUILTIN_SKIN_PLEX_ID, BUILTIN_SKIN_EMPTY_ID]);

export function isBuiltinSkinId(id: string): boolean {
  return BUILTIN_IDS.has(id);
}
