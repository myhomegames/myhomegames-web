import gameDetailResponsiveCss from "../styles/game-detail-responsive.css?raw";
import { SKIN_STYLE_ELEMENT_ID } from "./skinRuntime";

export const LAYOUT_OVERRIDE_STYLE_ELEMENT_ID = "mhg-layout-overrides";

/** Layout rules that must win over skin bundle CSS (appended after the skin style tag). */
export function applyLayoutOverrideCss(): void {
  let el = document.getElementById(LAYOUT_OVERRIDE_STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = LAYOUT_OVERRIDE_STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }

  el.textContent = gameDetailResponsiveCss;

  const skinEl = document.getElementById(SKIN_STYLE_ELEMENT_ID);
  if (skinEl && el.previousElementSibling !== skinEl) {
    document.head.appendChild(el);
  }
}
