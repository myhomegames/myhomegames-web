import { isSmartTvBrowser } from "./smartTv";

/** Samsung Tizen remote keyCodes (mandatory keys — no registerKey needed). */
const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
const KEY_ENTER = 13;
const KEY_BACK = 10009;

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el?.closest?.("input, textarea, select, [contenteditable='true']"));
}

function focusedControlHandlesEnter(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body || active === document.documentElement) return false;
  return (
    active.tagName === "BUTTON" ||
    active.tagName === "A" ||
    active.getAttribute("role") === "button" ||
    active.tagName === "INPUT" ||
    active.tagName === "SELECT" ||
    active.isContentEditable
  );
}

/** Give Tizen spatial navigation a starting point (first libraries / chrome button). */
function bootstrapTvFocus(): void {
  const active = document.activeElement as HTMLElement | null;
  if (active && active !== document.body && active !== document.documentElement) return;
  const candidate =
    document.querySelector<HTMLElement>(
      ".libraries-bar button, .libraries-strip button, header button, [data-mhg-tv-focus] button, button",
    ) ?? null;
  candidate?.focus?.();
}

/**
 * Smart TV remote → app actions.
 * - Arrows: drive fixed-focal list steps (and leave default spatial nav intact — no preventDefault).
 * - Enter/OK: open focal item unless a real button/link is focused.
 */
export function installSmartTvRemoteKeys(
  enabled: boolean = isSmartTvBrowser(),
): () => void {
  if (!enabled || typeof window === "undefined") return () => {};

  const onKeyDown = (e: KeyboardEvent) => {
    if (isEditableTarget(e.target)) return;

    const code = e.keyCode || e.which || 0;
    const key = e.key;

    const isDown = code === KEY_DOWN || key === "ArrowDown" || key === "Down";
    const isUp = code === KEY_UP || key === "ArrowUp" || key === "Up";
    const isLeft = code === KEY_LEFT || key === "ArrowLeft" || key === "Left";
    const isRight = code === KEY_RIGHT || key === "ArrowRight" || key === "Right";
    const isEnter =
      code === KEY_ENTER ||
      code === 65376 ||
      key === "Enter" ||
      key === "Accept" ||
      key === "Select";
    const isBack = code === KEY_BACK || key === "XF86Back";

    if (isDown || isUp) {
      // Do NOT preventDefault: Tizen spatial nav among sidebar buttons must keep working.
      document.dispatchEvent(
        new CustomEvent("mhg:fixed-focal-step", {
          detail: { direction: isDown ? 1 : -1 },
        }),
      );
      return;
    }

    if (isLeft || isRight) {
      // Spatial nav only (sidebar ↔ content). No preventDefault.
      return;
    }

    if (isEnter) {
      if (focusedControlHandlesEnter()) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("mhg:fixed-focal-activate"));
      return;
    }

    if (isBack) {
      // Let the app / browser handle Back; do not exit from the PWA shell here.
      return;
    }
  };

  window.addEventListener("keydown", onKeyDown, false);

  // After paint / tunnel gate, focus something so D-pad spatial nav has an anchor.
  const t1 = window.setTimeout(bootstrapTvFocus, 500);
  const t2 = window.setTimeout(bootstrapTvFocus, 2000);
  const onApi = () => window.setTimeout(bootstrapTvFocus, 300);
  window.addEventListener("mhg-api-base-changed", onApi);

  return () => {
    window.removeEventListener("keydown", onKeyDown, false);
    window.removeEventListener("mhg-api-base-changed", onApi);
    window.clearTimeout(t1);
    window.clearTimeout(t2);
  };
}
