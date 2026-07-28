import { isSmartTvBrowser } from "./smartTv";
import {
  activateStripFocusTarget,
  isHorizontalLibraryStripMode,
  stepLibraryStrip,
} from "./libraryStripStep";

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

function readZIndex(el: HTMLElement): number {
  let node: HTMLElement | null = el;
  while (node && node !== document.documentElement) {
    const z = parseInt(window.getComputedStyle(node).zIndex, 10);
    if (Number.isFinite(z)) return z;
    node = node.parentElement;
  }
  return 0;
}

/** Topmost visible popup/modal layer, or null when the page is unobstructed. */
function getActiveUiLayer(): HTMLElement | null {
  const candidates: HTMLElement[] = [];
  for (const sel of UI_LAYER_SELECTORS) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      if (isVisible(el)) candidates.push(el);
    });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const zDiff = readZIndex(a) - readZIndex(b);
    if (zDiff !== 0) return zDiff;
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
  return candidates[candidates.length - 1] ?? null;
}

/**
 * @param allowTextFields when false, skip inputs/search — used after leaving a field so we
 * never immediately re-focus the same search box (common on pages without library buttons).
 */
function collectFocusables(allowTextFields: boolean): HTMLElement[] {
  // Keep D-pad inside the open sheet/modal (same idea as exit confirm).
  const scope: ParentNode = getActiveUiLayer() ?? document;
  const nodes = scope.querySelectorAll<HTMLElement>(
    [
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
    if (isLogoButton(el)) return false;
    if (!allowTextFields && isTextField(el)) return false;
    return true;
  });
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
  return (
    items.find((el) => el.classList.contains("mhg-library-active")) ??
    items.find((el) => el.classList.contains("mhg-library-button")) ??
    items.find((el) => el.classList.contains("mhg-sidebar-search-trigger")) ??
    items[0] ??
    null
  );
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

  const from = current.getBoundingClientRect();
  const fromC = center(from);
  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of items) {
    if (el === current) continue;
    const to = el.getBoundingClientRect();
    const toC = center(to);
    const dx = toC.x - fromC.x;
    const dy = toC.y - fromC.y;

    let primary = 0;
    let orthogonal = 0;
    let aligned = false;

    if (direction === "down") {
      primary = dy;
      orthogonal = Math.abs(dx);
      aligned = to.top >= from.top - 4;
    } else if (direction === "up") {
      primary = -dy;
      orthogonal = Math.abs(dx);
      aligned = to.bottom <= from.bottom + 4;
    } else if (direction === "right") {
      primary = dx;
      orthogonal = Math.abs(dy);
      aligned = to.left >= from.left - 4;
    } else {
      primary = -dx;
      orthogonal = Math.abs(dy);
      aligned = to.right <= from.right + 4;
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

function focusElement(el: HTMLElement): void {
  // Clickable sheet rows are often <div>s without tabindex — make them programmatically focusable.
  if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) {
    el.tabIndex = -1;
  }
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
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

/** Close a known modal/sheet layer if one is open. */
function tryDismissUiLayer(): boolean {
  const layer = getActiveUiLayer();
  if (layer?.hasAttribute("data-mhg-tv-exit-confirm")) {
    return false;
  }

  // Prefer dismissing the topmost layer (e.g. ⋮ sheet above sidebar search).
  if (layer) {
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

function isExitConfirmOpen(): boolean {
  return Boolean(document.querySelector("[data-mhg-tv-exit-confirm]"));
}

function goBackInApp(): void {
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
      const next = defaultChromeTarget();
      if (next) focusElement(next);
      return;
    }
    zone = "content";
    blurToContent();
  };

  const bootstrapTvFocus = () => {
    if (zone === "content" && !getActiveUiLayer()) return;
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      active !== document.body &&
      active !== document.documentElement &&
      !isLogoButton(active) &&
      !isTextField(active) &&
      collectFocusables(false).includes(active)
    ) {
      return;
    }
    // Don't bootstrap onto a search box — that traps the remote on some pages.
    if (active && isTextField(active) && !getActiveUiLayer()) return;
    enterChrome();
  };

  const leaveEditable = (field: HTMLElement, direction: Direction | null) => {
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

    // Search / inputs: keep Left/Right for caret + on-screen keyboard.
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
        zone = "chrome";
        const active = document.activeElement as HTMLElement | null;
        const current =
          active &&
          active !== document.body &&
          active !== document.documentElement &&
          !isLogoButton(active) &&
          uiLayer.contains(active)
            ? active
            : null;
        const next = pickNextFocus(current, direction, true);
        if (next) focusElement(next);
        else if (!current) {
          const fallback = defaultChromeTarget();
          if (fallback) focusElement(fallback);
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
        active && active !== document.body && active !== document.documentElement && !isLogoButton(active)
          ? active
          : null;

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

    const isEnter =
      code === KEY_ENTER ||
      code === 65376 ||
      key === "Enter" ||
      key === " " ||
      key === "Spacebar" ||
      key === "Accept" ||
      key === "Select";

    if (!isEnter) {
      if (isTvHardwareBack(code, key)) {
        e.preventDefault();
        e.stopPropagation();
        goBackInApp();
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const uiLayer = getActiveUiLayer();

    // PS3 strip: Add Game / Settings / Profile / Search only snap-focus (no auto-click).
    // Prefer that target over document.activeElement — Tizen often keeps focus on the
    // last .mhg-library-active list library, so Enter would re-open that instead.
    if (!uiLayer && isHorizontalLibraryStripMode() && activateStripFocusTarget()) {
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
        !isLogoButton(active) &&
        (!uiLayer || uiLayer.contains(active)) &&
        isActivatable
      ) {
        active.click();
        return;
      }
      // Layer open but focus still on the page: pull into the sheet.
      if (uiLayer) {
        const fallback = defaultChromeTarget();
        if (fallback) {
          focusElement(fallback);
          return;
        }
      }
    }

    if (!uiLayer) {
      document.dispatchEvent(new CustomEvent("mhg:fixed-focal-activate"));
    }
  };

  window.addEventListener("keydown", onKeyDown, true);

  const t1 = window.setTimeout(bootstrapTvFocus, 400);
  const t2 = window.setTimeout(bootstrapTvFocus, 1800);
  const onApi = () => {
    zone = "chrome";
    window.setTimeout(bootstrapTvFocus, 250);
  };
  window.addEventListener("mhg-api-base-changed", onApi);

  return () => {
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("mhg-api-base-changed", onApi);
    window.clearTimeout(t1);
    window.clearTimeout(t2);
  };
}
