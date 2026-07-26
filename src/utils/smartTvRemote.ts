import { isSmartTvBrowser } from "./smartTv";

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
 * @param allowTextFields when false, skip inputs/search — used after leaving a field so we
 * never immediately re-focus the same search box (common on pages without library buttons).
 */
function collectFocusables(allowTextFields: boolean): HTMLElement[] {
  const nodes = document.querySelectorAll<HTMLElement>(
    [
      "button:not([disabled]):not([tabindex='-1'])",
      "a[href]:not([tabindex='-1'])",
      "[role='button']:not([tabindex='-1'])",
      "input:not([disabled]):not([type='hidden']):not([tabindex='-1'])",
      "select:not([disabled]):not([tabindex='-1'])",
      "[data-mhg-tv-focus]:not([tabindex='-1'])",
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
    zone = "content";
    blurToContent();
  };

  const bootstrapTvFocus = () => {
    if (zone === "content") return;
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
    if (active && isTextField(active)) return;
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

      if (zone === "content") {
        if (direction === "left") {
          enterChrome();
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

      // chrome zone — allow moving onto search/inputs from buttons
      const active = document.activeElement as HTMLElement | null;
      const current =
        active && active !== document.body && active !== document.documentElement && !isLogoButton(active)
          ? active
          : null;

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

    if (!isEnter) return;

    e.preventDefault();
    e.stopPropagation();

    if (zone === "chrome") {
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        active !== document.body &&
        typeof active.click === "function" &&
        !isLogoButton(active) &&
        (active.tagName === "BUTTON" ||
          active.tagName === "A" ||
          active.getAttribute("role") === "button")
      ) {
        active.click();
        return;
      }
    }

    document.dispatchEvent(new CustomEvent("mhg:fixed-focal-activate"));
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
