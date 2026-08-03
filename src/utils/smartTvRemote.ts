import { isSmartTvBrowser } from "./smartTv";
import { dispatchCoverLongPress, COVER_LONG_PRESS_MS } from "./coverLongPress";
import {
  activateStripFocusTarget,
  isHorizontalLibraryStripMode,
  stepLibraryStrip,
  stepOverflowingLibraryPagesStrip,
} from "./libraryStripStep";
import { ensureElementVisibleInScrollParents, nudgeScrollParentForDirection } from "./ensureVisibleInScrollParent";
import { playFixedFocalStepSound } from "./fixedFocalStepSound";

/** Tick for OK / Back only — never for D-pad arrow moves. */
function playTvActionSound(): void {
  playFixedFocalStepSound();
}

const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
const KEY_ENTER = 13;

type Direction = "up" | "down" | "left" | "right";
type Zone = "chrome" | "content";

function editableRoot(target: EventTarget | null): HTMLElement | null {
  const el = target as HTMLElement | null;
  return (el?.closest?.("input, textarea, select, [contenteditable='true']") as HTMLElement | null) ?? null;
}

function isTextField(el: HTMLElement): boolean {
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = ((el as HTMLInputElement).type || "text").toLowerCase();
  return ![
    "button",
    "submit",
    "reset",
    "checkbox",
    "radio",
    "file",
    "image",
    "hidden",
    "range",
    "color",
  ].includes(type);
}

function isBackOrEscape(code: number, key: string): boolean {
  return (
    key === "Escape" ||
    key === "Backspace" ||
    key === "BrowserBack" ||
    key === "GoBack" ||
    key === "XF86Back" ||
    code === 27 ||
    code === 10009 || // Tizen Return / Back
    code === 461 // common TV Back
  );
}

/** Remote Back only (not Escape / Backspace) — used for in-app history. */
function isTvHardwareBack(code: number, key: string): boolean {
  return (
    key === "BrowserBack" ||
    key === "GoBack" ||
    key === "XF86Back" ||
    code === 10009 ||
    code === 461
  );
}

function isVisible(el: HTMLElement): boolean {
  if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2;
}

/**
 * Plex Smart TV scales the whole cover tile (`transform: scale(...)` on the item).
 * That inflates getBoundingClientRect() and makes geometric Up/Down fail when rows
 * overlap — measure as if the tile were unscaled.
 */
const COVER_SCALE_TILE_SELECTOR = [
  ".games-list-item--cover-sized",
  ".tag-list-item",
  ".collections-list-item--sized",
  ".collections-list-item.library-item-detail-subcollection-cell",
  ".similar-games-cover-cell",
].join(",");

function mapFocusNavRects(els: Iterable<HTMLElement>): Map<HTMLElement, DOMRect> {
  const list = Array.from(els);
  const tiles = new Set<HTMLElement>();
  for (const el of list) {
    const tile = el.closest(COVER_SCALE_TILE_SELECTOR) as HTMLElement | null;
    if (tile) tiles.add(tile);
  }

  const saved: Array<{ tile: HTMLElement; value: string; priority: string }> = [];
  for (const tile of tiles) {
    if (getComputedStyle(tile).transform === "none") continue;
    saved.push({
      tile,
      value: tile.style.getPropertyValue("transform"),
      priority: tile.style.getPropertyPriority("transform"),
    });
    tile.style.setProperty("transform", "none", "important");
  }

  const map = new Map<HTMLElement, DOMRect>();
  for (const el of list) {
    map.set(el, el.getBoundingClientRect());
  }

  for (const entry of saved) {
    if (entry.value) {
      entry.tile.style.setProperty("transform", entry.value, entry.priority);
    } else {
      entry.tile.style.removeProperty("transform");
    }
  }
  return map;
}

function isLogoButton(el: HTMLElement): boolean {
  return (
    el.classList.contains("mhg-logo-button") ||
    el.classList.contains("mhg-top-right-tool-dock-logo")
  );
}

/**
 * Open modal / right-sheet layers (PS3 and others). When present, D-pad must stay inside
 * and must not step the page strip / fixed-focal rail underneath.
 * Ordered roughly by stacking priority; getActiveUiLayer picks the topmost visible one.
 */
const UI_LAYER_SELECTORS = [
  "[data-mhg-tv-exit-confirm]",
  "[data-mhg-sidebar-search-menu-stack]",
  "[data-mhg-sidebar-search-interaction-shield]",
  "[data-mhg-sidebar-search-dialog]",
  ".dropdown-menu-confirm-overlay",
  ".edit-game-modal-overlay",
  ".edit-collection-modal-overlay",
  ".add-to-collection-modal-overlay",
  ".manage-installation-modal-overlay",
  ".launch-modal-overlay",
  ".add-game-overlay",
  ".game-search-modal-overlay",
  ".media-gallery-lightbox-backdrop",
  ".game-summary-overlay",
  ".game-star-rating-overlay",
  ".dropdown-menu-phone-sheet-overlay",
  "body > .update-notification-popup",
  "body > .add-to-collection-dropdown-menu",
  "body > .additional-executables-dropdown-menu",
  ".filter-popup",
  ".sort-popup",
  ".dropdown-menu-popup",
  ".games-list-toolbar-popup",
  ".view-mode-dropdown--portaled",
  ".view-mode-dropdown",
  ".games-table-column-menu-popup",
  ".profile-dropdown-popup",
  ".franchise-series-dropdown",
] as const;

function isLayerCandidate(el: HTMLElement): boolean {
  if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(el);
  // Do not require pointer-events here — some hosts sit under a none parent.
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2;
}

/** True if this node is itself a known sheet/modal (must never be marked inert). */
function isKnownUiLayerNode(el: HTMLElement): boolean {
  return UI_LAYER_SELECTORS.some((sel) => {
    try {
      return el.matches(sel);
    } catch {
      return false;
    }
  });
}

function isPortaledDropdownSubmenu(el: HTMLElement): boolean {
  return (
    el.classList.contains("add-to-collection-dropdown-menu") ||
    el.classList.contains("additional-executables-dropdown-menu")
  );
}

function readZIndex(el: HTMLElement): number {
  let node: HTMLElement | null = el;
  while (node && node !== document.documentElement) {
    const raw = window.getComputedStyle(node).zIndex;
    if (raw && raw !== "auto") {
      const z = parseInt(raw, 10);
      if (Number.isFinite(z)) return z;
    }
    node = node.parentElement;
  }
  return 0;
}

/** Topmost visible popup/modal layer, or null when the page is unobstructed. */
export function getActiveUiLayer(): HTMLElement | null {
  const candidates: HTMLElement[] = [];
  for (const sel of UI_LAYER_SELECTORS) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      if (isLayerCandidate(el)) candidates.push(el);
    });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    // Nested "Add to" / executables flyouts must win over the parent ⋮ / phone sheet
    // even when a skin leaves their z-index below the overlay.
    const parentMenuOpen = candidates.some(
      (c) =>
        c.classList.contains("dropdown-menu-phone-sheet-overlay") ||
        c.classList.contains("dropdown-menu-popup"),
    );
    const boost = (el: HTMLElement) =>
      parentMenuOpen && isPortaledDropdownSubmenu(el) ? 1_000_000 : 0;
    const zDiff = readZIndex(a) + boost(a) - (readZIndex(b) + boost(b));
    if (zDiff !== 0) return zDiff;
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
  return candidates[candidates.length - 1] ?? null;
}

/** True while a sheet/modal should own the remote (blocks rail/strip behind). */
export function isSmartTvUiLayerOpen(): boolean {
  return getActiveUiLayer() != null;
}

const INERT_MARK = "data-mhg-tv-inert";

/**
 * Mark every sibling along the path from the active layer up to <body> as `inert`
 * so Tizen spatial navigation cannot land on covers / chrome behind the popup.
 * Portaled overlays (exit confirm, Add Game, …) sit on body → `#root` becomes inert.
 */
function syncBackgroundInert(layer: HTMLElement | null): void {
  document.querySelectorAll<HTMLElement>(`[${INERT_MARK}]`).forEach((el) => {
    el.removeAttribute("inert");
    el.removeAttribute(INERT_MARK);
  });
  if (!layer || !layer.isConnected) return;

  let node: HTMLElement | null = layer;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;
      // Portaled submenus share <body> with the phone sheet — never inert them.
      if (isKnownUiLayerNode(sibling)) continue;
      sibling.setAttribute("inert", "");
      sibling.setAttribute(INERT_MARK, "");
    }
    node = parent;
  }
}

/**
 * @param allowTextFields when false, skip inputs/search — used after leaving a field so we
 * never immediately re-focus the same search box (common on pages without library buttons).
 */
function collectFocusables(allowTextFields: boolean, scope?: ParentNode): HTMLElement[] {
  // Keep D-pad inside the open sheet/modal (same idea as exit confirm).
  const root: ParentNode = scope ?? getActiveUiLayer() ?? document;
  const nodes = root.querySelectorAll<HTMLElement>(
    [
      // TV sheets may keep disabled actions focusable so D-pad can leave search inputs.
      "button[data-mhg-tv-focus]:not([tabindex='-1'])",
      "button:not([disabled]):not([tabindex='-1'])",
      "a[href]:not([tabindex='-1'])",
      "[role='button']:not([tabindex='-1'])",
      "input:not([disabled]):not([type='hidden']):not([tabindex='-1'])",
      "select:not([disabled]):not([tabindex='-1'])",
      "[data-mhg-tv-focus]:not([tabindex='-1'])",
      // Sheet rows that are clickable <div>s (⋮ menu, Add to… submenu).
      ".dropdown-menu-item",
      ".add-to-collection-dropdown-item",
      ".additional-executables-dropdown-item",
      ".profile-dropdown-item",
    ].join(","),
  );
  return Array.from(nodes).filter((el) => {
    if (!isVisible(el)) return false;
    if (!allowTextFields && isTextField(el)) return false;
    return true;
  });
}

/** First sensible focus target inside a known UI layer (exit confirm → Cancel). */
function pickPreferredUiLayerFocus(layer: HTMLElement): HTMLElement | null {
  if (layer.hasAttribute("data-mhg-tv-exit-confirm")) {
    const cancel = layer.querySelector<HTMLElement>(".dropdown-menu-confirm-cancel");
    if (cancel && isVisible(cancel)) return cancel;
  }
  // Media lightbox: park on the backdrop; L/R/OK are handled specially (not focus chrome).
  if (
    layer.classList.contains("media-gallery-lightbox-backdrop") ||
    layer.hasAttribute("data-mhg-media-gallery-lightbox")
  ) {
    if (layer.tabIndex < 0 && !layer.hasAttribute("tabindex")) {
      layer.tabIndex = -1;
    }
    return layer;
  }
  if (
    layer.classList.contains("game-summary-overlay") ||
    layer.hasAttribute("data-mhg-game-summary-overlay")
  ) {
    const panel = layer.querySelector<HTMLElement>(".game-summary-overlay-panel");
    if (panel && isVisible(panel)) return panel;
  }
  if (
    layer.classList.contains("game-star-rating-overlay") ||
    layer.hasAttribute("data-mhg-game-star-rating-overlay")
  ) {
    const stars = layer.querySelector<HTMLElement>(".game-star-rating-overlay-stars");
    if (stars && isVisible(stars)) return stars;
    const done = layer.querySelector<HTMLElement>(".game-star-rating-overlay-done");
    if (done && isVisible(done)) return done;
  }
  if (layer.classList.contains("add-game-overlay")) {
    const searchInput = layer.querySelector<HTMLElement>("#add-game-search");
    if (searchInput && isVisible(searchInput)) return searchInput;
    const createTitle = layer.querySelector<HTMLElement>("#add-game-create-title");
    if (createTitle && isVisible(createTitle)) return createTitle;
  }
  // Cover / ⋮ action sheet / portaled submenu: prefer a real menu row over chrome.
  if (
    layer.classList.contains("dropdown-menu-phone-sheet-overlay") ||
    layer.classList.contains("dropdown-menu-popup") ||
    layer.classList.contains("edit-game-modal-overlay") ||
    layer.classList.contains("filter-popup") ||
    layer.classList.contains("sort-popup") ||
    layer.classList.contains("profile-dropdown-popup") ||
    isPortaledDropdownSubmenu(layer)
  ) {
    const menuItems = collectMenuListItems(layer);
    if (menuItems[0]) return menuItems[0];
  }
  const items = collectFocusables(true, layer);
  return items[0] ?? null;
}

let focusActiveUiLayerImpl: (() => boolean) | null = null;

/** Retry focus steal into the topmost sheet/modal (e.g. after React portals mount). */
export function requestSmartTvUiLayerFocus(): void {
  const attempt = () => focusActiveUiLayerImpl?.() ?? false;
  attempt();
  for (const delay of [0, 50, 150, 300]) {
    window.setTimeout(attempt, delay);
  }
}

function center(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function defaultChromeTarget(): HTMLElement | null {
  const items = collectFocusables(false);
  if (items.length === 0) return null;
  // Inside a sheet/modal: first focusable in that layer (not page chrome).
  if (getActiveUiLayer()) {
    return items[0] ?? null;
  }
  // Profile: land on Disconnect tunnel (only page action) instead of the libraries tab.
  const profileAction = profilePagePrimaryAction();
  if (profileAction && items.includes(profileAction)) {
    return profileAction;
  }
  return (
    items.find((el) => el.classList.contains("mhg-library-active")) ??
    items.find((el) => el.classList.contains("mhg-library-button")) ??
    items.find((el) => el.classList.contains("mhg-sidebar-search-trigger")) ??
    items[0] ??
    null
  );
}

function pickNextInSet(
  items: HTMLElement[],
  current: HTMLElement | null,
  direction: Direction,
): HTMLElement | null {
  if (items.length === 0) return null;
  if (!current || !items.includes(current)) {
    return items[0] ?? null;
  }

  const rects = mapFocusNavRects([current, ...items]);
  const from = rects.get(current) ?? current.getBoundingClientRect();
  const fromC = center(from);
  // Up/Down must clear most of a tile height — tiny dy to a side neighbor is L/R.
  const minVertical = Math.max(24, from.height * 0.4);
  const minHorizontal = Math.max(8, from.width * 0.12);
  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of items) {
    if (el === current) continue;
    const to = rects.get(el) ?? el.getBoundingClientRect();
    const toC = center(to);
    const dx = toC.x - fromC.x;
    const dy = toC.y - fromC.y;

    let primary = 0;
    let orthogonal = 0;
    let aligned = false;

    if (direction === "down") {
      primary = dy;
      orthogonal = Math.abs(dx);
      aligned = dy >= minVertical && orthogonal <= primary * 1.25;
    } else if (direction === "up") {
      primary = -dy;
      orthogonal = Math.abs(dx);
      aligned = -dy >= minVertical && orthogonal <= primary * 1.25;
    } else if (direction === "right") {
      primary = dx;
      orthogonal = Math.abs(dy);
      aligned =
        (dx >= 1 && to.left >= from.left - 4) ||
        (dx >= minHorizontal && orthogonal <= primary * 1.5);
    } else {
      primary = -dx;
      orthogonal = Math.abs(dy);
      aligned =
        (-dx >= 1 && to.right <= from.right + 4) ||
        (-dx >= minHorizontal && orthogonal <= primary * 1.5);
    }

    if (!aligned || primary < 1) continue;
    const score = primary + orthogonal * 0.35;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

/**
 * Same-row L/R among covers by left-edge order. Used when geometric pick misses
 * a neighbor (uneven cover heights / titles) so the first column stays reachable.
 */
function pickCoverInRow(
  covers: HTMLElement[],
  current: HTMLElement,
  direction: "left" | "right",
): HTMLElement | null {
  if (covers.length === 0) return null;
  const rects = mapFocusNavRects([current, ...covers]);
  const fromRect = rects.get(current) ?? current.getBoundingClientRect();
  const fromY = center(fromRect).y;
  const rowTol = Math.max(28, fromRect.height * 0.45);
  const sameRow = covers.filter((el) => {
    const r = rects.get(el) ?? el.getBoundingClientRect();
    return Math.abs(center(r).y - fromY) <= rowTol;
  });
  if (sameRow.length === 0) return null;
  sameRow.sort((a, b) => {
    const ar = rects.get(a) ?? a.getBoundingClientRect();
    const br = rects.get(b) ?? b.getBoundingClientRect();
    return ar.left - br.left;
  });
  let idx = sameRow.indexOf(current);
  if (idx < 0) {
    const fromLeft = fromRect.left;
    idx = sameRow.findIndex((el) => {
      const r = rects.get(el) ?? el.getBoundingClientRect();
      return r.left >= fromLeft - 1;
    });
    if (idx < 0) idx = sameRow.length - 1;
    // Snap to nearest in-row cover when current wasn't in the filtered set.
    if (direction === "left") {
      return idx > 0 ? sameRow[idx - 1]! : sameRow[0]!;
    }
    return idx < sameRow.length - 1 ? sameRow[idx + 1]! : sameRow[sameRow.length - 1]!;
  }
  if (direction === "left") return idx > 0 ? sameRow[idx - 1]! : null;
  return idx < sameRow.length - 1 ? sameRow[idx + 1]! : null;
}

/**
 * Same-column U/D among covers by top-edge order. Keeps Down/Up from sliding
 * sideways to a slightly lower/higher neighbor in the same row.
 */
function pickCoverInColumn(
  covers: HTMLElement[],
  current: HTMLElement,
  direction: "up" | "down",
): HTMLElement | null {
  if (covers.length === 0) return null;
  const rects = mapFocusNavRects([current, ...covers]);
  const fromRect = rects.get(current) ?? current.getBoundingClientRect();
  const fromX = center(fromRect).x;
  const colTol = Math.max(28, fromRect.width * 0.45);
  const sameCol = covers.filter((el) => {
    const r = rects.get(el) ?? el.getBoundingClientRect();
    return Math.abs(center(r).x - fromX) <= colTol;
  });
  if (sameCol.length === 0) return null;
  sameCol.sort((a, b) => {
    const ar = rects.get(a) ?? a.getBoundingClientRect();
    const br = rects.get(b) ?? b.getBoundingClientRect();
    return ar.top - br.top;
  });
  let idx = sameCol.indexOf(current);
  if (idx < 0) {
    const fromTop = fromRect.top;
    idx = sameCol.findIndex((el) => {
      const r = rects.get(el) ?? el.getBoundingClientRect();
      return r.top >= fromTop - 1;
    });
    if (idx < 0) idx = sameCol.length - 1;
    if (direction === "up") {
      return idx > 0 ? sameCol[idx - 1]! : sameCol[0]!;
    }
    return idx < sameCol.length - 1 ? sameCol[idx + 1]! : sameCol[sameCol.length - 1]!;
  }
  if (direction === "up") return idx > 0 ? sameCol[idx - 1]! : null;
  return idx < sameCol.length - 1 ? sameCol[idx + 1]! : null;
}

function pickCoverByDirection(
  covers: HTMLElement[],
  current: HTMLElement,
  direction: Direction,
): HTMLElement | null {
  if (direction === "left" || direction === "right") {
    let next = pickNextInSet(covers, current, direction);
    if (!next) next = pickCoverInRow(covers, current, direction);
    return next;
  }
  // Prefer same-column step so Down/Up never slide to a side neighbor.
  let next = pickCoverInColumn(covers, current, direction);
  if (!next) next = pickNextInSet(covers, current, direction);
  return next;
}

function pickNextFocus(
  current: HTMLElement | null,
  direction: Direction,
  allowTextFields: boolean,
): HTMLElement | null {
  const items = collectFocusables(allowTextFields);
  if (items.length === 0) {
    return allowTextFields ? null : defaultChromeTarget();
  }

  if (!current || !items.includes(current)) {
    return defaultChromeTarget() ?? items[0] ?? null;
  }

  return pickNextInSet(items, current, direction);
}

/** Libraries sidebar / header tabs (GOG vertical list, Plex page tabs). */
function libraryMenuFocusFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  if (
    el.classList.contains("mhg-library-button") ||
    el.classList.contains("mhg-collection-shortcut-button")
  ) {
    return el;
  }
  return el.closest(
    ".mhg-library-button, .mhg-collection-shortcut-button",
  ) as HTMLElement | null;
}

function coverFocusFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  if (el.classList.contains("games-list-cover")) return el;
  return el.closest(".games-list-cover") as HTMLElement | null;
}

function collectLibraryMenuFocusables(): HTMLElement[] {
  const root =
    document.querySelector<HTMLElement>(".mhg-libraries-bar .mhg-libraries-container") ??
    document.querySelector<HTMLElement>(".mhg-libraries-container");
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      ".mhg-library-button, .mhg-collection-shortcut-button",
    ),
  ).filter((el) => isVisible(el) && !isLogoButton(el));
}

/** True when two controls share the same horizontal band (header tab row). */
function isSameVisualRow(a: HTMLElement, b: HTMLElement): boolean {
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  const overlap = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
  const minH = Math.min(ar.height, br.height);
  if (minH > 0 && overlap >= minH * 0.35) return true;
  return Math.abs(center(ar).y - center(br).y) <= 32;
}

/**
 * Focusables on the libraries bar that sit on the same visual row as `from`
 * (page tabs + trailing action icons). Excludes the filter/sort toolbar below.
 */
function collectLibrariesBarRowFocusables(from: HTMLElement): HTMLElement[] {
  const root =
    (from.closest(".mhg-libraries-bar") as HTMLElement | null) ??
    document.querySelector<HTMLElement>(".mhg-libraries-bar");
  if (!root) return [];
  return collectFocusables(false, root).filter(
    (el) =>
      isSameVisualRow(from, el) &&
      !toolbarFocusFrom(el) &&
      !coverFocusFrom(el) &&
      !el.closest(".games-list-toolbar"),
  );
}

/**
 * Full horizontal strip on the libraries bar: page tabs + shell actions
 * (New/Main games, …), left-to-right. Used so Right from the last tab reaches
 * the icons and Left from the icons returns to the tabs.
 */
function collectLibrariesBarHorizontalFocusables(
  from: HTMLElement | null,
): HTMLElement[] {
  const root =
    (from?.closest(".mhg-libraries-bar") as HTMLElement | null) ??
    document.querySelector<HTMLElement>(".mhg-libraries-bar");
  if (!root || !isVisible(root)) return [];

  const seen = new Set<HTMLElement>();
  const items: HTMLElement[] = [];
  const push = (el: HTMLElement | null | undefined) => {
    if (!el || seen.has(el) || !isVisible(el) || el.closest("[inert]")) return;
    if (!root.contains(el)) return;
    seen.add(el);
    items.push(el);
  };

  collectLibraryMenuFocusables().forEach(push);
  if (from) {
    collectLibrariesBarRowFocusables(from).forEach(push);
  }
  collectShellActionFocusables().forEach(push);

  items.sort(
    (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left,
  );
  return items;
}

function pickHorizontalInLibrariesBar(
  items: HTMLElement[],
  current: HTMLElement | null,
  direction: "left" | "right",
): HTMLElement | null {
  if (items.length === 0) return null;
  if (!current || !items.includes(current)) {
    return direction === "right" ? items[0]! : items[items.length - 1]!;
  }
  const idx = items.indexOf(current);
  if (direction === "right") {
    return idx < items.length - 1 ? items[idx + 1]! : null;
  }
  return idx > 0 ? items[idx - 1]! : null;
}

function collectCoverFocusables(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      ".games-list-cover[role='button'], .games-list-cover[tabindex]",
    ),
  ).filter(
    (el) =>
      isVisible(el) &&
      !el.closest("[inert]") &&
      // Detail hero covers are play/chrome, not library grid tiles.
      !el.closest(
        ".game-detail-cover-wrapper, .catalog-game-detail-cover-wrapper, .library-item-detail-hero-cover",
      ),
  );
}

/** Prefer filter / sort row between libraries chrome and the cover grid. */
function collectToolbarFocusables(): HTMLElement[] {
  const root = document.querySelector<HTMLElement>(".games-list-toolbar");
  if (!root || !isVisible(root)) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(".games-list-toolbar-button:not([disabled])"),
  ).filter((el) => isVisible(el) && !el.closest("[inert]"));
}

function toolbarFocusFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  if (el.classList.contains("games-list-toolbar-button")) {
    return el;
  }
  return el.closest(".games-list-toolbar-button") as HTMLElement | null;
}

const SHELL_ACTION_FOCUS_SELECTOR = [
  ".new-games-toggle-button:not([disabled])",
  ".main-games-toggle-button:not([disabled])",
  ".background-toggle-button:not([disabled])",
  ".view-mode-button:not([disabled]):not(.disabled)",
  ".detail-back-button:not([disabled])",
].join(",");

/**
 * Top-right LibrariesBar / tool-dock actions (New games, Main games, view mode, …).
 * Separate from `.games-list-toolbar` so Library still prefers Tutto/sort first.
 */
function collectShellActionFocusables(): HTMLElement[] {
  const roots = document.querySelectorAll<HTMLElement>(
    ".mhg-libraries-actions, .mhg-top-right-tool-dock, .mhg-libraries-actions-before-main-games",
  );
  const items: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();
  roots.forEach((root) => {
    if (!isVisible(root)) return;
    root.querySelectorAll<HTMLElement>(SHELL_ACTION_FOCUS_SELECTOR).forEach((el) => {
      if (seen.has(el) || !isVisible(el) || el.closest("[inert]")) return;
      seen.add(el);
      items.push(el);
    });
  });
  return items;
}

function shellActionFocusFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  if (
    el.classList.contains("new-games-toggle-button") ||
    el.classList.contains("main-games-toggle-button") ||
    el.classList.contains("background-toggle-button") ||
    el.classList.contains("view-mode-button") ||
    el.classList.contains("detail-back-button")
  ) {
    return el;
  }
  return el.closest(
    [
      ".new-games-toggle-button",
      ".main-games-toggle-button",
      ".background-toggle-button",
      ".view-mode-button",
      ".detail-back-button",
    ].join(","),
  ) as HTMLElement | null;
}

/** Side A–Z index (Plex / GOG) when sort is by title. */
function collectAlphabetFocusables(): HTMLElement[] {
  const root = document.querySelector<HTMLElement>(".alphabet-navigator");
  if (!root || !isVisible(root)) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(".alphabet-button:not([disabled])"),
  ).filter((el) => isVisible(el) && !el.closest("[inert]"));
}

function alphabetFocusFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  if (el.classList.contains("alphabet-button")) return el;
  return el.closest(".alphabet-button") as HTMLElement | null;
}

/** Prefer letter nearest to a cover's vertical center when entering the A–Z strip. */
function pickAlphabetNear(from: HTMLElement | null): HTMLElement | null {
  const letters = collectAlphabetFocusables();
  if (letters.length === 0) return null;
  if (!from) return letters[0] ?? null;
  const fromY = center(from.getBoundingClientRect()).y;
  let best: HTMLElement | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const el of letters) {
    const dist = Math.abs(center(el.getBoundingClientRect()).y - fromY);
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }
  return best ?? letters[0] ?? null;
}

/** Plex / GOG grid navigation (not PS3 fixed-focal strip). */
function isLibraryMenuCoverGridNavMode(): boolean {
  if (isHorizontalLibraryStripMode()) return false;
  // Game / catalog / collection-like detail: LibrariesBar is still mounted, but
  // menu↔covers grid trapping would skip Play / Edit / ⋮ / summary / media.
  if (isItemDetailPage()) return false;
  if (collectLibraryMenuFocusables().length > 0) return true;
  // Tag games (and similar) mount a dock without library tabs — still trap
  // shell actions ↔ toolbar ↔ covers ↔ A–Z the same way as the owned-games library.
  return (
    collectCoverFocusables().length > 0 &&
    Boolean(
      document.querySelector(
        [
          ".games-list-page-fade",
          ".tag-list-container",
          ".fixed-focal-tag-list",
          ".tag-games-page-shell",
          ".home-page-scroll-container .games-list-container",
        ].join(","),
      ),
    )
  );
}

/** Owned / catalog game detail or collection-like detail shell. */
function isItemDetailPage(): boolean {
  return !!document.querySelector(
    [
      ".game-detail-container",
      ".catalog-game-detail-container",
      ".library-item-detail-page-shell",
    ].join(","),
  );
}

function isDetailFocusable(el: HTMLElement): boolean {
  return (
    isVisible(el) &&
    !el.closest("[inert]") &&
    !el.hasAttribute("disabled") &&
    el.getAttribute("tabindex") !== "-1" &&
    el.getAttribute("aria-hidden") !== "true"
  );
}

/**
 * Detail page vertical ladder (Smart TV):
 * header (logo ↔ search ↔ settings) → hide background → stars → Play ↔ toggles ↔ ⋮ → media…
 */
type DetailLadderLevel = "header" | "background" | "stars" | "actions" | "summary";

/** Header row: logo ↔ search ↔ actions (DOM order inside `.mhg-header`). */
function collectDetailHeaderFocusables(): HTMLElement[] {
  const header = document.querySelector<HTMLElement>(".mhg-header");
  if (!header || !isVisible(header)) return [];
  const items: HTMLElement[] = [];
  const push = (el: HTMLElement | null | undefined) => {
    if (el && isDetailFocusable(el) && !items.includes(el)) items.push(el);
  };
  push(header.querySelector<HTMLElement>(".mhg-library-sidebar-toggle"));
  push(header.querySelector<HTMLElement>(".mhg-logo-button"));
  push(
    header.querySelector<HTMLElement>(
      ".mhg-search-input, .mhg-title-filter-input, #search-input",
    ),
  );
  push(header.querySelector<HTMLElement>('.mhg-header-button[data-mhg-header-action="add-game"]'));
  push(header.querySelector<HTMLElement>('.mhg-header-button[data-mhg-header-action="settings"]'));
  push(header.querySelector<HTMLElement>(".profile-dropdown-button"));
  return items;
}

/** Focus target when the active element is an app-header chrome control. */
function appHeaderFocusFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  const items = collectDetailHeaderFocusables();
  if (items.includes(el)) return el;
  for (const item of items) {
    if (item.contains(el)) return item;
  }
  if (!el.closest(".mhg-header")) return null;
  if (
    el.classList.contains("mhg-logo-button") ||
    el.classList.contains("mhg-library-sidebar-toggle") ||
    el.classList.contains("mhg-search-input") ||
    el.classList.contains("mhg-title-filter-input") ||
    el.classList.contains("mhg-header-button") ||
    el.classList.contains("profile-dropdown-button") ||
    el.id === "search-input" ||
    isTextField(el)
  ) {
    return el;
  }
  return null;
}

/** Prefer header control nearest in X to `from` (e.g. Up from a library tab). */
function pickAppHeaderNear(from: HTMLElement | null): HTMLElement | null {
  const items = collectDetailHeaderFocusables();
  if (items.length === 0) return null;
  if (!from) return items[items.length - 1] ?? items[0] ?? null;
  const fromX = center(from.getBoundingClientRect()).x;
  let best: HTMLElement | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const el of items) {
    const dist = Math.abs(center(el.getBoundingClientRect()).x - fromX);
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }
  return best ?? items[items.length - 1] ?? items[0] ?? null;
}

function collectDetailBackgroundFocusables(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".background-toggle-button"),
  ).filter((el) => {
    if (!isDetailFocusable(el)) return false;
    // When the toggle sits beside Play, it belongs to the actions ladder row.
    if (
      el.closest(
        ".game-detail-actions, .catalog-game-detail-actions, .library-item-detail-actions",
      )
    ) {
      return false;
    }
    return true;
  });
}

function collectDetailStarFocusables(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      [
        // TV overlay mode: single focus target for the whole control.
        ".game-detail-ratings .star-rating--overlay-trigger",
        ".catalog-game-detail-ratings .star-rating--overlay-trigger",
        ".library-item-detail-meta .star-rating--overlay-trigger",
        ".star-rating--overlay-trigger[data-mhg-tv-focus]",
        // In-place editing (desktop / skins without tvStarRatingOverlay).
        ".game-detail-ratings .star-rating-star--interactive",
        ".catalog-game-detail-ratings .star-rating-star--interactive",
        ".library-item-detail-meta .star-rating-star--interactive",
        ".star-rating .star-rating-star--interactive",
      ].join(","),
    ),
  ).filter((el) => {
    if (!isDetailFocusable(el)) return false;
    // Prefer the overlay trigger over any nested leftovers.
    if (
      el.classList.contains("star-rating-star--interactive") &&
      el.closest(".star-rating--overlay-trigger")
    ) {
      return false;
    }
    return true;
  });
}

/** Primary actions on detail pages (Play / background / main-games / Edit / ⋮). */
function collectDetailPrimaryFocusables(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      [
        ".game-detail-play-button",
        ".library-item-detail-play-btn",
        ".game-detail-actions .background-toggle-button",
        ".catalog-game-detail-actions .background-toggle-button",
        ".library-item-detail-actions .background-toggle-button",
        ".library-item-detail-actions .main-games-toggle-button",
        ".game-detail-edit-button",
        ".game-detail-dropdown-menu .dropdown-menu-button",
      ].join(","),
    ),
  ).filter(isDetailFocusable);
}

function collectDetailSummaryFocusables(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      [
        ".game-detail-summary .summary-text--toggleable",
        ".catalog-game-detail-summary .summary-text--toggleable",
        ".library-item-detail-summary .summary-text--toggleable",
        ".summary-text--toggleable[data-mhg-tv-focus]",
      ].join(","),
    ),
  ).filter(isDetailFocusable);
}

function collectDetailLadderLevel(level: DetailLadderLevel): HTMLElement[] {
  switch (level) {
    case "header":
      return collectDetailHeaderFocusables();
    case "background":
      return collectDetailBackgroundFocusables();
    case "stars":
      return collectDetailStarFocusables();
    case "actions":
      return collectDetailPrimaryFocusables();
    case "summary":
      return collectDetailSummaryFocusables();
  }
}

function detailLadderLevelOf(el: HTMLElement | null): DetailLadderLevel | null {
  if (!el) return null;
  if (
    el.closest(".mhg-header") &&
    (el.classList.contains("mhg-logo-button") ||
      el.classList.contains("mhg-search-input") ||
      el.classList.contains("mhg-title-filter-input") ||
      el.classList.contains("mhg-header-button") ||
      el.classList.contains("profile-dropdown-button") ||
      el.id === "search-input" ||
      isTextField(el))
  ) {
    return "header";
  }
  if (el.classList.contains("background-toggle-button")) {
    if (
      el.closest(
        ".game-detail-actions, .catalog-game-detail-actions, .library-item-detail-actions",
      )
    ) {
      return "actions";
    }
    return "background";
  }
  if (
    el.closest(".star-rating--overlay-trigger") ||
    el.closest(".star-rating") ||
    el.classList.contains("star-rating-star--interactive")
  ) {
    return "stars";
  }
  if (
    el.closest(".game-detail-actions") ||
    el.closest(".library-item-detail-actions") ||
    el.classList.contains("game-detail-play-button") ||
    el.classList.contains("game-detail-link-executable-button") ||
    el.classList.contains("catalog-game-detail-mark-owned-button") ||
    el.classList.contains("library-item-detail-play-btn") ||
    (!!el.closest(".game-detail-dropdown-menu, .library-item-detail-dropdown-menu") &&
      el.classList.contains("dropdown-menu-button"))
  ) {
    return "actions";
  }
  if (
    el.classList.contains("summary-text--toggleable") ||
    el.classList.contains("summary-toggle")
  ) {
    return "summary";
  }
  return null;
}

const DETAIL_LADDER_ORDER_DEFAULT: DetailLadderLevel[] = [
  "header",
  "background",
  "stars",
  "actions",
  "summary",
];

const DETAIL_LADDER_ORDER_SUMMARY_BEFORE_ACTIONS: DetailLadderLevel[] = [
  "header",
  "background",
  "stars",
  "summary",
  "actions",
];

function detailLadderOrder(): DetailLadderLevel[] {
  if (
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-mhg-tv-summary-before-actions") === "1"
  ) {
    return DETAIL_LADDER_ORDER_SUMMARY_BEFORE_ACTIONS;
  }
  return DETAIL_LADDER_ORDER_DEFAULT;
}

function nextPopulatedDetailLadderLevel(
  from: DetailLadderLevel,
  direction: "up" | "down",
): DetailLadderLevel | null {
  const order = detailLadderOrder();
  const idx = order.indexOf(from);
  if (idx < 0) return null;
  const step = direction === "down" ? 1 : -1;
  for (let i = idx + step; i >= 0 && i < order.length; i += step) {
    const level = order[i]!;
    if (collectDetailLadderLevel(level).length > 0) return level;
  }
  return null;
}

/** Last populated ladder rung (Play or summary, depending on skin order). */
function focusDetailLadderBottom(): boolean {
  const order = detailLadderOrder();
  for (let i = order.length - 1; i >= 0; i--) {
    if (focusDetailLadderLevel(order[i]!, "first")) return true;
  }
  return false;
}

function focusDetailLadderLevel(
  level: DetailLadderLevel,
  prefer: "first" | "last" | HTMLElement | null = "first",
): boolean {
  const items = collectDetailLadderLevel(level);
  if (items.length === 0) return false;
  let target: HTMLElement | null = null;
  if (prefer instanceof HTMLElement && items.includes(prefer)) {
    target = prefer;
  } else if (prefer === "last") {
    target = items[items.length - 1]!;
  } else {
    // Entering header from below: prefer settings. Entering actions from above: Play.
    if (level === "header") {
      target =
        items.find((el) => el.getAttribute("data-mhg-header-action") === "settings") ??
        items[items.length - 1]!;
    } else {
      target = items[0]!;
    }
  }
  if (!target) return false;
  focusElement(target);
  return true;
}

/** True when the header search field should use L/R to leave (detail TV ladder). */
function isDetailHeaderSearchField(field: HTMLElement): boolean {
  return (
    isItemDetailPage() &&
    !!field.closest(".mhg-header") &&
    (field.classList.contains("mhg-search-input") ||
      field.classList.contains("mhg-title-filter-input") ||
      field.id === "search-input")
  );
}

/** Home / library list: header search uses the same L/R / Down escape as detail. */
function isAppHeaderSearchField(field: HTMLElement): boolean {
  return (
    !isItemDetailPage() &&
    !!field.closest(".mhg-header") &&
    (field.classList.contains("mhg-search-input") ||
      field.classList.contains("mhg-title-filter-input") ||
      field.id === "search-input")
  );
}

function isSearchQueryField(field: HTMLElement): boolean {
  return (
    field.classList.contains("mhg-search-input") ||
    field.id === "search-input" ||
    field.getAttribute("role") === "searchbox"
  );
}

/** Open header/sidebar search dropdown rows (recent searches, results, view-all). */
function collectSearchDropdownFocusables(from: HTMLElement | null = null): HTMLElement[] {
  const root =
    (from?.closest(".search-bar-container") as HTMLElement | null) ??
    document.querySelector<HTMLElement>(".search-bar-container:focus-within") ??
    document.querySelector<HTMLElement>(".mhg-header .search-bar-container") ??
    document.querySelector<HTMLElement>("[data-mhg-sidebar-search-dialog] .search-bar-container");
  if (!root) return [];
  const dropdown = root.querySelector<HTMLElement>(
    ".search-dropdown, .mhg-dropdown.search-dropdown",
  );
  if (!dropdown || !isVisible(dropdown)) return [];
  return Array.from(
    dropdown.querySelectorAll<HTMLElement>(
      ".search-dropdown-item, .search-view-all-button",
    ),
  ).filter(
    (el) =>
      isVisible(el) &&
      !el.classList.contains("search-recent-remove") &&
      !el.closest(".search-recent-remove"),
  );
}

function searchDropdownItemFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  if (el.classList.contains("search-view-all-button")) return el;
  const item = el.closest(".search-dropdown-item") as HTMLElement | null;
  if (item && !item.classList.contains("search-recent-remove")) return item;
  return null;
}

function searchInputFromDropdownItem(el: HTMLElement): HTMLElement | null {
  return (
    el
      .closest(".search-bar-container")
      ?.querySelector<HTMLElement>(
        ".mhg-search-input, #search-input, [role='searchbox']",
      ) ?? null
  );
}

/** Screenshot / video strip on game & catalog detail. */
function collectMediaGalleryFocusables(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      ".media-gallery-strip .media-gallery-tile, .media-gallery-strip .media-gallery-thumb-button",
    ),
  ).filter((el) => isVisible(el) && !el.closest("[inert]") && !el.hasAttribute("disabled"));
}

function mediaGalleryFocusFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  if (
    el.classList.contains("media-gallery-tile") ||
    el.classList.contains("media-gallery-thumb-button")
  ) {
    return el;
  }
  return el.closest(
    ".media-gallery-tile, .media-gallery-thumb-button",
  ) as HTMLElement | null;
}

/** Collections / similar (and other) horizontal cover rows on detail pages. */
function detailCoverStripRootFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el || !isItemDetailPage()) return null;
  return el.closest(".scrollable-section") as HTMLElement | null;
}

function collectDetailCoverStripFocusables(strip: HTMLElement): HTMLElement[] {
  return Array.from(
    strip.querySelectorAll<HTMLElement>(
      ".games-list-cover[role='button'], .games-list-cover[tabindex]",
    ),
  ).filter((el) => isVisible(el) && !el.closest("[inert]") && !el.hasAttribute("disabled"));
}

/** Recommended page horizontal keyword strips (not detail carousels). */
function recommendedStripRootFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  const section = el.closest(".scrollable-section") as HTMLElement | null;
  if (!section?.closest(".recommended-page-scroll")) return null;
  return section;
}

function collectRecommendedStripCoverFocusables(strip: HTMLElement): HTMLElement[] {
  return Array.from(
    strip.querySelectorAll<HTMLElement>(
      ".games-list-cover[role='button'], .games-list-cover[tabindex]",
    ),
  ).filter((el) => isVisible(el) && !el.closest("[inert]") && !el.hasAttribute("disabled"));
}

/** Keyword strips on Recommended in DOM order (top → bottom). */
function collectRecommendedStripRoots(): HTMLElement[] {
  const root = document.querySelector(".recommended-page-scroll");
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(".scrollable-section")).filter(
    (section) => collectRecommendedStripCoverFocusables(section).length > 0,
  );
}

/** Up/Down between Recommended keyword rows, keeping roughly the same column. */
function pickCoverInAdjacentRecommendedStrip(
  cover: HTMLElement,
  direction: "up" | "down",
): HTMLElement | null {
  const strips = collectRecommendedStripRoots();
  const currentStrip = recommendedStripRootFrom(cover);
  if (!currentStrip || strips.length === 0) return null;
  const idx = strips.indexOf(currentStrip);
  if (idx < 0) return null;
  const nextIdx = direction === "down" ? idx + 1 : idx - 1;
  if (nextIdx < 0 || nextIdx >= strips.length) return null;
  const nextCovers = collectRecommendedStripCoverFocusables(strips[nextIdx]!);
  if (nextCovers.length === 0) return null;

  const rects = mapFocusNavRects([cover, ...nextCovers]);
  const fromX = center(rects.get(cover) ?? cover.getBoundingClientRect()).x;
  let best: HTMLElement | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const el of nextCovers) {
    const x = center(rects.get(el) ?? el.getBoundingClientRect()).x;
    const dist = Math.abs(x - fromX);
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }
  return best;
}

/**
 * Collection-like detail multi-column grids (subcollections + games).
 * Not `.scrollable-section` carousels — those use the horizontal-strip path.
 */
const DETAIL_GAMES_GRID_SELECTOR =
  ".library-item-detail-games-list, .library-item-detail-subcollections-grid";

function detailGamesGridRootFrom(el: HTMLElement | null): HTMLElement | null {
  if (!el || !isItemDetailPage()) return null;
  return el.closest(DETAIL_GAMES_GRID_SELECTOR) as HTMLElement | null;
}

function collectDetailGamesGridFocusables(grid: HTMLElement): HTMLElement[] {
  return Array.from(
    grid.querySelectorAll<HTMLElement>(
      ".games-list-cover[role='button'], .games-list-cover[tabindex]",
    ),
  ).filter((el) => isVisible(el) && !el.closest("[inert]") && !el.hasAttribute("disabled"));
}

/** Populated detail grids in DOM order (subcollections → games). */
function collectDetailGamesGridRoots(): HTMLElement[] {
  const detailRoot = document.querySelector(".library-item-detail-page-shell");
  if (!detailRoot) return [];
  return Array.from(
    detailRoot.querySelectorAll<HTMLElement>(DETAIL_GAMES_GRID_SELECTOR),
  ).filter((root) => collectDetailGamesGridFocusables(root).length > 0);
}

/** PS3 context-rail collection detail: Up/Down step via fixed-focal events. */
function isDetailFixedFocalGamesList(): boolean {
  return !!document.querySelector(
    [
      ".library-item-detail-page-shell .games-list-container--fixed-focal",
      ".library-item-detail-page-shell .fixed-focal-games-list",
    ].join(","),
  );
}

function focusDetailGamesGrid(
  prefer: "first" | "last" = "first",
  gridIndex: number = 0,
): boolean {
  const grids = collectDetailGamesGridRoots();
  const grid = grids[gridIndex];
  if (!grid) return false;
  const covers = collectDetailGamesGridFocusables(grid);
  if (covers.length === 0) return false;
  const target =
    prefer === "last" ? covers[covers.length - 1]! : covers[0]!;
  focusElement(target);
  return true;
}

type DetailHorizontalStrip =
  | { kind: "media"; items: HTMLElement[] }
  | { kind: "covers"; root: HTMLElement; items: HTMLElement[] };

/** Media gallery + collection/similar rows, top → bottom in DOM order. */
function collectDetailHorizontalStrips(): DetailHorizontalStrip[] {
  const strips: DetailHorizontalStrip[] = [];
  const media = collectMediaGalleryFocusables();
  if (media.length > 0) {
    strips.push({ kind: "media", items: media });
  }
  const detailRoot = document.querySelector(
    ".game-detail-container, .catalog-game-detail-container, .library-item-detail-page-shell",
  );
  if (!detailRoot) return strips;
  detailRoot.querySelectorAll<HTMLElement>(".scrollable-section").forEach((root) => {
    const items = collectDetailCoverStripFocusables(root);
    if (items.length > 0) {
      strips.push({ kind: "covers", root, items });
    }
  });
  return strips;
}

function focusDetailHorizontalStrip(
  strip: DetailHorizontalStrip,
  preferredIndex: number,
): void {
  const items = strip.items;
  if (items.length === 0) return;
  const idx = Math.min(Math.max(0, preferredIndex), items.length - 1);
  focusElement(items[idx]!);
}

/** Vertical list rows inside ⋮ / cover / filter sheets — use DOM order, not geometry. */
function collectMenuListItems(layer: HTMLElement): HTMLElement[] {
  // Nested collection-like "Add to" covers the parent sheet when open — stay inside it.
  const nestedSubmenu = layer.querySelector<HTMLElement>(
    ".dropdown-menu-collectionlike-submenu",
  );
  const scope =
    nestedSubmenu && isVisible(nestedSubmenu) && !isPortaledDropdownSubmenu(layer)
      ? nestedSubmenu
      : layer;

  const nodes = scope.querySelectorAll<HTMLElement>(
    [
      "button.dropdown-menu-item:not([disabled])",
      ".dropdown-menu-item[role='button']",
      ".dropdown-menu-item",
      ".add-to-collection-dropdown-item",
      ".additional-executables-dropdown-item",
      ".profile-dropdown-item",
      ".filter-popup-item",
      ".sort-popup-item",
    ].join(","),
  );
  const seen = new Set<HTMLElement>();
  const items: HTMLElement[] = [];
  nodes.forEach((el) => {
    if (seen.has(el) || !isVisible(el)) return;
    // Skip the submenu trigger row itself when listing nested submenu children.
    if (scope !== layer && el.classList.contains("dropdown-menu-item-with-submenu")) return;
    // While a nested submenu is closed, skip items that live inside one.
    if (
      scope === layer &&
      el.closest(".dropdown-menu-collectionlike-submenu") &&
      el.closest(".dropdown-menu-collectionlike-submenu") !== layer
    ) {
      return;
    }
    seen.add(el);
    items.push(el);
  });
  return items;
}

function closePortaledDropdownSubmenus(): void {
  window.dispatchEvent(new CustomEvent("closeAddToCollectionDropdown"));
  window.dispatchEvent(new CustomEvent("closeAdditionalExecutablesDropdown"));
}

function openFocusedSubmenuRow(row: HTMLElement): void {
  row.click();
  requestSmartTvUiLayerFocus();
}

function pickNextInMenuList(
  layer: HTMLElement,
  current: HTMLElement | null,
  direction: Direction,
): HTMLElement | null {
  if (direction !== "up" && direction !== "down") return null;
  const items = collectMenuListItems(layer);
  if (items.length === 0) return null;
  if (!current || !items.includes(current)) {
    return direction === "down" ? items[0]! : items[items.length - 1]!;
  }
  const idx = items.indexOf(current);
  if (direction === "down") {
    return items[Math.min(items.length - 1, idx + 1)] ?? null;
  }
  return items[Math.max(0, idx - 1)] ?? null;
}

function findDetailPageScrollContainer(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(".game-detail-scroll-container") ??
    document.querySelector<HTMLElement>(".catalog-game-detail-scroll-container") ??
    document.querySelector<HTMLElement>(".library-item-detail-scroll")
  );
}

/**
 * Header / bg toggle live outside the detail scroll pane. Focusing them with
 * preventScroll leaves the content scrolled down — title stays off-screen.
 * Bring the hero/title back into the scroll viewport.
 */
function scrollDetailPageToHero(): void {
  const scroll = findDetailPageScrollContainer();
  if (!scroll) return;

  const hero = scroll.querySelector<HTMLElement>(
    [
      ".game-detail-title",
      ".catalog-game-detail-title",
      ".library-item-detail-title",
      ".game-detail-header",
      ".catalog-game-detail-header",
      ".library-item-detail-hero",
    ].join(","),
  );

  if (hero) {
    const scrollRect = scroll.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const delta = heroRect.top - scrollRect.top - 8;
    if (Math.abs(delta) > 2) {
      const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      scroll.scrollTop = Math.max(0, Math.min(max, scroll.scrollTop + delta));
    }
    return;
  }

  if (scroll.scrollTop > 0) {
    scroll.scrollTop = 0;
  }
}

function focusElement(el: HTMLElement): void {
  // Clickable sheet rows are often <div>s without tabindex — make them programmatically focusable.
  // Prefer tabindex=0 for menu rows so collectFocusables keeps them (button:not([tabindex='-1'])).
  if (!el.hasAttribute("tabindex")) {
    const isMenuRow =
      el.classList.contains("dropdown-menu-item") ||
      el.classList.contains("add-to-collection-dropdown-item") ||
      el.classList.contains("additional-executables-dropdown-item") ||
      el.classList.contains("profile-dropdown-item") ||
      el.classList.contains("filter-popup-item") ||
      el.classList.contains("sort-popup-item");
    if (isMenuRow || el.tabIndex < 0) {
      el.tabIndex = isMenuRow ? 0 : -1;
    }
  }

  // Detail chrome is outside the scroll pane — scroll content back so the title is visible.
  if (isItemDetailPage()) {
    const level = detailLadderLevelOf(el);
    if (level === "header" || level === "background" || level === "stars") {
      scrollDetailPageToHero();
    }
  }

  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  // D-pad uses preventScroll so page jump is controlled; still bring the target into
  // overflow parents (GOG vertical library list, plex/gog cover grids, sheets).
  ensureElementVisibleInScrollParents(el);
  window.requestAnimationFrame(() => {
    if (!el.isConnected) return;
    if (isItemDetailPage()) {
      const level = detailLadderLevelOf(el);
      if (level === "header" || level === "background" || level === "stars") {
        scrollDetailPageToHero();
      }
    }
    ensureElementVisibleInScrollParents(el);
  });
}

function isUnderInertAncestor(el: HTMLElement): boolean {
  let node: HTMLElement | null = el;
  while (node && node !== document.documentElement) {
    if (node.inert) return true;
    node = node.parentElement;
  }
  return false;
}

/** Blur focus trapped inside an `inert` #root when a portaled popup opens on <body>. */
function releaseInertTrappedFocus(): void {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body || active === document.documentElement) return;
  if (isUnderInertAncestor(active)) {
    try {
      active.blur();
    } catch {
      /* ignore */
    }
  }
}

function isUiLayerChrome(el: HTMLElement, layer: HTMLElement): boolean {
  return el === layer;
}

function blurToContent(): void {
  const active = document.activeElement as HTMLElement | null;
  if (active && typeof active.blur === "function") {
    active.blur();
  }
}

function closeSidebarSearchIfOpen(): boolean {
  const closeBtn = document.querySelector<HTMLElement>(
    "[data-mhg-sidebar-search-dialog] .game-search-modal-close",
  );
  if (!closeBtn) return false;
  closeBtn.click();
  return true;
}

function isDismissibleDropdownLayer(layer: HTMLElement): boolean {
  return (
    layer.classList.contains("dropdown-menu-popup") ||
    layer.classList.contains("add-to-collection-dropdown-menu") ||
    layer.classList.contains("additional-executables-dropdown-menu") ||
    layer.classList.contains("profile-dropdown-popup") ||
    layer.classList.contains("view-mode-dropdown") ||
    layer.classList.contains("view-mode-dropdown--portaled") ||
    layer.classList.contains("games-table-column-menu-popup") ||
    layer.classList.contains("filter-popup") ||
    layer.classList.contains("sort-popup") ||
    layer.classList.contains("games-list-toolbar-popup") ||
    layer.classList.contains("franchise-series-dropdown")
  );
}

/** Close a known modal/sheet layer if one is open. */
function tryDismissUiLayer(): boolean {
  const layer = getActiveUiLayer();
  if (layer?.hasAttribute("data-mhg-tv-exit-confirm")) {
    return false;
  }

  // Prefer dismissing the topmost layer (e.g. ⋮ sheet above sidebar search).
  if (layer) {
    if (
      layer.classList.contains("media-gallery-lightbox-backdrop") ||
      layer.hasAttribute("data-mhg-media-gallery-lightbox")
    ) {
      const closeBtn = layer.querySelector<HTMLElement>(
        ".media-gallery-lightbox-icon-btn--close",
      );
      if (closeBtn) {
        closeBtn.click();
      } else {
        layer.click();
      }
      return true;
    }

    if (
      layer.classList.contains("game-summary-overlay") ||
      layer.hasAttribute("data-mhg-game-summary-overlay")
    ) {
      const dismiss = layer.querySelector<HTMLElement>("[data-mhg-modal-close]");
      if (dismiss) {
        dismiss.click();
        return true;
      }
    }

    if (
      layer.classList.contains("game-star-rating-overlay") ||
      layer.hasAttribute("data-mhg-game-star-rating-overlay")
    ) {
      const dismiss = layer.querySelector<HTMLElement>("[data-mhg-modal-close]");
      if (dismiss) {
        dismiss.click();
        return true;
      }
    }

    const closeInLayer = layer.querySelector<HTMLElement>(
      [
        "[aria-label='Close']",
        "[data-mhg-modal-close]",
        ".game-search-modal-close",
      ].join(","),
    );
    if (closeInLayer && isVisible(closeInLayer)) {
      closeInLayer.click();
      return true;
    }

    // Cover / ⋮ menus have no close button and ignore synthetic Escape alone.
    if (isDismissibleDropdownLayer(layer)) {
      // Second-level portaled menus: Back closes only the submenu, not the parent sheet.
      if (isPortaledDropdownSubmenu(layer)) {
        closePortaledDropdownSubmenus();
        window.setTimeout(() => focusActiveUiLayerImpl?.(), 0);
        return true;
      }
      window.dispatchEvent(new CustomEvent("mhg:close-dropdown-menus"));
      closePortaledDropdownSubmenus();
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        }),
      );
      return true;
    }

    if (!layer.hasAttribute("data-mhg-sidebar-search-dialog")) {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        }),
      );

      if (layer.isConnected && isVisible(layer)) {
        document.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }),
        );
      }
      return true;
    }
  }

  if (closeSidebarSearchIfOpen()) return true;

  const closeBtn = document.querySelector<HTMLElement>(
    [
      ".edit-game-modal-overlay [aria-label='Close']",
      ".edit-collection-modal-overlay [aria-label='Close']",
      ".add-game-overlay [aria-label='Close']",
      ".launch-modal-overlay [aria-label='Close']",
      "[data-mhg-modal-close]",
    ].join(","),
  );
  if (closeBtn && isVisible(closeBtn)) {
    closeBtn.click();
    return true;
  }

  return false;
}

function canGoBackInHistory(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof idx === "number") return idx > 0;
  return window.history.length > 1;
}

/** Home under BrowserRouter basename `/app/`. */
function isAppHomePath(): boolean {
  const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  return path === "/app" || path === "/" || path === "/app/index.html";
}

function isProfilePagePath(): boolean {
  const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  return path === "/profile" || path.endsWith("/profile");
}

/** Disconnect tunnel — sole primary action on `/profile`. */
function profilePagePrimaryAction(): HTMLElement | null {
  if (!isProfilePagePath()) return null;
  const btn = document.querySelector<HTMLElement>(
    ".profile-page button.settings-button:not([disabled])",
  );
  return btn && isVisible(btn) ? btn : null;
}

function isExitConfirmOpen(): boolean {
  return Boolean(document.querySelector("[data-mhg-tv-exit-confirm]"));
}

function goBackInApp(): void {
  playTvActionSound();

  // Pages (e.g. StreamPlay) can cancel and handle cleanup themselves.
  const ev = new CustomEvent("mhg:tv-hardware-back", { cancelable: true, bubbles: true });
  window.dispatchEvent(ev);
  if (ev.defaultPrevented) return;

  if (tryDismissUiLayer()) return;

  if (isExitConfirmOpen()) {
    window.dispatchEvent(new CustomEvent("mhg:tv-exit-confirm-cancel"));
    return;
  }

  if (canGoBackInHistory()) {
    window.history.back();
    return;
  }

  // Home (SPA root): ask before closing the Tizen application.
  if (isAppHomePath()) {
    window.dispatchEvent(new CustomEvent("mhg:tv-request-exit"));
  }
}

/**
 * Explicit D-pad navigation for Smart TVs.
 * Tizen spatial nav often gets stuck on the logo / sparse layouts; we move focus ourselves.
 *
 * Zones:
 * - chrome: library / toolbar buttons (geometric focus move)
 * - content: game/collection rail (fixed-focal step events); Left returns to chrome
 */
export function installSmartTvRemoteKeys(
  enabled: boolean = isSmartTvBrowser(),
): () => void {
  if (!enabled || typeof window === "undefined") return () => {};

  let zone: Zone = "chrome";
  let enterPointerDown = false;
  let enterLongPressFired = false;
  let enterLongPressTimer: number | null = null;
  /** Last libraries-menu control focused before jumping to covers (Plex / GOG). */
  let lastLibraryMenuFocus: HTMLElement | null = null;
  /** Last cover focused before returning to the libraries menu. */
  let lastCoverFocus: HTMLElement | null = null;
  /** Last filter/sort toolbar control between menu and covers. */
  let lastToolbarFocus: HTMLElement | null = null;
  /** Last shell action (New games / Main games / view mode) in the libraries dock. */
  let lastShellActionFocus: HTMLElement | null = null;
  /** Last A–Z index letter focused from the cover grid. */
  let lastAlphabetFocus: HTMLElement | null = null;
  /** Last app-header control focused before returning to libraries tabs (Plex). */
  let lastAppHeaderFocus: HTMLElement | null = null;

  const rememberLibraryMenuFocus = (el: HTMLElement | null) => {
    const menu = libraryMenuFocusFrom(el);
    if (menu) lastLibraryMenuFocus = menu;
  };

  const rememberCoverFocus = (el: HTMLElement | null) => {
    const cover = coverFocusFrom(el);
    if (cover) lastCoverFocus = cover;
  };

  const rememberAppHeaderFocus = (el: HTMLElement | null) => {
    const header = appHeaderFocusFrom(el);
    if (header) lastAppHeaderFocus = header;
  };

  const rememberToolbarFocus = (el: HTMLElement | null) => {
    const toolbar = toolbarFocusFrom(el);
    if (toolbar) lastToolbarFocus = toolbar;
  };

  const rememberShellActionFocus = (el: HTMLElement | null) => {
    const action = shellActionFocusFrom(el);
    if (action) lastShellActionFocus = action;
  };

  const rememberAlphabetFocus = (el: HTMLElement | null) => {
    const letter = alphabetFocusFrom(el);
    if (letter) lastAlphabetFocus = letter;
  };

  const resolveLibraryMenuFocus = (): HTMLElement | null => {
    if (lastLibraryMenuFocus?.isConnected && isVisible(lastLibraryMenuFocus)) {
      return lastLibraryMenuFocus;
    }
    const menus = collectLibraryMenuFocusables();
    return (
      menus.find(
        (el) =>
          el.classList.contains("mhg-library-active") ||
          el.classList.contains("mhg-collection-shortcut-button--selected"),
      ) ??
      menus[0] ??
      null
    );
  };

  const resolveCoverFocus = (): HTMLElement | null => {
    if (lastCoverFocus?.isConnected && isVisible(lastCoverFocus)) {
      return lastCoverFocus;
    }
    return collectCoverFocusables()[0] ?? null;
  };

  const resolveToolbarFocus = (): HTMLElement | null => {
    if (lastToolbarFocus?.isConnected && isVisible(lastToolbarFocus)) {
      return lastToolbarFocus;
    }
    return collectToolbarFocusables()[0] ?? null;
  };

  const resolveShellActionFocus = (): HTMLElement | null => {
    if (lastShellActionFocus?.isConnected && isVisible(lastShellActionFocus)) {
      return lastShellActionFocus;
    }
    return collectShellActionFocusables()[0] ?? null;
  };

  const resolveAlphabetFocus = (near: HTMLElement | null = null): HTMLElement | null => {
    if (
      lastAlphabetFocus?.isConnected &&
      isVisible(lastAlphabetFocus) &&
      !lastAlphabetFocus.hasAttribute("disabled")
    ) {
      return lastAlphabetFocus;
    }
    return pickAlphabetNear(near ?? lastCoverFocus);
  };

  const focusLibraryMenu = () => {
    const menu = resolveLibraryMenuFocus();
    if (!menu) return false;
    zone = "chrome";
    focusElement(menu);
    rememberLibraryMenuFocus(menu);
    return true;
  };

  const resolveAppHeaderFocus = (near: HTMLElement | null = null): HTMLElement | null => {
    const items = collectDetailHeaderFocusables();
    if (items.length === 0) return null;
    if (lastAppHeaderFocus?.isConnected && items.includes(lastAppHeaderFocus)) {
      return lastAppHeaderFocus;
    }
    return pickAppHeaderNear(near);
  };

  /** Plex: Up from libraries tabs → app header (logo / search / settings…). */
  const focusAppHeaderZone = (near: HTMLElement | null = null) => {
    const header = resolveAppHeaderFocus(near);
    if (!header) return false;
    zone = "chrome";
    focusElement(header);
    rememberAppHeaderFocus(header);
    return true;
  };

  const focusCoversZone = () => {
    const cover = resolveCoverFocus();
    if (!cover) return false;
    zone = "chrome";
    focusElement(cover);
    rememberCoverFocus(cover);
    return true;
  };

  const focusToolbarZone = () => {
    const toolbar = resolveToolbarFocus();
    if (!toolbar) return false;
    zone = "chrome";
    focusElement(toolbar);
    rememberToolbarFocus(toolbar);
    return true;
  };

  const focusShellActionsZone = () => {
    const action = resolveShellActionFocus();
    if (!action) return false;
    zone = "chrome";
    focusElement(action);
    rememberShellActionFocus(action);
    return true;
  };

  const focusAlphabetZone = (near: HTMLElement | null = null) => {
    const letter = resolveAlphabetFocus(near);
    if (!letter) return false;
    zone = "chrome";
    focusElement(letter);
    rememberAlphabetFocus(letter);
    return true;
  };

  const focusProfilePageAction = () => {
    const action = profilePagePrimaryAction();
    if (!action) return false;
    zone = "chrome";
    focusElement(action);
    return true;
  };

  /**
   * Prefer list toolbar (Tutto / sort), then shell actions (New/Main games),
   * then covers — so Library keeps landing on filter/sort first.
   * On `/profile`, fall through to Disconnect tunnel (no covers/toolbar).
   */
  const focusToolbarOrCovers = () =>
    focusToolbarZone() ||
    focusShellActionsZone() ||
    focusCoversZone() ||
    focusProfilePageAction();

  /** Prefer toolbar / shell actions when leaving the cover grid upward; else libraries menu. */
  const focusToolbarOrMenu = () =>
    focusToolbarZone() || focusShellActionsZone() || focusLibraryMenu();

  const clearEnterLongPressTimer = () => {
    if (enterLongPressTimer != null) {
      window.clearTimeout(enterLongPressTimer);
      enterLongPressTimer = null;
    }
  };

  const isEnterKey = (code: number, key: string): boolean =>
    code === KEY_ENTER ||
    code === 65376 ||
    key === "Enter" ||
    key === " " ||
    key === "Spacebar" ||
    key === "Accept" ||
    key === "Select";

  const enterChrome = (prefer: HTMLElement | null = null) => {
    zone = "chrome";
    const chromeItems = collectFocusables(false);
    const next =
      prefer && chromeItems.includes(prefer) ? prefer : defaultChromeTarget();
    if (next) focusElement(next);
  };

  const enterContent = () => {
    // Never dive into the page rail while a sheet/modal covers it.
    if (getActiveUiLayer()) {
      zone = "chrome";
      focusIntoActiveUiLayer();
      return;
    }
    // Most detail pages have no fixed-focal rail — "content" zone would trap the remote.
    // Collection-like PS3 context rail is the exception (Up/Down step the list).
    if (isItemDetailPage() && !isDetailFixedFocalGamesList()) {
      zone = "chrome";
      return;
    }
    zone = "content";
    blurToContent();
  };

  /** Pull remote focus into the open sheet/modal (and keep it there). */
  const focusIntoActiveUiLayer = (): boolean => {
    const layer = getActiveUiLayer();
    syncBackgroundInert(layer);
    if (!layer) return false;
    zone = "chrome";
    releaseInertTrappedFocus();
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      active !== document.body &&
      active !== document.documentElement &&
      !isUiLayerChrome(active, layer) &&
      layer.contains(active)
    ) {
      return true;
    }
    const next = pickPreferredUiLayerFocus(layer);
    if (next) {
      focusElement(next);
      return true;
    }
    // Last resort — park on layer root until buttons mount.
    if (layer.tabIndex < 0 && !layer.hasAttribute("tabindex")) {
      layer.tabIndex = -1;
    }
    focusElement(layer);
    return true;
  };

  focusActiveUiLayerImpl = focusIntoActiveUiLayer;

  const runEnterShortPress = () => {
    const uiLayer = getActiveUiLayer();
    if (uiLayer) {
      syncBackgroundInert(uiLayer);
    }

    // Media lightbox: OK plays / activates the current video (or confirms viewing).
    if (
      uiLayer &&
      (uiLayer.classList.contains("media-gallery-lightbox-backdrop") ||
        uiLayer.hasAttribute("data-mhg-media-gallery-lightbox"))
    ) {
      playTvActionSound();
      window.dispatchEvent(new CustomEvent("mhg:media-gallery-ok"));
      return;
    }

    if (!uiLayer && isHorizontalLibraryStripMode() && activateStripFocusTarget()) {
      playTvActionSound();
      zone = "chrome";
      return;
    }

    if (zone === "chrome" || uiLayer) {
      const active = document.activeElement as HTMLElement | null;
      const isActivatable =
        !!active &&
        (active.tagName === "BUTTON" ||
          active.tagName === "A" ||
          active.getAttribute("role") === "button" ||
          active.classList.contains("dropdown-menu-item") ||
          active.classList.contains("add-to-collection-dropdown-item") ||
          active.classList.contains("additional-executables-dropdown-item") ||
          active.classList.contains("profile-dropdown-item"));
      if (
        active &&
        active !== document.body &&
        typeof active.click === "function" &&
        (!uiLayer || uiLayer.contains(active)) &&
        isActivatable
      ) {
        playTvActionSound();
        active.click();
        requestSmartTvUiLayerFocus();
        return;
      }
      if (uiLayer) {
        focusIntoActiveUiLayer();
        return;
      }
    }

    if (!uiLayer) {
      playTvActionSound();
      document.dispatchEvent(new CustomEvent("mhg:fixed-focal-activate"));
    }
  };

  const bootstrapTvFocus = () => {
    if (focusIntoActiveUiLayer()) return;
    if (zone === "content") return;
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      active !== document.body &&
      active !== document.documentElement &&
      !isTextField(active) &&
      collectFocusables(false).includes(active)
    ) {
      return;
    }
    // Don't bootstrap onto a search box — that traps the remote on some pages.
    if (active && isTextField(active)) return;
    enterChrome();
  };

  const leaveEditable = (field: HTMLElement, direction: Direction | null) => {
    // Searchbox with open recent/results: Down enters the dropdown list.
    if (direction === "down" && isSearchQueryField(field)) {
      const dropdownItems = collectSearchDropdownFocusables(field);
      if (dropdownItems[0]) {
        zone = "chrome";
        focusElement(dropdownItems[0]);
        return;
      }
    }

    // Detail header search: L/R stay in the logo ↔ search ↔ settings row; Down → bg toggle.
    if (isDetailHeaderSearchField(field) && direction) {
      zone = "chrome";
      const headerItems = collectDetailHeaderFocusables();
      if (direction === "left" || direction === "right") {
        const next = pickNextInSet(headerItems, field, direction);
        if (next) {
          try {
            field.blur();
          } catch {
            /* ignore */
          }
          focusElement(next);
          return;
        }
        return;
      }
      if (direction === "down") {
        try {
          field.blur();
        } catch {
          /* ignore */
        }
        if (focusDetailLadderLevel("background", "first")) return;
        if (focusDetailLadderLevel("stars", "first")) return;
        if (focusDetailLadderLevel("actions", "first")) return;
        return;
      }
      if (direction === "up") {
        // Top of ladder — stay in search.
        return;
      }
    }

    // Plex library list: header search ↔ logo/settings; Down → libraries tabs.
    if (
      isAppHeaderSearchField(field) &&
      direction &&
      isLibraryMenuCoverGridNavMode() &&
      !document.querySelector("[data-mhg-library-pages-vertical-list]")
    ) {
      zone = "chrome";
      const headerItems = collectDetailHeaderFocusables();
      if (direction === "left" || direction === "right") {
        const idx = headerItems.indexOf(field);
        const nextIdx =
          idx >= 0
            ? direction === "right"
              ? Math.min(headerItems.length - 1, idx + 1)
              : Math.max(0, idx - 1)
            : -1;
        const next =
          nextIdx >= 0
            ? headerItems[nextIdx]
            : pickNextInSet(headerItems, field, direction);
        if (next && next !== field) {
          try {
            field.blur();
          } catch {
            /* ignore */
          }
          rememberAppHeaderFocus(next);
          focusElement(next);
          return;
        }
        return;
      }
      if (direction === "down") {
        try {
          field.blur();
        } catch {
          /* ignore */
        }
        if (focusLibraryMenu()) return;
        if (focusToolbarOrCovers()) return;
        return;
      }
      if (direction === "up") return;
    }

    try {
      field.blur();
    } catch {
      /* ignore */
    }

    if (field.closest("[data-mhg-sidebar-search-dialog]")) {
      closeSidebarSearchIfOpen();
      zone = "chrome";
      window.setTimeout(() => enterChrome(), 0);
      return;
    }

    const addGameLayer = field.closest(".add-game-overlay") as HTMLElement | null;
    if (addGameLayer) {
      zone = "chrome";
      const leaveDirection: Direction = direction ?? "down";
      let next = pickNextFocus(field, leaveDirection, false);
      // Below search: land on create title, then create / result rows.
      if (!next && leaveDirection === "down") {
        next = pickNextFocus(field, "down", true);
      }
      if (!next) {
        next =
          addGameLayer.querySelector<HTMLElement>(".add-game-create-btn") ??
          addGameLayer.querySelector<HTMLElement>(".add-game-result-item");
      }
      if (next) {
        focusElement(next);
        return;
      }
      focusElement(field);
      return;
    }

    zone = "chrome";
    const next = direction
      ? pickNextFocus(field, direction, false)
      : defaultChromeTarget();
    if (next) {
      focusElement(next);
    } else {
      enterChrome();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const code = e.keyCode || e.which || 0;
    const key = e.key;
    const field = editableRoot(e.target);

    const isEnter = isEnterKey(code, key);

    if (isEnter && !field) {
      // While a sheet/menu owns the remote, OK must activate the focused row —
      // never start another cover long-press underneath.
      if (getActiveUiLayer()) {
        if (e.repeat) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (!enterPointerDown) {
          enterPointerDown = true;
          enterLongPressFired = false;
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (!enterPointerDown) {
        enterPointerDown = true;
        enterLongPressFired = false;
        clearEnterLongPressTimer();
        enterLongPressTimer = window.setTimeout(() => {
          enterLongPressTimer = null;
          enterLongPressFired = true;
          dispatchCoverLongPress();
        }, COVER_LONG_PRESS_MS);
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Search / inputs: keep Left/Right for caret + on-screen keyboard.
    // Detail header search: L/R also leave so logo ↔ search ↔ settings works on TV.
    // Back leaves; Up/Down also leave so we never stay trapped if Back is eaten by the IME.
    if (field) {
      if (isBackOrEscape(code, key)) {
        if (key === "Backspace" && field instanceof HTMLInputElement && field.value.length > 0) {
          return;
        }
        if (key === "Backspace" && field instanceof HTMLTextAreaElement && field.value.length > 0) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        leaveEditable(field, null);
        return;
      }

      let leaveDir: Direction | null = null;
      if (code === KEY_DOWN || key === "ArrowDown" || key === "Down") leaveDir = "down";
      else if (code === KEY_UP || key === "ArrowUp" || key === "Up") leaveDir = "up";
      else if (
        (isDetailHeaderSearchField(field) || isAppHeaderSearchField(field)) &&
        (code === KEY_LEFT || key === "ArrowLeft" || key === "Left")
      ) {
        leaveDir = "left";
      } else if (
        (isDetailHeaderSearchField(field) || isAppHeaderSearchField(field)) &&
        (code === KEY_RIGHT || key === "ArrowRight" || key === "Right")
      ) {
        leaveDir = "right";
      }

      if (leaveDir) {
        e.preventDefault();
        e.stopPropagation();
        leaveEditable(field, leaveDir);
      }
      return;
    }

    let direction: Direction | null = null;
    if (code === KEY_DOWN || key === "ArrowDown" || key === "Down") direction = "down";
    else if (code === KEY_UP || key === "ArrowUp" || key === "Up") direction = "up";
    else if (code === KEY_LEFT || key === "ArrowLeft" || key === "Left") direction = "left";
    else if (code === KEY_RIGHT || key === "ArrowRight" || key === "Right") direction = "right";

    if (direction) {
      e.preventDefault();
      e.stopPropagation();

      const uiLayer = getActiveUiLayer();
      // Sheet/modal open: stay in the layer — no strip step, no fixed-focal behind.
      if (uiLayer) {
        // Beat Tizen spatial nav that still walks tabindex=0 covers behind the dialog.
        e.stopImmediatePropagation();
        zone = "chrome";
        syncBackgroundInert(uiLayer);

        // Media lightbox: Left/Right change slide or seek video; Up/Down change slide.
        if (
          uiLayer.classList.contains("media-gallery-lightbox-backdrop") ||
          uiLayer.hasAttribute("data-mhg-media-gallery-lightbox")
        ) {
          if (
            direction === "left" ||
            direction === "right" ||
            direction === "up" ||
            direction === "down"
          ) {
            const horizontal = direction === "left" || direction === "right";
            window.dispatchEvent(
              new CustomEvent("mhg:media-gallery-nav", {
                detail: {
                  direction:
                    direction === "left" || direction === "up" ? "prev" : "next",
                  axis: horizontal ? "horizontal" : "vertical",
                },
              }),
            );
          }
          focusIntoActiveUiLayer();
          return;
        }

        // Star rating overlay: on stars host L/R adjust 1–10; on actions L/R move buttons;
        // Up/Down between stars and action row.
        if (
          uiLayer.classList.contains("game-star-rating-overlay") ||
          uiLayer.hasAttribute("data-mhg-game-star-rating-overlay")
        ) {
          const starsHost = uiLayer.querySelector<HTMLElement>(
            ".game-star-rating-overlay-stars",
          );
          const actionBtns = Array.from(
            uiLayer.querySelectorAll<HTMLElement>(
              ".game-star-rating-overlay-actions [data-mhg-tv-focus]",
            ),
          ).filter(isVisible);
          const active = document.activeElement as HTMLElement | null;
          const onStars =
            !!starsHost &&
            !!active &&
            (active === starsHost || starsHost.contains(active));
          const actionIdx = active ? actionBtns.indexOf(active) : -1;

          if (direction === "left" || direction === "right") {
            if (onStars || actionIdx < 0) {
              window.dispatchEvent(
                new CustomEvent("mhg:star-rating-adjust", {
                  detail: { delta: direction === "right" ? 1 : -1 },
                }),
              );
              if (starsHost && isVisible(starsHost)) {
                focusElement(starsHost);
              }
              return;
            }
            const nextIdx =
              direction === "right"
                ? Math.min(actionBtns.length - 1, actionIdx + 1)
                : Math.max(0, actionIdx - 1);
            const next = actionBtns[nextIdx];
            if (next) focusElement(next);
            return;
          }
          if (direction === "down") {
            if (actionBtns.length > 0) {
              focusElement(actionBtns[0]!);
            }
            return;
          }
          if (direction === "up" && starsHost && isVisible(starsHost)) {
            focusElement(starsHost);
            return;
          }
          return;
        }

        const active = document.activeElement as HTMLElement | null;
        const current =
          active &&
          active !== document.body &&
          active !== document.documentElement &&
          !isLogoButton(active) &&
          !isUiLayerChrome(active, uiLayer) &&
          uiLayer.contains(active)
            ? active
            : null;
        if (!current) {
          focusIntoActiveUiLayer();
        }
        const focused = document.activeElement as HTMLElement | null;
        const from =
          focused && uiLayer.contains(focused) && focused !== uiLayer ? focused : null;

        // Enter a ⋮ submenu (Add to… / Additional executables / nested collection-like).
        if (
          direction === "right" &&
          from?.classList.contains("dropdown-menu-item-with-submenu")
        ) {
          openFocusedSubmenuRow(from);
          return;
        }

        // Leave a portaled second-level menu with Left (Back still works via tryDismiss).
        if (direction === "left" && isPortaledDropdownSubmenu(uiLayer)) {
          closePortaledDropdownSubmenus();
          window.setTimeout(() => focusActiveUiLayerImpl?.(), 0);
          return;
        }

        // Nested collection-like submenu lives inside the parent popup — Left closes it.
        if (direction === "left" && from?.closest(".dropdown-menu-collectionlike-submenu")) {
          const nestedHost = from.closest(".dropdown-menu-item-with-submenu") as HTMLElement | null;
          if (
            nestedHost?.querySelector(":scope > .dropdown-menu-collectionlike-submenu")
          ) {
            nestedHost.dispatchEvent(
              new MouseEvent("mouseleave", {
                bubbles: true,
                cancelable: true,
                relatedTarget: document.body,
              }),
            );
            focusElement(nestedHost);
            return;
          }
        }

        // ⋮ / cover / filter sheets: step rows in DOM order (geometry fails on full-bleed PS3 sheets).
        const listNext = pickNextInMenuList(uiLayer, from, direction);
        if (listNext) {
          // Leaving the "Add to" row with Up/Down should dismiss the portaled flyout.
          if (
            (direction === "up" || direction === "down") &&
            from?.classList.contains("dropdown-menu-item-with-submenu") &&
            !listNext.classList.contains("dropdown-menu-item-with-submenu")
          ) {
            closePortaledDropdownSubmenus();
          }
          focusElement(listNext);
          return;
        }

        const next = pickNextFocus(from, direction, true);
        if (next) {
          focusElement(next);
        } else if (from) {
          // No neighbor in this direction — keep focus parked in the dialog.
          focusElement(from);
        } else {
          focusIntoActiveUiLayer();
        }
        return;
      }

      if (zone === "content") {
        if (direction === "left" || direction === "right") {
          if (isHorizontalLibraryStripMode()) {
            const stepped = stepLibraryStrip(direction === "right" ? 1 : -1);
            if (!stepped && direction === "left") {
              enterChrome();
            }
            return;
          }
          if (direction === "left") {
            // Detail context rail: Left returns to Play / actions ladder.
            if (isItemDetailPage()) {
              zone = "chrome";
              if (focusDetailLadderLevel("actions", "first")) return;
              if (focusDetailLadderLevel("summary", "first")) return;
            }
            enterChrome();
          }
          return;
        }
        if (direction === "up" || direction === "down") {
          document.dispatchEvent(
            new CustomEvent("mhg:fixed-focal-step", {
              detail: { direction: direction === "down" ? 1 : -1 },
            }),
          );
        }
        return;
      }

      // chrome zone — XMB strip: Left/Right must step+select, not only move focus
      const active = document.activeElement as HTMLElement | null;
      const current =
        active && active !== document.body && active !== document.documentElement
          ? active
          : null;

      // Header/sidebar search dropdown: Up/Down through recent searches & results.
      const searchItem = searchDropdownItemFrom(current);
      if (searchItem) {
        const items = collectSearchDropdownFocusables(searchItem);
        if (direction === "up" || direction === "down") {
          const idx = items.indexOf(searchItem);
          const safeIdx = idx >= 0 ? idx : 0;
          if (direction === "up" && safeIdx <= 0) {
            const input = searchInputFromDropdownItem(searchItem);
            if (input) {
              focusElement(input);
              return;
            }
          }
          const nextIdx =
            direction === "down"
              ? Math.min(items.length - 1, safeIdx + 1)
              : Math.max(0, safeIdx - 1);
          const next = items[nextIdx];
          if (next && next !== searchItem) {
            focusElement(next);
            return;
          }
          return;
        }
        // L/R stay on the row (do not jump to play/⋮ chrome inside the item).
        return;
      }

      // Profile page: Disconnect tunnel is the only page action.
      const profileAction = profilePagePrimaryAction();
      if (profileAction && current === profileAction) {
        if (direction === "up") {
          if (focusLibraryMenu()) return;
          if (focusAppHeaderZone(current)) return;
          return;
        }
        // Stay on the button for L/R/Down.
        return;
      }

      // Plex / GOG: libraries menu ↔ list toolbar ↔ cover grid ↔ A–Z index.
      // Toolbar (Tutto / sort / count) sits between header tabs and covers.
      if (isLibraryMenuCoverGridNavMode()) {
        const menuEl = libraryMenuFocusFrom(current);
        const toolbarEl = toolbarFocusFrom(current);
        const shellActionEl = shellActionFocusFrom(current);
        const coverEl = coverFocusFrom(current);
        const alphabetEl = alphabetFocusFrom(current);
        const headerEl = appHeaderFocusFrom(current);
        const verticalMenu = !!document.querySelector(
          "[data-mhg-library-pages-vertical-list]",
        );

        if (menuEl) {
          rememberLibraryMenuFocus(menuEl);
          const menus = collectLibraryMenuFocusables();

          if (verticalMenu) {
            // GOG sidebar: Right → toolbar/covers; Up/Down move the menu.
            if (direction === "right") {
              if (focusToolbarOrCovers()) return;
              return;
            }
            if (direction === "left" || direction === "up" || direction === "down") {
              const nextMenu = pickNextInSet(menus, menuEl, direction);
              if (nextMenu) {
                rememberLibraryMenuFocus(nextMenu);
                focusElement(nextMenu);
                return;
              }
              if (direction === "down" && focusToolbarOrCovers()) return;
              return;
            }
          } else {
            // Plex header: Up → app header; Down → toolbar/covers;
            // Left/Right stay on the same row (tabs + trailing icons).
            if (direction === "down") {
              if (focusToolbarOrCovers()) return;
              return;
            }
            if (direction === "up") {
              if (focusAppHeaderZone(menuEl)) return;
              return;
            }
            if (direction === "left" || direction === "right") {
              const rowItems = collectLibrariesBarHorizontalFocusables(menuEl);
              const next = pickHorizontalInLibrariesBar(
                rowItems.length > 0 ? rowItems : menus,
                menuEl,
                direction,
              );
              if (next) {
                const nextMenu = libraryMenuFocusFrom(next);
                if (nextMenu) rememberLibraryMenuFocus(nextMenu);
                const nextShell = shellActionFocusFrom(next);
                if (nextShell) rememberShellActionFocus(nextShell);
                focusElement(next);
                return;
              }
              return;
            }
          }
        }

        // App header (logo / search / settings): L/R among icons; Down → libraries tabs.
        if (!verticalMenu && headerEl) {
          rememberAppHeaderFocus(headerEl);
          const headers = collectDetailHeaderFocusables();
          if (direction === "down") {
            if (focusLibraryMenu()) return;
            if (focusToolbarOrCovers()) return;
            return;
          }
          if (direction === "up") return;
          if (direction === "left" || direction === "right") {
            const idx = headers.indexOf(headerEl);
            if (idx >= 0) {
              const nextIdx =
                direction === "right"
                  ? Math.min(headers.length - 1, idx + 1)
                  : Math.max(0, idx - 1);
              const next = headers[nextIdx];
              if (next && next !== headerEl) {
                rememberAppHeaderFocus(next);
                focusElement(next);
                return;
              }
              return;
            }
            const next = pickNextInSet(headers, headerEl, direction);
            if (next) {
              rememberAppHeaderFocus(next);
              focusElement(next);
              return;
            }
            return;
          }
        }

        // Trailing icons on the Plex libraries bar row (not page tabs / shell actions).
        if (
          !verticalMenu &&
          current &&
          !menuEl &&
          !headerEl &&
          !toolbarEl &&
          !shellActionEl &&
          !coverEl &&
          !alphabetEl &&
          current.closest(".mhg-libraries-bar")
        ) {
          if (direction === "down") {
            if (focusToolbarOrCovers()) return;
            return;
          }
          if (direction === "up") {
            if (focusAppHeaderZone(current)) return;
            return;
          }
          if (direction === "left" || direction === "right") {
            const rowItems = collectLibrariesBarHorizontalFocusables(current);
            const next = pickHorizontalInLibrariesBar(rowItems, current, direction);
            if (next) {
              const nextMenu = libraryMenuFocusFrom(next);
              if (nextMenu) rememberLibraryMenuFocus(nextMenu);
              const nextShell = shellActionFocusFrom(next);
              if (nextShell) rememberShellActionFocus(nextShell);
              focusElement(next);
              return;
            }
            return;
          }
        }

        if (toolbarEl) {
          rememberToolbarFocus(toolbarEl);
          const toolbars = collectToolbarFocusables();
          if (direction === "left" || direction === "right") {
            const nextToolbar = pickNextInSet(toolbars, toolbarEl, direction);
            if (nextToolbar) {
              rememberToolbarFocus(nextToolbar);
              focusElement(nextToolbar);
              return;
            }
            return;
          }
          if (direction === "up") {
            if (focusShellActionsZone()) return;
            if (focusLibraryMenu()) return;
            return;
          }
          if (direction === "down") {
            if (focusCoversZone()) return;
            return;
          }
        }

        // New games / Main games / view mode in the libraries dock.
        if (shellActionEl) {
          rememberShellActionFocus(shellActionEl);
          if (direction === "left" || direction === "right") {
            const rowItems = collectLibrariesBarHorizontalFocusables(shellActionEl);
            const next = pickHorizontalInLibrariesBar(
              rowItems,
              shellActionEl,
              direction,
            );
            if (next) {
              const nextMenu = libraryMenuFocusFrom(next);
              if (nextMenu) rememberLibraryMenuFocus(nextMenu);
              const nextShell = shellActionFocusFrom(next);
              if (nextShell) rememberShellActionFocus(nextShell);
              focusElement(next);
              return;
            }
            return;
          }
          if (direction === "up") {
            if (focusLibraryMenu()) return;
            if (focusAppHeaderZone(shellActionEl)) return;
            return;
          }
          if (direction === "down") {
            if (focusToolbarZone()) return;
            if (focusCoversZone()) return;
            if (focusProfilePageAction()) return;
            return;
          }
        }

        if (alphabetEl) {
          rememberAlphabetFocus(alphabetEl);
          const letters = collectAlphabetFocusables();
          if (direction === "up" || direction === "down") {
            const nextLetter = pickNextInSet(letters, alphabetEl, direction);
            if (nextLetter) {
              rememberAlphabetFocus(nextLetter);
              focusElement(nextLetter);
              return;
            }
            return;
          }
          if (direction === "left") {
            if (focusCoversZone()) return;
            return;
          }
          if (direction === "right") return;
        }

        if (coverEl) {
          rememberCoverFocus(coverEl);

          // Recommended strips: Left/Right stay on the same keyword row at the ends;
          // Up/Down step to the adjacent keyword strip (same column).
          const recommendedStrip = recommendedStripRootFrom(coverEl);
          if (
            recommendedStrip &&
            (direction === "left" || direction === "right")
          ) {
            const stripCovers =
              collectRecommendedStripCoverFocusables(recommendedStrip);
            if (stripCovers.length > 0) {
              const idx = stripCovers.indexOf(coverEl);
              const safeIdx = idx >= 0 ? idx : 0;
              const nextIdx =
                direction === "right"
                  ? Math.min(stripCovers.length - 1, safeIdx + 1)
                  : Math.max(0, safeIdx - 1);
              const nextInStrip = stripCovers[nextIdx];
              if (nextInStrip && nextInStrip !== coverEl) {
                rememberCoverFocus(nextInStrip);
                focusElement(nextInStrip);
                return;
              }
              if (nudgeScrollParentForDirection(coverEl, direction)) {
                window.requestAnimationFrame(() => {
                  const retryStrip = recommendedStripRootFrom(
                    document.activeElement instanceof HTMLElement
                      ? document.activeElement
                      : coverEl,
                  );
                  if (!retryStrip) return;
                  const retryCovers =
                    collectRecommendedStripCoverFocusables(retryStrip);
                  const activeCover = coverFocusFrom(
                    document.activeElement instanceof HTMLElement
                      ? document.activeElement
                      : coverEl,
                  );
                  if (!activeCover) return;
                  const rIdx = retryCovers.indexOf(activeCover);
                  const rSafe = rIdx >= 0 ? rIdx : 0;
                  const rNext =
                    direction === "right"
                      ? Math.min(retryCovers.length - 1, rSafe + 1)
                      : Math.max(0, rSafe - 1);
                  const retry = retryCovers[rNext];
                  if (retry && retry !== activeCover) {
                    rememberCoverFocus(retry);
                    focusElement(retry);
                  }
                });
              }
              return;
            }
          }
          if (
            recommendedStrip &&
            (direction === "up" || direction === "down")
          ) {
            const nextStripCover = pickCoverInAdjacentRecommendedStrip(
              coverEl,
              direction,
            );
            if (nextStripCover) {
              rememberCoverFocus(nextStripCover);
              focusElement(nextStripCover);
              return;
            }
            if (direction === "up") {
              if (focusToolbarOrMenu()) return;
            }
            if (nudgeScrollParentForDirection(coverEl, direction)) {
              window.requestAnimationFrame(() => {
                const activeCover = coverFocusFrom(
                  document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : coverEl,
                );
                if (!activeCover) return;
                const retry = pickCoverInAdjacentRecommendedStrip(
                  activeCover,
                  direction,
                );
                if (retry) {
                  rememberCoverFocus(retry);
                  focusElement(retry);
                } else if (direction === "up") {
                  focusToolbarOrMenu();
                }
              });
              return;
            }
            if (direction === "up") return;
            // Last / only strip: stay in Recommended rail (don't jump to other chrome).
            return;
          }

          const covers = collectCoverFocusables();
          const nextCover = pickCoverByDirection(covers, coverEl, direction);
          if (nextCover) {
            rememberCoverFocus(nextCover);
            focusElement(nextCover);
            return;
          }
          // Right edge of the cover grid → A–Z navigator when present.
          if (direction === "right" && focusAlphabetZone(coverEl)) return;
          // Up leaves the grid toward toolbar / shell; Left stays in-grid
          // (or library menu when present) — never jump Left into the toolbar.
          if (direction === "up") {
            if (focusToolbarOrMenu()) return;
          }
          if (direction === "left") {
            if (focusLibraryMenu()) return;
          }
          if (
            (direction === "up" ||
              direction === "down" ||
              direction === "left" ||
              direction === "right") &&
            nudgeScrollParentForDirection(coverEl, direction)
          ) {
            window.requestAnimationFrame(() => {
              const retryCovers = collectCoverFocusables();
              const activeCover = coverFocusFrom(
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : coverEl,
              );
              const retry =
                activeCover &&
                pickCoverByDirection(retryCovers, activeCover, direction);
              if (retry) {
                rememberCoverFocus(retry);
                focusElement(retry);
              } else if (direction === "right") {
                focusAlphabetZone(coverEl);
              } else if (direction === "up") {
                focusToolbarOrMenu();
              } else if (direction === "left") {
                focusLibraryMenu();
              }
            });
            return;
          }
          return;
        }
      }

      // Detail pages: vertical ladder
      // header (logo ↔ search ↔ settings) → hide background → stars → Play ↔ ⋮ → summary
      if (isItemDetailPage()) {
        const ladderLevel = detailLadderLevelOf(current);

        if (ladderLevel) {
          const levelItems = collectDetailLadderLevel(ladderLevel);

          if (direction === "left" || direction === "right") {
            // DOM order: logo ↔ search ↔ settings; stars; Play ↔ ⋮
            if (
              ladderLevel === "header" ||
              ladderLevel === "stars" ||
              ladderLevel === "actions"
            ) {
              const idx = current ? levelItems.indexOf(current) : -1;
              if (idx >= 0) {
                const nextIdx =
                  direction === "right"
                    ? Math.min(levelItems.length - 1, idx + 1)
                    : Math.max(0, idx - 1);
                const next = levelItems[nextIdx];
                if (next && next !== current) {
                  focusElement(next);
                  return;
                }
                return;
              }
            }
            const next = pickNextInSet(levelItems, current, direction);
            if (next) {
              focusElement(next);
              return;
            }
            return;
          }

          if (direction === "up" || direction === "down") {
            const nextLevel = nextPopulatedDetailLadderLevel(ladderLevel, direction);
            if (nextLevel) {
              if (direction === "up" && nextLevel === "header") {
                const headerItems = collectDetailHeaderFocusables();
                const settings =
                  headerItems.find(
                    (el) => el.getAttribute("data-mhg-header-action") === "settings",
                  ) ?? headerItems[headerItems.length - 1];
                if (settings) {
                  focusElement(settings);
                  return;
                }
              }
              focusDetailLadderLevel(
                nextLevel,
                direction === "down" ? "first" : "last",
              );
              return;
            }
            // Top of ladder — stay; bottom (summary / actions) falls through to media.
            if (direction === "up") return;
          }
        }

        // From empty library tabs / nowhere: Down starts at Play; Up opens header.
        if (direction === "down" && (!current || libraryMenuFocusFrom(current))) {
          if (focusDetailLadderLevel("actions", "first")) return;
        }
        if (direction === "up" && (!current || libraryMenuFocusFrom(current))) {
          if (focusDetailLadderLevel("header", "first")) return;
        }
      }

      // Detail: media strip (screenshots / videos) — DOM order, not geometry.
      if (isItemDetailPage()) {
        const mediaEl = mediaGalleryFocusFrom(current);
        const mediaItems = collectMediaGalleryFocusables();

        if (mediaEl && mediaItems.length > 0) {
          if (direction === "left" || direction === "right") {
            const idx = mediaItems.indexOf(mediaEl);
            const nextIdx =
              direction === "right"
                ? Math.min(mediaItems.length - 1, Math.max(0, idx) + 1)
                : Math.max(0, Math.max(0, idx) - 1);
            const nextMedia = mediaItems[nextIdx];
            if (nextMedia && nextMedia !== mediaEl) {
              focusElement(nextMedia);
              return;
            }
            // At first/last tile: stay in the strip (do not escape Left → Play).
            return;
          }
          if (direction === "up") {
            if (focusDetailLadderBottom()) return;
          }
          if (direction === "down") {
            const strips = collectDetailHorizontalStrips();
            const mediaStripIdx = strips.findIndex((s) => s.kind === "media");
            if (mediaStripIdx >= 0 && mediaStripIdx + 1 < strips.length) {
              const fromIdx = Math.max(0, mediaItems.indexOf(mediaEl));
              focusDetailHorizontalStrip(strips[mediaStripIdx + 1]!, fromIdx);
              return;
            }
            return;
          }
        }

        // Down from Play / summary → media strip, then collection games grid.
        if (
          direction === "down" &&
          current &&
          !mediaEl &&
          (detailLadderLevelOf(current) === "actions" ||
            detailLadderLevelOf(current) === "summary")
        ) {
          if (mediaItems.length > 0) {
            const geometric = pickNextFocus(current, "down", true);
            if (geometric && mediaGalleryFocusFrom(geometric)) {
              focusElement(geometric);
              return;
            }
            if (!geometric || coverFocusFrom(geometric)) {
              focusElement(mediaItems[0]!);
              return;
            }
            focusElement(geometric);
            return;
          }
          // PS3 collection context rail: enter fixed-focal content zone.
          if (isDetailFixedFocalGamesList()) {
            enterContent();
            return;
          }
          // Collection-like detail: subcollections / games grid (not similar strips).
          if (focusDetailGamesGrid("first", 0)) return;
        }

        // Collection-like detail: multi-column games / subcollections grids.
        // Scope navigation to covers in the same grid so D-pad stays linear
        // (global geometric pick jumps to Play / tabs / other sections).
        const gamesGrid = detailGamesGridRootFrom(current);
        const gridCover = coverFocusFrom(current);
        if (gamesGrid && gridCover && gamesGrid.contains(gridCover)) {
          // PS3 fixed-focal rail inside the games list: step selection, don't geometry-hop.
          if (
            gridCover.closest(
              ".games-list-container--fixed-focal, .fixed-focal-games-list",
            )
          ) {
            if (direction === "left") {
              zone = "chrome";
              if (focusDetailLadderLevel("actions", "first")) return;
              if (focusDetailLadderLevel("summary", "first")) return;
              return;
            }
            if (direction === "up" || direction === "down") {
              zone = "content";
              blurToContent();
              document.dispatchEvent(
                new CustomEvent("mhg:fixed-focal-step", {
                  detail: { direction: direction === "down" ? 1 : -1 },
                }),
              );
              return;
            }
            return;
          }

          const gridCovers = collectDetailGamesGridFocusables(gamesGrid);
          if (gridCovers.length > 0) {
            const nextCover = pickCoverByDirection(gridCovers, gridCover, direction);
            if (nextCover) {
              focusElement(nextCover);
              return;
            }
            if (
              (direction === "up" ||
                direction === "down" ||
                direction === "left" ||
                direction === "right") &&
              nudgeScrollParentForDirection(gridCover, direction)
            ) {
              window.requestAnimationFrame(() => {
                const active = coverFocusFrom(
                  document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : gridCover,
                );
                const retry =
                  active &&
                  pickCoverByDirection(
                    collectDetailGamesGridFocusables(gamesGrid),
                    active,
                    direction,
                  );
                if (retry) {
                  focusElement(retry);
                  return;
                }
                if (direction === "up" || direction === "down") {
                  const grids = collectDetailGamesGridRoots();
                  const gridIdx = grids.indexOf(gamesGrid);
                  if (direction === "up") {
                    if (gridIdx > 0 && focusDetailGamesGrid("last", gridIdx - 1)) {
                      return;
                    }
                    if (focusDetailLadderBottom()) return;
                  } else {
                    if (
                      gridIdx >= 0 &&
                      gridIdx + 1 < grids.length &&
                      focusDetailGamesGrid("first", gridIdx + 1)
                    ) {
                      return;
                    }
                    const strips = collectDetailHorizontalStrips().filter(
                      (s) => s.kind === "covers",
                    );
                    if (strips.length > 0) {
                      focusDetailHorizontalStrip(strips[0]!, 0);
                    }
                  }
                }
              });
              return;
            }
            if (direction === "up") {
              const grids = collectDetailGamesGridRoots();
              const gridIdx = grids.indexOf(gamesGrid);
              if (gridIdx > 0 && focusDetailGamesGrid("last", gridIdx - 1)) return;
              if (focusDetailLadderBottom()) return;
              return;
            }
            if (direction === "down") {
              const grids = collectDetailGamesGridRoots();
              const gridIdx = grids.indexOf(gamesGrid);
              if (
                gridIdx >= 0 &&
                gridIdx + 1 < grids.length &&
                focusDetailGamesGrid("first", gridIdx + 1)
              ) {
                return;
              }
              const strips = collectDetailHorizontalStrips().filter(
                (s) => s.kind === "covers",
              );
              if (strips.length > 0) {
                focusDetailHorizontalStrip(strips[0]!, 0);
                return;
              }
              return;
            }
            // Left/Right at row edge — stay in the grid.
            return;
          }
        }

        // Collections / similar cover rows: L/R stay in the strip; Up/Down → neighbor strip.
        const coverStrip = detailCoverStripRootFrom(current);
        const stripCover = coverFocusFrom(current);
        if (coverStrip && stripCover && coverStrip.contains(stripCover)) {
          const stripCovers = collectDetailCoverStripFocusables(coverStrip);
          if (stripCovers.length > 0) {
            if (direction === "left" || direction === "right") {
              const idx = stripCovers.indexOf(stripCover);
              const safeIdx = idx >= 0 ? idx : 0;
              const nextIdx =
                direction === "right"
                  ? Math.min(stripCovers.length - 1, safeIdx + 1)
                  : Math.max(0, safeIdx - 1);
              const nextCover = stripCovers[nextIdx];
              if (nextCover && nextCover !== stripCover) {
                focusElement(nextCover);
                return;
              }
              return;
            }
            if (direction === "up" || direction === "down") {
              const strips = collectDetailHorizontalStrips();
              const stripIdx = strips.findIndex(
                (s) => s.kind === "covers" && s.root === coverStrip,
              );
              if (stripIdx >= 0) {
                const fromIdx = Math.max(0, stripCovers.indexOf(stripCover));
                const targetIdx = direction === "up" ? stripIdx - 1 : stripIdx + 1;
                if (targetIdx >= 0 && targetIdx < strips.length) {
                  focusDetailHorizontalStrip(strips[targetIdx]!, fromIdx);
                  return;
                }
                if (direction === "up") {
                  // Above first cover strip: collection games grid, else summary / Play.
                  const grids = collectDetailGamesGridRoots();
                  if (
                    grids.length > 0 &&
                    focusDetailGamesGrid("last", grids.length - 1)
                  ) {
                    return;
                  }
                  if (focusDetailLadderBottom()) return;
                  return;
                }
                // Past the last strip — stay.
                return;
              }
            }
          }
        }
      }

      if (
        (direction === "left" || direction === "right") &&
        isHorizontalLibraryStripMode()
      ) {
        const onStrip =
          !!current?.closest?.(".mhg-libraries-container") ||
          !!current?.classList?.contains("mhg-library-button") ||
          !!current?.classList?.contains("mhg-collection-shortcut-button");
        // Default chrome focus is often the active library icon — treat L/R as strip steps.
        if (onStrip || !current) {
          const stepped = stepLibraryStrip(direction === "right" ? 1 : -1);
          if (stepped) {
            window.setTimeout(() => {
              const nextActive =
                document.querySelector<HTMLElement>(
                  ".mhg-libraries-container [data-mhg-strip-focus], .mhg-libraries-container .mhg-library-active, .mhg-libraries-container .mhg-collection-shortcut-button--selected",
                ) ?? defaultChromeTarget();
              if (nextActive) focusElement(nextActive);
            }, 0);
            return;
          }
          if (direction === "left") {
            // already at first icon — stay in chrome
            return;
          }
          // at last icon going right → content rail
          enterContent();
          return;
        }
      }

      // Plex-style overflowing header tabs: linear DOM order + scroll into view
      // (geometric pickNextFocus + preventScroll leaves clipped tabs "invisible").
      if (direction === "left" || direction === "right") {
        const onPagesStrip = !!current?.closest?.(".mhg-libraries-container");
        if (onPagesStrip || !current) {
          const stepped = stepOverflowingLibraryPagesStrip(direction === "right" ? 1 : -1);
          if (stepped) return;
          if (onPagesStrip && direction === "left") return;
          // at last tab going right → fall through to chrome actions / content
        }
      }

      if (direction === "right") {
        const next = pickNextFocus(current, "right", true);
        if (next) {
          focusElement(next);
        } else {
          enterContent();
        }
        return;
      }

      const next = pickNextFocus(current, direction, true);
      if (next) {
        focusElement(next);
        return;
      }

      // Virtualized / clipped lists: no mounted neighbor yet — scroll the host and retry.
      if (
        (direction === "up" || direction === "down" || direction === "left" || direction === "right") &&
        current &&
        nudgeScrollParentForDirection(current, direction)
      ) {
        window.requestAnimationFrame(() => {
          const retry = pickNextFocus(
            document.activeElement instanceof HTMLElement ? document.activeElement : current,
            direction,
            true,
          );
          if (retry) focusElement(retry);
        });
        return;
      }

      // Edge of chrome vertically → enter the game rail.
      if (direction === "down" || direction === "up") {
        enterContent();
        document.dispatchEvent(
          new CustomEvent("mhg:fixed-focal-step", {
            detail: { direction: direction === "down" ? 1 : -1 },
          }),
        );
      }
      return;
    }

    if (!isEnterKey(code, key)) {
      // Hardware Back on TV, or trusted Escape (desktop ?mhgTv=1 / some remotes).
      // Ignore synthetic Escape from tryDismissUiLayer to avoid re-entry.
      if (
        isTvHardwareBack(code, key) ||
        ((key === "Escape" || code === 27) && e.isTrusted)
      ) {
        e.preventDefault();
        e.stopPropagation();
        goBackInApp();
      }
      return;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const code = e.keyCode || e.which || 0;
    const key = e.key;
    if (!isEnterKey(code, key)) return;
    if (!enterPointerDown) return;

    enterPointerDown = false;
    clearEnterLongPressTimer();

    if (enterLongPressFired) {
      enterLongPressFired = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const uiLayer = getActiveUiLayer();
    if (uiLayer) {
      e.stopImmediatePropagation();
    }

    runEnterShortPress();
  };

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);

  // If Tizen spatial nav tries to focus covers behind a sheet, yank focus back in.
  const onFocusIn = (e: FocusEvent) => {
    const layer = getActiveUiLayer();
    syncBackgroundInert(layer);
    if (!layer) return;
    const target = e.target as Node | null;
    if (target && layer.contains(target)) return;
    zone = "chrome";
    // Defer so we win against the browser's own focus move.
    window.setTimeout(() => focusIntoActiveUiLayer(), 0);
  };
  window.addEventListener("focusin", onFocusIn, true);

  // When a sheet mounts/unmounts, move focus into it immediately.
  let layerSyncRaf = 0;
  const scheduleLayerFocusSync = () => {
    if (layerSyncRaf) return;
    layerSyncRaf = window.requestAnimationFrame(() => {
      layerSyncRaf = 0;
      const layer = getActiveUiLayer();
      syncBackgroundInert(layer);
      if (layer) focusIntoActiveUiLayer();
    });
  };
  const layerObserver = new MutationObserver(scheduleLayerFocusSync);
  layerObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden"],
  });

  const t1 = window.setTimeout(bootstrapTvFocus, 400);
  const t2 = window.setTimeout(bootstrapTvFocus, 1800);
  const onApi = () => {
    zone = "chrome";
    window.setTimeout(bootstrapTvFocus, 250);
  };
  window.addEventListener("mhg-api-base-changed", onApi);

  const onUiLayerFocusRequest = () => requestSmartTvUiLayerFocus();
  const onExitRequested = () => requestSmartTvUiLayerFocus();
  window.addEventListener("mhg:tv-ui-layer-focus-request", onUiLayerFocusRequest);
  window.addEventListener("mhg:tv-request-exit", onExitRequested);

  // Initial sync (no layer → clear any leftover inert marks).
  syncBackgroundInert(getActiveUiLayer());

  return () => {
    focusActiveUiLayerImpl = null;
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("focusin", onFocusIn, true);
    window.removeEventListener("mhg-api-base-changed", onApi);
    window.removeEventListener("mhg:tv-ui-layer-focus-request", onUiLayerFocusRequest);
    window.removeEventListener("mhg:tv-request-exit", onExitRequested);
    layerObserver.disconnect();
    if (layerSyncRaf) window.cancelAnimationFrame(layerSyncRaf);
    window.clearTimeout(t1);
    window.clearTimeout(t2);
    clearEnterLongPressTimer();
    syncBackgroundInert(null);
  };
}
