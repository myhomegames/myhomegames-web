/**
 * Discrete horizontal steps across the LibrariesBar icon strip (PS3 / XMB-style).
 * List-driving controls are auto-selected (click); other strip icons only receive focus/scroll.
 */

import { centerStripTileInStripViewport } from "./librariesStripScroll";
import { playFixedFocalStepSound } from "./fixedFocalStepSound";
import { SMART_TV_HOVER_ATTR } from "./smartTvFocusHover";

const STRIP_FOCUS_ATTR = "data-mhg-strip-focus";

function stripStepSoundEnabled(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-mhg-fixed-focal-step-sound") === "true";
}

function playStripStepSoundIfEnabled(): void {
  if (stripStepSoundEnabled()) playFixedFocalStepSound();
}

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
      if (!el.classList.contains("mhg-cover-scale-selected")) {
        el.removeAttribute(SMART_TV_HOVER_ATTR);
      }
    });
}

function setStripFocus(el: HTMLElement): void {
  clearStripFocus(el);
  el.setAttribute(STRIP_FOCUS_ATTR, "true");
  el.setAttribute(SMART_TV_HOVER_ATTR, "true");
  const row = el.closest<HTMLElement>(".mhg-libraries-container");
  if (row) {
    // Strip-only snap: do not move the vertical list anchor (CSS icon vars stay on .mhg-library-active).
    centerStripTileInStripViewport(row, el);
    row.style.overflowX = "hidden";
  }
  // Keep DOM focus on the snapped icon so TV Enter activates it (not the previous .mhg-library-active).
  try {
    el.focus({ preventScroll: true });
  } catch {
    try {
      el.focus();
    } catch {
      /* ignore */
    }
  }
}

/** Icon currently snapped in the PS3/XMB strip without auto-opening (Add Game, Settings, …). */
export function getStripFocusTarget(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`.mhg-libraries-container [${STRIP_FOCUS_ATTR}]`);
}

/**
 * Activate the strip-focused icon (Enter/OK on Smart TV).
 * @returns true if a strip-focus target was clicked
 */
export function activateStripFocusTarget(): boolean {
  const el = getStripFocusTarget();
  if (!el || typeof el.click !== "function") return false;
  clearStripFocus();
  el.click();
  try {
    el.focus({ preventScroll: true });
  } catch {
    try {
      el.focus();
    } catch {
      /* ignore */
    }
  }
  return true;
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
    // Reachable with the same discrete snap as libraries, but do not auto-activate.
    playStripStepSoundIfEnabled();
    setStripFocus(el);
  }
  return true;
}
