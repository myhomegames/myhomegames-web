import { BUILTIN_SKIN_PLEX_ID } from "./skinIds";

const STORAGE_CUSTOM_SKINS = "mhg_custom_skins_v1";
const STORAGE_ACTIVE_SKIN = "mhg_active_skin_id";

export type CustomSkinRecord = {
  id: string;
  name: string;
  css: string;
  createdAt: number;
};

export const MAX_CUSTOM_SKINS = 24;
export const MAX_SKIN_CSS_CHARS = 600_000;

function safeParseSkins(raw: string | null): CustomSkinRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CustomSkinRecord =>
        x &&
        typeof x === "object" &&
        typeof (x as CustomSkinRecord).id === "string" &&
        typeof (x as CustomSkinRecord).name === "string" &&
        typeof (x as CustomSkinRecord).css === "string" &&
        typeof (x as CustomSkinRecord).createdAt === "number"
    );
  } catch {
    return [];
  }
}

export function getCustomSkins(): CustomSkinRecord[] {
  return safeParseSkins(localStorage.getItem(STORAGE_CUSTOM_SKINS));
}

export function setCustomSkins(skins: CustomSkinRecord[]): void {
  localStorage.setItem(STORAGE_CUSTOM_SKINS, JSON.stringify(skins));
}

export function getActiveSkinId(): string {
  const v = localStorage.getItem(STORAGE_ACTIVE_SKIN);
  return v && v.trim() ? v.trim() : BUILTIN_SKIN_PLEX_ID;
}

export function setActiveSkinId(id: string): void {
  localStorage.setItem(STORAGE_ACTIVE_SKIN, id);
}

export function addCustomSkin(name: string, css: string): CustomSkinRecord {
  const trimmed = css.trim();
  if (!trimmed) {
    throw new Error("empty_css");
  }
  if (trimmed.length > MAX_SKIN_CSS_CHARS) {
    throw new Error("css_too_large");
  }
  const list = getCustomSkins();
  if (list.length >= MAX_CUSTOM_SKINS) {
    throw new Error("too_many_skins");
  }
  const id = `custom-${crypto.randomUUID()}`;
  const record: CustomSkinRecord = {
    id,
    name: name.trim() || "Custom",
    css: trimmed,
    createdAt: Date.now(),
  };
  setCustomSkins([...list, record]);
  return record;
}

export function removeCustomSkin(id: string): void {
  const list = getCustomSkins().filter((s) => s.id !== id);
  setCustomSkins(list);
  if (getActiveSkinId() === id) {
    setActiveSkinId(BUILTIN_SKIN_PLEX_ID);
  }
}

export function getCustomSkinCss(id: string): string | null {
  const s = getCustomSkins().find((x) => x.id === id);
  return s?.css ?? null;
}
