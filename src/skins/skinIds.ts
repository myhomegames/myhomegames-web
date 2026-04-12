/** Built-in default skin (bundled Plex theme). */
export const BUILTIN_SKIN_PLEX_ID = "builtin-plex";

export const BUILTIN_SKIN_PLEX_NAME = "Plex";

const BUILTIN_IDS = new Set<string>([BUILTIN_SKIN_PLEX_ID]);

export function isBuiltinSkinId(id: string): boolean {
  return BUILTIN_IDS.has(id);
}

/** Installed skins use a UUID folder id under METADATA_PATH/content/skins. */
const SERVER_SKIN_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isServerSkinId(id: string): boolean {
  return SERVER_SKIN_UUID.test(id);
}
