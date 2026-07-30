export const COVER_LONG_PRESS_MS = 500;

export const COVER_LONG_PRESS_EVENT = "mhg:cover-long-press";

export function dispatchCoverLongPress(): void {
  document.dispatchEvent(new CustomEvent(COVER_LONG_PRESS_EVENT));
}

const MOVE_CANCEL_PX = 12;

/** Pointer long-press for phone / touch (tap still opens detail via click). */
export function attachCoverPointerLongPress(
  element: HTMLElement,
  onLongPress: () => void,
  durationMs: number = COVER_LONG_PRESS_MS,
): () => void {
  let timer: number | null = null;
  let startX = 0;
  let startY = 0;

  const clearTimer = () => {
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    startX = e.clientX;
    startY = e.clientY;
    clearTimer();
    timer = window.setTimeout(() => {
      timer = null;
      onLongPress();
    }, durationMs);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (timer == null) return;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_CANCEL_PX) {
      clearTimer();
    }
  };

  const onPointerEnd = () => clearTimer();

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerEnd);
  element.addEventListener("pointercancel", onPointerEnd);
  element.addEventListener("lostpointercapture", onPointerEnd);

  return () => {
    clearTimer();
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerEnd);
    element.removeEventListener("pointercancel", onPointerEnd);
    element.removeEventListener("lostpointercapture", onPointerEnd);
  };
}
