/** Query flag Moonlight Web understands after MHG patches stream.js. */
export const MOONLIGHT_TV_PROFILE = "tv";

/** sessionStorage key: keep desktop `?mhgTv=1` force for the tab after SPA navigations. */
export const MHG_TV_SESSION_KEY = "mhgTvForce";

const SMART_TV_UA_RE =
  /tizen|webos|web0s|smart-tv|smarttv|viera|bravia|hbbtv|vidaa|netcast|appletv|crkey|aftb|aftt|aftm|afts|aftn|googletv|google tv|android tv|androidtv|chromecast|nvidia shield|shield android tv|mibox|mi box|smart.?tv/;

/** Dev-only: force Smart TV mode from `?mhgTv=1`. See DEVELOPMENT.md § “Testing Smart TV behaviour on desktop”. */
export function smartTvForcedFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): boolean {
  try {
    return new URLSearchParams(search).get("mhgTv") === "1";
  } catch {
    return false;
  }
}

/** True when this tab previously loaded with `?mhgTv=1` (SPA navigations drop the query). */
export function isMhgTvSessionForced(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(MHG_TV_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * On full page load: remember `?mhgTv=1` for the tab, or clear the session flag
 * when the URL no longer has it (reload without the query disables TV force).
 */
export function syncMhgTvSessionFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): void {
  if (typeof window === "undefined") return;
  try {
    if (smartTvForcedFromUrl(search)) {
      sessionStorage.setItem(MHG_TV_SESSION_KEY, "1");
    } else {
      sessionStorage.removeItem(MHG_TV_SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function shouldForceSmartTvFromDevFlag(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): boolean {
  return smartTvForcedFromUrl(search) || isMhgTvSessionForced();
}

/**
 * True for Smart TV / set-top / Android TV browsers (Tizen, webOS, Google TV, etc.).
 * Used to apply a lower Moonlight stream profile, prefer top-level navigation,
 * and enable TV-friendly focus styles.
 */
export function isSmartTvBrowser(
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean {
  if (shouldForceSmartTvFromDevFlag()) return true;
  return SMART_TV_UA_RE.test(String(userAgent || "").toLowerCase());
}

/** Mark <html> for CSS (focus rings, larger hit targets) when running on TV. */
export function applySmartTvDocumentFlag(
  enabled: boolean = isSmartTvBrowser(),
  root: HTMLElement | null = typeof document !== "undefined" ? document.documentElement : null,
): void {
  if (!root) return;
  if (enabled) root.dataset.mhgTv = "1";
  else delete root.dataset.mhgTv;
}

/** Append mhgProfile=tv so Moonlight Web can force TV-friendly stream settings. */
export function withMoonlightTvProfile(
  streamUrl: string,
  enabled: boolean = isSmartTvBrowser(),
): string {
  if (!enabled) return streamUrl;
  try {
    const url = new URL(streamUrl);
    url.searchParams.set("mhgProfile", MOONLIGHT_TV_PROFILE);
    return url.toString();
  } catch {
    return streamUrl;
  }
}

/**
 * Ensure `mhgTv=1` stays in the query string while the tab session requires it.
 * Returns null when no URL change is needed.
 */
export function searchWithMhgTvPreserved(search: string): string | null {
  if (!isMhgTvSessionForced() && !smartTvForcedFromUrl(search)) return null;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  if (params.get("mhgTv") === "1") return null;
  params.set("mhgTv", "1");
  const next = params.toString();
  return next ? `?${next}` : "?mhgTv=1";
}
