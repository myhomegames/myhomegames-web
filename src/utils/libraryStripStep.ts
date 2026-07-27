/**
 * Discrete horizontal steps across the LibrariesBar icon strip (PS3 / XMB-style).
 * List-driving controls are auto-selected (click); other strip icons only receive focus/scroll.
 */

const STRIP_FOCUS_ATTR = "data-mhg-strip-focus";

/** Strip controls that drive a content list (library page, collection shortcut, …). */
function hasStripList(el: HTMLElement): boolean {
  return el.hasAttribute("data-mhg-strip-has-list");
}

export function isHorizontalLibraryStripMode(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.getAttribute("data-mhg-vertical-cover-alignment") !== "true") {
    return false;
  }
  // Vertical sidebar layouts use a different nav model.
  if (document.querySelector("[data-mhg-library-pages-vertical-list]")) {
    return false;
  }
  return Boolean(document.querySelector(".mhg-libraries-container"));
}

function isVisibleStripControl(el: HTMLElement): boolean {
  if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2;
}

function collectStripStepTargets(): HTMLElement[] {
  const row =
    document.querySelector<HTMLElement>(".mhg-libraries-bar .mhg-libraries-container") ??
    document.querySelector<HTMLElement>(".mhg-libraries-container");
  if (!row) return [];
  if (row.closest("[data-mhg-library-pages-vertical-list]")) return [];

  return Array.from(
    row.querySelectorAll<HTMLElement>(".mhg-library-button, .mhg-collection-shortcut-button"),
  ).filter(isVisibleStripControl);
}

function clearStripFocus(except?: HTMLElement | null): void {
  document
    .querySelectorAll<HTMLElement>(`.mhg-libraries-container [${STRIP_FOCUS_ATTR}]`)
    .forEach((el) => {
      if (except && el === except) return;
      el.removeAttribute(STRIP_FOCUS_ATTR);
    });
}

function setStripFocus(el: HTMLElement): void {
  clearStripFocus(el);
  el.setAttribute(STRIP_FOCUS_ATTR, "true");
  try {
    el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  } catch {
    /* jsdom / older browsers */
  }
}

function activeStripIndex(targets: HTMLElement[]): number {
  const focused = targets.findIndex((el) => el.hasAttribute(STRIP_FOCUS_ATTR));
  if (focused >= 0) return focused;
  const idx = targets.findIndex(
    (el) =>
      el.classList.contains("mhg-library-active") ||
      el.classList.contains("mhg-collection-shortcut-button--selected"),
  );
  return idx >= 0 ? idx : 0;
}

/**
 * @param direction 1 = next (right), -1 = previous (left)
 * @returns true if the strip focus moved
 */
export function stepLibraryStrip(direction: 1 | -1): boolean {
  if (typeof document === "undefined") return false;
  if (!isHorizontalLibraryStripMode()) return false;

  const targets = collectStripStepTargets();
  if (targets.length === 0) return false;

  const current = activeStripIndex(targets);
  const next = current + direction;
  if (next < 0 || next >= targets.length) return false;
  if (next === current) return false;

  const el = targets[next];
  if (!el) return false;

  if (hasStripList(el)) {
    clearStripFocus();
    el.click();
  } else {
    // Reachable for scroll/focus, but do not auto-activate (Add game, Settings, …).
    setStripFocus(el);
  }
  return true;
}
