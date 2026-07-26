/** Query flag Moonlight Web understands after MHG patches stream.js. */
export const MOONLIGHT_TV_PROFILE = "tv";

const SMART_TV_UA_RE =
  /tizen|webos|web0s|smart-tv|smarttv|viera|bravia|hbbtv|vidaa|netcast|appletv|crkey|aftb|aftt|aftm|afts|aftn|googletv|google tv|android tv|androidtv|chromecast|nvidia shield|shield android tv|mibox|mi box|smart.?tv/;

/**
 * True for Smart TV / set-top / Android TV browsers (Tizen, webOS, Google TV, etc.).
 * Used to apply a lower Moonlight stream profile, prefer top-level navigation,
 * and enable TV-friendly focus styles.
 */
export function isSmartTvBrowser(
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean {
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
