import { isServerSkinId } from "./skinIds";
import {
  DEFAULT_SKIN_WEB_MANIFEST,
  normalizeSkinWebManifest,
  type SkinWebManifest,
} from "./skinWebManifest";

const CACHE_KEY = "mhg_skin_web_manifest_v2";

type Stored = { skinId: string; web: SkinWebManifest };

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw?.trim()) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const skinId = (parsed as { skinId?: unknown }).skinId;
    const web = (parsed as { web?: unknown }).web;
    if (typeof skinId !== "string" || !isServerSkinId(skinId)) return null;
    return { skinId, web: normalizeSkinWebManifest(web) };
  } catch {
    return null;
  }
}

/** Last known manifest for the active skin (before GET /skins resolves). */
export function getCachedSkinWeb(skinId: string): SkinWebManifest | null {
  if (!skinId || !isServerSkinId(skinId)) return null;
  const s = readStored();
  if (!s || s.skinId !== skinId) return null;
  return s.web;
}

export function setCachedSkinWeb(skinId: string, web: SkinWebManifest): void {
  if (!skinId || !isServerSkinId(skinId)) return;
  const normalized = normalizeSkinWebManifest(web);
  try {
    const payload: Stored = { skinId, web: normalized };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function clearCachedSkinWeb(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** For callers that only have an id before list load (e.g. first paint). */
export function getCachedSkinWebOrDefault(skinId: string): SkinWebManifest {
  return getCachedSkinWeb(skinId) ?? DEFAULT_SKIN_WEB_MANIFEST;
}
