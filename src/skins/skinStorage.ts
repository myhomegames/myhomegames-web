import { BUILTIN_SKIN_PLEX_ID } from "./skinIds";

const STORAGE_ACTIVE_SKIN = "mhg_active_skin_id";
/** Legacy key from browser-only skins; cleared on read. */
const LEGACY_CUSTOM_SKINS = "mhg_custom_skins_v1";
/** Removed built-in; migrate saved choice to Plex. */
const LEGACY_EMPTY_SKIN_ID = "builtin-empty";

export function getActiveSkinId(): string {
  const v = localStorage.getItem(STORAGE_ACTIVE_SKIN);
  const trimmed = v && v.trim() ? v.trim() : BUILTIN_SKIN_PLEX_ID;
  if (trimmed.startsWith("custom-")) {
    localStorage.removeItem(STORAGE_ACTIVE_SKIN);
    localStorage.removeItem(LEGACY_CUSTOM_SKINS);
    return BUILTIN_SKIN_PLEX_ID;
  }
  if (trimmed === LEGACY_EMPTY_SKIN_ID) {
    localStorage.setItem(STORAGE_ACTIVE_SKIN, BUILTIN_SKIN_PLEX_ID);
    return BUILTIN_SKIN_PLEX_ID;
  }
  return trimmed;
}

export function setActiveSkinId(id: string): void {
  localStorage.setItem(STORAGE_ACTIVE_SKIN, id);
}
