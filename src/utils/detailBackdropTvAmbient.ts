import { isSmartTvBrowser } from "./smartTv";

export type DetailBackdropVariant = "tv" | "narrow" | "wide";

const NARROW_DETAIL_MQ = "(max-width: 720px)";

function isTvBackdropContext(): boolean {
  if (typeof document !== "undefined" && document.documentElement.dataset.mhgTv === "1") {
    return true;
  }
  return isSmartTvBrowser();
}

/**
 * Smart TV: when false, skip the ambient blur fill layer (full-bleed / wide layout).
 * Non-TV clients keep ambient fill unless `ambientFill` is false on BackgroundManager.
 */
export function resolveDetailBackdropAmbientFill(
  tvDetailBackdropAmbient: boolean,
  ambientFill = true,
): boolean {
  if (!ambientFill) return false;
  if (isTvBackdropContext() && !tvDetailBackdropAmbient) return false;
  return true;
}

/** Detail backdrop DOM variant — TV crop + ambient only when the skin flag is on. */
export function resolveDetailBackdropVariant(
  tvDetailBackdropAmbient: boolean,
): DetailBackdropVariant {
  if (isTvBackdropContext()) {
    return tvDetailBackdropAmbient ? "tv" : "wide";
  }
  if (typeof window !== "undefined" && window.matchMedia(NARROW_DETAIL_MQ).matches) {
    return "narrow";
  }
  return "wide";
}
