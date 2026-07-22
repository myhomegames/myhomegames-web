/** Query flag Moonlight Web understands after MHG patches stream.js. */
export const MOONLIGHT_TV_PROFILE = "tv";

const SMART_TV_UA_RE =
  /tizen|webos|web0s|smart-tv|smarttv|viera|bravia|hbbtv|vidaa|netcast|appletv|crkey|aftb|aftt|aftm|googletv/;

/**
 * True for Smart TV / set-top browsers (Tizen, webOS, etc.).
 * Used to apply a lower Moonlight stream profile and prefer top-level navigation.
 */
export function isSmartTvBrowser(
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean {
  return SMART_TV_UA_RE.test(String(userAgent || "").toLowerCase());
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
