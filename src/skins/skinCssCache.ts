import { isServerSkinId } from "./skinIds";
import { clearCachedSkinWeb } from "./skinWebCache";

const CACHE_ID_KEY = "mhg_skin_css_cache_id";
const CACHE_BODY_KEY = "mhg_skin_css_cache_body";
/** ~2 MB — avoid filling localStorage with huge bundles */
const MAX_CACHE_CHARS = 2 * 1024 * 1024;

/**
 * Last successfully applied server skin CSS (persists across refresh and new sessions).
 * Used from main.tsx for first paint before the async refetch in SkinContext.
 */
export function getCachedSkinCss(skinId: string): string | null {
  if (!skinId || !isServerSkinId(skinId)) return null;
  try {
    const cachedId = localStorage.getItem(CACHE_ID_KEY);
    if (cachedId !== skinId) return null;
    const body = localStorage.getItem(CACHE_BODY_KEY);
    return body && body.trim() ? body : null;
  } catch {
    return null;
  }
}

export function setCachedSkinCss(skinId: string, css: string): void {
  if (!skinId || !isServerSkinId(skinId) || !css?.trim()) return;
  if (css.length > MAX_CACHE_CHARS) return;
  try {
    localStorage.setItem(CACHE_ID_KEY, skinId);
    localStorage.setItem(CACHE_BODY_KEY, css);
  } catch {
    try {
      localStorage.removeItem(CACHE_BODY_KEY);
      localStorage.removeItem(CACHE_ID_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function clearCachedSkinCss(): void {
  try {
    localStorage.removeItem(CACHE_ID_KEY);
    localStorage.removeItem(CACHE_BODY_KEY);
  } catch {
    /* ignore */
  }
  clearCachedSkinWeb();
}
