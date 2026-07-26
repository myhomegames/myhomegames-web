import { isSmartTvBrowser } from "./smartTv";

/**
 * Enter / OK → activate the fixed-focal selection when nothing else is focused.
 * Arrow keys are intentionally NOT captured here: stealing them breaks Tizen spatial
 * navigation (sidebar / buttons). List stepping is handled in attachFixedFocalStepInput.
 */
export function installSmartTvRemoteKeys(
  enabled: boolean = isSmartTvBrowser(),
): () => void {
  if (!enabled || typeof window === "undefined") return () => {};

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.("input, textarea, select, [contenteditable='true']")) {
      return;
    }

    const key = e.key;
    const isActivate =
      key === "Enter" ||
      key === " " ||
      key === "Spacebar" ||
      key === "Accept" ||
      key === "Select" ||
      e.keyCode === 13 ||
      e.keyCode === 65376;

    if (!isActivate) return;

    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      active !== document.body &&
      (active.tagName === "BUTTON" ||
        active.tagName === "A" ||
        active.getAttribute("role") === "button" ||
        active.tagName === "INPUT" ||
        active.tagName === "SELECT" ||
        active.isContentEditable)
    ) {
      // Focused control handles Enter/Space natively (spatial nav target).
      return;
    }

    e.preventDefault();
    document.dispatchEvent(new CustomEvent("mhg:fixed-focal-activate"));
  };

  // Bubble phase so focused controls get first chance.
  window.addEventListener("keydown", onKeyDown, false);
  return () => window.removeEventListener("keydown", onKeyDown, false);
}
