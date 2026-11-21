import { syncSmartTvSelectionHover } from "../utils/smartTvFocusHover";
import { isServerSkinId } from "./skinIds";
import { getActiveSkinId } from "./skinStorage";

export const SKIN_STYLE_ELEMENT_ID = "mhg-active-skin-bundle";

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
 * Apply theme CSS from the active server skin, or clear the bundle slot when no skin is selected.
 */
export function applySkinCss(css: string): void {
  const el = getSkinStyleElement();
  el.textContent = css;
  const active = getActiveSkinId();
  document.documentElement.dataset.mhgSkin =
    active && isServerSkinId(active) ? "server" : "none";
  syncSmartTvSelectionHover();
}

/**
 * Temporarily disable the cached skin stylesheet (e.g. ServerUnavailablePage).
 * Skin bundles reset global margin/padding and otherwise break standalone UI shells.
 * Returns a restore function for useEffect cleanup.
 */
export function suspendSkinCss(): () => void {
  const el = getSkinStyleElement();
  const wasDisabled = el.disabled;
  el.disabled = true;
  document.documentElement.dataset.mhgUiOverlay = "reconnect";
  return () => {
    const current =
      (document.getElementById(SKIN_STYLE_ELEMENT_ID) as HTMLStyleElement | null) || el;
    if (current.isConnected) current.disabled = wasDisabled;
    delete document.documentElement.dataset.mhgUiOverlay;
  };
}
