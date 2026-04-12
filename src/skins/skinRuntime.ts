import { BUILTIN_SKIN_EMPTY_ID, BUILTIN_SKIN_PLEX_ID } from "./skinIds";
import { getActiveSkinId, getCustomSkinCss } from "./skinStorage";

export const SKIN_STYLE_ELEMENT_ID = "mhg-active-skin-bundle";

export type BundledSkinCss = {
  plex: string;
  empty: string;
};

export function getSkinStyleElement(): HTMLStyleElement {
  let el = document.getElementById(SKIN_STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = SKIN_STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }
  return el;
}

/**
 * Apply theme CSS. Call with bundled Plex string on startup; when a custom skin is active, pass its CSS instead.
 */
export function applySkinCss(css: string): void {
  const el = getSkinStyleElement();
  el.textContent = css;
  const active = getActiveSkinId();
  document.documentElement.dataset.mhgSkin =
    active === BUILTIN_SKIN_PLEX_ID ? "plex" : active === BUILTIN_SKIN_EMPTY_ID ? "empty" : "custom";
}

/**
 * Resolve active skin from storage and apply bundled built-ins or custom CSS.
 */
export function applyActiveSkinFromStorage(bundled: BundledSkinCss): void {
  const active = getActiveSkinId();
  if (active === BUILTIN_SKIN_PLEX_ID) {
    applySkinCss(bundled.plex);
    return;
  }
  if (active === BUILTIN_SKIN_EMPTY_ID) {
    applySkinCss(bundled.empty);
    return;
  }
  const custom = getCustomSkinCss(active);
  if (custom != null) {
    applySkinCss(custom);
  } else {
    applySkinCss(bundled.plex);
  }
}
