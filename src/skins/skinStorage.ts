import { isServerSkinId } from "./skinIds";

const STORAGE_ACTIVE_SKIN = "mhg_active_skin_id";
/** Legacy key from browser-only skins; cleared on read. */
const LEGACY_CUSTOM_SKINS = "mhg_custom_skins_v1";
const LEGACY_EMPTY_SKIN_ID = "builtin-empty";

export function getActiveSkinId(): string {
  const v = localStorage.getItem(STORAGE_ACTIVE_SKIN);
  if (!v || !v.trim()) return "";
  const trimmed = v.trim();
  if (trimmed.startsWith("custom-")) {
    localStorage.removeItem(STORAGE_ACTIVE_SKIN);
    localStorage.removeItem(LEGACY_CUSTOM_SKINS);
    return "";
  }
  if (trimmed === LEGACY_EMPTY_SKIN_ID) {
    localStorage.setItem(STORAGE_ACTIVE_SKIN, "");
    return "";
  }
  if (isServerSkinId(trimmed)) return trimmed;
  localStorage.removeItem(STORAGE_ACTIVE_SKIN);
  return "";
}

export function setActiveSkinId(id: string): void {
  localStorage.setItem(STORAGE_ACTIVE_SKIN, id);
}
