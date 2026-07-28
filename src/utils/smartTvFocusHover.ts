import { isSmartTvBrowser } from "./smartTv";

/** Mirrors `:hover` in skin CSS on Smart TV (see myhomegames-skins bundle rules). */
export const SMART_TV_HOVER_ATTR = "data-mhg-tv-hover";

const STRIP_FOCUS_ATTR = "data-mhg-strip-focus";
const SELECTED_CLASS = "mhg-cover-scale-selected";

function isLogoButton(el: HTMLElement): boolean {
  return (
    el.classList.contains("mhg-logo-button") ||
    el.classList.contains("mhg-top-right-tool-dock-logo")
  );
}

function shouldMirrorFocusHover(el: HTMLElement): boolean {
  if (!el || el === document.body || el === document.documentElement) return false;
  if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
  if (isLogoButton(el)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

/** Keep hover styling on fixed-focal / scale-selected tiles without DOM focus. */
export function syncSmartTvSelectionHover(
  enabled: boolean = isSmartTvBrowser(),
): void {
  if (!enabled || typeof document === "undefined") return;

  const focused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  document.querySelectorAll<HTMLElement>(`.${SELECTED_CLASS}`).forEach((el) => {
    el.setAttribute(SMART_TV_HOVER_ATTR, "true");
  });

  document.querySelectorAll<HTMLElement>(`[${SMART_TV_HOVER_ATTR}]`).forEach((el) => {
    if (el.classList.contains(SELECTED_CLASS)) return;
    if (el === focused) return;
    if (el.hasAttribute(STRIP_FOCUS_ATTR)) return;
    el.removeAttribute(SMART_TV_HOVER_ATTR);
  });
}

/**
 * Smart TV: show skin `:hover` styling for the focused or selected item instead of
 * the legacy yellow focus ring (`outline: 3px solid #e5a00d` in older skin bundles).
 */
export function installSmartTvFocusHoverMirror(
  enabled: boolean = isSmartTvBrowser(),
): () => void {
  if (!enabled || typeof document === "undefined") return () => {};

  let selectionObserver: MutationObserver | null = null;
  let selectionSyncTimer = 0;

  const scheduleSelectionSync = () => {
    window.clearTimeout(selectionSyncTimer);
    selectionSyncTimer = window.setTimeout(() => syncSmartTvSelectionHover(true), 0);
  };

  const onFocusIn = (e: FocusEvent) => {
    const el = e.target;
    if (!(el instanceof HTMLElement) || !shouldMirrorFocusHover(el)) return;
    el.setAttribute(SMART_TV_HOVER_ATTR, "true");
  };

  const onFocusOut = (e: FocusEvent) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (el.classList.contains(SELECTED_CLASS)) return;
    if (el.hasAttribute(STRIP_FOCUS_ATTR)) return;
    el.removeAttribute(SMART_TV_HOVER_ATTR);
    scheduleSelectionSync();
  };

  document.addEventListener("focusin", onFocusIn, true);
  document.addEventListener("focusout", onFocusOut, true);

  selectionObserver = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type !== "attributes" || record.attributeName !== "class") continue;
      const target = record.target;
      if (!(target instanceof HTMLElement)) continue;
      if (
        target.classList.contains(SELECTED_CLASS) ||
        (typeof record.oldValue === "string" &&
          record.oldValue.includes(SELECTED_CLASS))
      ) {
        scheduleSelectionSync();
        return;
      }
    }
  });
  selectionObserver.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
    attributeOldValue: true,
  });

  scheduleSelectionSync();

  return () => {
    document.removeEventListener("focusin", onFocusIn, true);
    document.removeEventListener("focusout", onFocusOut, true);
    selectionObserver?.disconnect();
    selectionObserver = null;
    window.clearTimeout(selectionSyncTimer);
    document.querySelectorAll<HTMLElement>(`[${SMART_TV_HOVER_ATTR}]`).forEach((el) => {
      el.removeAttribute(SMART_TV_HOVER_ATTR);
    });
  };
}
