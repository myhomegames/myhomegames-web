import { isServerSkinId } from "./skinIds";
import { clearCachedSkinWeb } from "./skinWebCache";

const CACHE_ID_KEY = "mhg_skin_css_cache_id";
const CACHE_BODY_KEY = "mhg_skin_css_cache_body";
const CACHE_SCHEMA_KEY = "mhg_skin_css_cache_schema";
/** Bump when skin TV focus/hover contract changes so TVs refetch bundle.css. */
const CACHE_SCHEMA_VERSION = "tv-hover-mirror-1";
/** ~2 MB — avoid filling localStorage with huge bundles */
const MAX_CACHE_CHARS = 2 * 1024 * 1024;

/** True when cached CSS predates Smart TV hover mirror (yellow focus ring still present). */
export function isStaleTvSkinCss(css: string): boolean {
  const body = String(css || "");
  if (!body.trim()) return true;
  if (!body.includes("data-mhg-tv-hover")) return true;
  if (body.includes("Smart TV focus outline") && body.includes("#e5a00d")) return true;
  if (/html\[data-mhg-tv="1"\][\s\S]{0,120}outline:\s*3px\s+solid\s+#e5a00d/i.test(body)) {
    return true;
  }
  return false;
}

function readCacheSchema(): string {
  try {
    return localStorage.getItem(CACHE_SCHEMA_KEY) || "";
  } catch {
    return "";
  }
}

function writeCacheSchema(): void {
  try {
    localStorage.setItem(CACHE_SCHEMA_KEY, CACHE_SCHEMA_VERSION);
  } catch {
    /* ignore */
  }
}

/**
 * Last successfully applied server skin CSS (persists across refresh and new sessions).
 * Used from main.tsx for first paint before the async refetch in SkinContext.
 */
export function getCachedSkinCss(skinId: string): string | null {
  if (!skinId || !isServerSkinId(skinId)) return null;
  try {
    if (readCacheSchema() !== CACHE_SCHEMA_VERSION) {
      clearCachedSkinCss();
      return null;
    }
    const cachedId = localStorage.getItem(CACHE_ID_KEY);
    if (cachedId !== skinId) return null;
    const body = localStorage.getItem(CACHE_BODY_KEY);
    if (!body?.trim()) return null;
    if (isStaleTvSkinCss(body)) {
      clearCachedSkinCss();
      return null;
    }
    return body;
  } catch {
    return null;
  }
}

export function setCachedSkinCss(skinId: string, css: string): void {
  if (!skinId || !isServerSkinId(skinId) || !css?.trim()) return;
  if (isStaleTvSkinCss(css)) return;
  if (css.length > MAX_CACHE_CHARS) return;
  try {
    localStorage.setItem(CACHE_ID_KEY, skinId);
    localStorage.setItem(CACHE_BODY_KEY, css);
    writeCacheSchema();
  } catch {
    try {
      localStorage.removeItem(CACHE_BODY_KEY);
      localStorage.removeItem(CACHE_ID_KEY);
      localStorage.removeItem(CACHE_SCHEMA_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function clearCachedSkinCss(): void {
  try {
    localStorage.removeItem(CACHE_ID_KEY);
    localStorage.removeItem(CACHE_BODY_KEY);
    localStorage.removeItem(CACHE_SCHEMA_KEY);
  } catch {
    /* ignore */
  }
  clearCachedSkinWeb();
}
