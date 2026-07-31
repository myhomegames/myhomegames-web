import { isSmartTvBrowser } from "./smartTv";

/** Mirrors `:hover` in skin CSS on Smart TV (see myhomegames-skins bundle rules). */
export const SMART_TV_HOVER_ATTR = "data-mhg-tv-hover";

const STRIP_FOCUS_ATTR = "data-mhg-strip-focus";
const SELECTED_CLASS = "mhg-cover-scale-selected";

const HOVER_MIRROR_SELECTOR =
  ".cover-hover-effect, .games-list-item, .tag-list-item, .collections-list-item, .fixed-focal-games-item, .fixed-focal-tag-item, .fixed-focal-collections-item, .fixed-focal-recommended-strip-item";

function shouldMirrorFocusHover(el: HTMLElement): boolean {
  if (!el || el === document.body || el === document.documentElement) return false;
  if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

function markHoverMirror(el: HTMLElement): void {
  el.setAttribute(SMART_TV_HOVER_ATTR, "true");
  el.querySelectorAll<HTMLElement>(HOVER_MIRROR_SELECTOR).forEach((node) => {
    node.setAttribute(SMART_TV_HOVER_ATTR, "true");
  });
  const focal = el.closest<HTMLElement>(
    ".fixed-focal-games-item, .fixed-focal-tag-item, .fixed-focal-collections-item, .fixed-focal-recommended-strip-item",
  );
  if (focal && focal !== el) {
    markHoverMirror(focal);
  }
}

function clearHoverMirror(el: HTMLElement): void {
  el.removeAttribute(SMART_TV_HOVER_ATTR);
  el.style.removeProperty("outline");
  el.style.removeProperty("outline-offset");
}

function suppressTvFocusRing(el: HTMLElement): void {
  // Plex / GOG (and similar) use outline / drop-shadow as the :hover look — do not wipe it.
  if (
    el.classList.contains("cover-hover-effect") ||
    el.classList.contains("games-list-cover") ||
    el.classList.contains("games-list-item") ||
    el.classList.contains("tag-list-item") ||
    el.classList.contains("collections-list-item") ||
    el.classList.contains("fixed-focal-games-item") ||
    el.classList.contains("fixed-focal-tag-item") ||
    el.classList.contains("fixed-focal-collections-item") ||
    el.classList.contains("fixed-focal-recommended-strip-item") ||
    el.classList.contains("mhg-logo-button") ||
    el.classList.contains("mhg-top-right-tool-dock-logo")
  ) {
    return;
  }
  el.style.setProperty("outline", "none", "important");
  el.style.setProperty("outline-offset", "0", "important");
}

/** Keep hover styling on fixed-focal / scale-selected tiles without DOM focus. */
export function syncSmartTvSelectionHover(
  enabled: boolean = isSmartTvBrowser(),
): void {
  if (!enabled || typeof document === "undefined") return;

  const focused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  document.querySelectorAll<HTMLElement>(`.${SELECTED_CLASS}`).forEach((el) => {
    markHoverMirror(el);
  });

  document.querySelectorAll<HTMLElement>(`[${STRIP_FOCUS_ATTR}]`).forEach((el) => {
    markHoverMirror(el);
  });

  document.querySelectorAll<HTMLElement>(`[${SMART_TV_HOVER_ATTR}]`).forEach((el) => {
    if (el.classList.contains(SELECTED_CLASS)) return;
    if (el.hasAttribute(STRIP_FOCUS_ATTR)) return;
    if (el === focused) return;
    clearHoverMirror(el);
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
    markHoverMirror(el);
    suppressTvFocusRing(el);
  };

  const onFocusOut = (e: FocusEvent) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (el.classList.contains(SELECTED_CLASS)) return;
    if (el.hasAttribute(STRIP_FOCUS_ATTR)) return;
    clearHoverMirror(el);
    scheduleSelectionSync();
  };

  document.addEventListener("focusin", onFocusIn, true);
  document.addEventListener("focusout", onFocusOut, true);

  selectionObserver = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type !== "attributes") continue;
      if (record.attributeName !== "class" && record.attributeName !== STRIP_FOCUS_ATTR) {
        continue;
      }
      const target = record.target;
      if (!(target instanceof HTMLElement)) continue;
      if (
        target.classList.contains(SELECTED_CLASS) ||
        target.hasAttribute(STRIP_FOCUS_ATTR) ||
        (record.attributeName === "class" &&
          typeof record.oldValue === "string" &&
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
    attributeFilter: ["class", STRIP_FOCUS_ATTR],
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
      clearHoverMirror(el);
    });
  };
}
