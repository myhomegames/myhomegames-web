import { isSmartTvBrowser } from "./smartTv";

/**
 * Map Smart TV remote keys to fixed-focal step / activate events.
 * Spatial nav alone can move focus but covers are click-only; Enter must open the focal item.
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
    if (key === "ArrowDown" || key === "Down") {
      e.preventDefault();
      document.dispatchEvent(
        new CustomEvent("mhg:fixed-focal-step", { detail: { direction: 1 } }),
      );
      return;
    }
    if (key === "ArrowUp" || key === "Up") {
      e.preventDefault();
      document.dispatchEvent(
        new CustomEvent("mhg:fixed-focal-step", { detail: { direction: -1 } }),
      );
      return;
    }

    const isActivate =
      key === "Enter" ||
      key === " " ||
      key === "Spacebar" ||
      key === "Accept" ||
      key === "Select" ||
      // Some Tizen remotes report OK as keyCode 13 / 65376 without a modern key name.
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
        active.tagName === "SELECT")
    ) {
      // Let the focused control handle Enter/Space natively.
      return;
    }

    e.preventDefault();
    document.dispatchEvent(new CustomEvent("mhg:fixed-focal-activate"));
  };

  window.addEventListener("keydown", onKeyDown, true);
  return () => window.removeEventListener("keydown", onKeyDown, true);
}
