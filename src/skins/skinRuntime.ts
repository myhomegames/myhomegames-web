import { ensureOverlayStackStyles } from "../styles/overlayStack";
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
  ensureOverlayStackStyles();
}
