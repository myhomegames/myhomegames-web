import { applyWheelDeltaStep, readWheelStepThresholdPx } from "./stepScrollSnap";

export type FixedFocalStepDirection = 1 | -1;

/** Touch/pointer swipe distance (px) before a fixed-focal step; falls back to 48. */
export function readTouchStepThresholdPx(source?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 48;
  const el = source ?? document.documentElement;
  const raw = getComputedStyle(el).getPropertyValue("--mhg-touch-step-threshold-px").trim();
  const value = parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : 48;
}

type AxisLock = "undecided" | "vertical" | "horizontal";

export type AttachFixedFocalStepInputOptions = {
  scrollHost: HTMLElement;
  listHost?: HTMLElement | null;
  onStep: (direction: FixedFocalStepDirection) => void;
  /** Listen for LibrariesBar `mhg:fixed-focal-step` (default true). */
  listenDocumentStep?: boolean;
  onDocumentRestore?: (scrollTop: number) => void;
};

/**
 * Wheel + vertical pointer swipe → discrete fixed-focal steps.
 * Touch-action:none on PS3 rails blocks native scroll; phones never fire wheel.
 */
export function attachFixedFocalStepInput(options: AttachFixedFocalStepInputOptions): () => void {
  const {
    scrollHost,
    listHost,
    onStep,
    listenDocumentStep = true,
    onDocumentRestore,
  } = options;

  const wheelAccum = { accumulated: 0 };
  const touchAccum = { accumulated: 0 };
  const wheelThresholdPx = readWheelStepThresholdPx(scrollHost);
  const touchThresholdPx = readTouchStepThresholdPx(scrollHost);

  let pointerId: number | null = null;
  let lastX = 0;
  let lastY = 0;
  let axis: AxisLock = "undecided";

  const onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaY) < 0.01 && Math.abs(e.deltaX) < 0.01) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    e.stopPropagation();
    applyWheelDeltaStep(wheelAccum, e.deltaY, wheelThresholdPx, onStep);
  };

  const resetPointer = () => {
    pointerId = null;
    axis = "undecided";
    touchAccum.accumulated = 0;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (pointerId !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Mouse already has wheel; only drive steps from touch/pen.
    if (e.pointerType === "mouse") return;
    pointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    axis = "undecided";
    touchAccum.accumulated = 0;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (pointerId === null || e.pointerId !== pointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (axis === "undecided") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis = Math.abs(dy) >= Math.abs(dx) ? "vertical" : "horizontal";
      if (axis === "horizontal") {
        resetPointer();
        return;
      }
    }
    if (axis !== "vertical") return;
    e.stopPropagation();
    lastX = e.clientX;
    lastY = e.clientY;
    // Finger up (dy < 0) → next item, same as wheel down (deltaY > 0).
    applyWheelDeltaStep(touchAccum, -dy, touchThresholdPx, onStep);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (pointerId === null || e.pointerId !== pointerId) return;
    resetPointer();
  };

  const onStepEvent = (e: Event) => {
    const direction = (e as CustomEvent<{ direction?: FixedFocalStepDirection }>).detail?.direction;
    if (direction === 1 || direction === -1) onStep(direction);
  };

  const onRestoreEvent = (e: Event) => {
    if (!onDocumentRestore) return;
    const scrollTop = (e as CustomEvent<{ scrollTop?: number }>).detail?.scrollTop;
    if (scrollTop === undefined) return;
    onDocumentRestore(scrollTop);
  };

  const hosts = [scrollHost, listHost].filter((h): h is HTMLElement => !!h);
  const uniqueHosts = [...new Set(hosts)];

  for (const host of uniqueHosts) {
    host.addEventListener("wheel", onWheel, { passive: false, capture: true });
    host.addEventListener("pointerdown", onPointerDown, { capture: true });
    host.addEventListener("pointermove", onPointerMove, { capture: true });
    host.addEventListener("pointerup", onPointerUp, { capture: true });
    host.addEventListener("pointercancel", onPointerUp, { capture: true });
  }

  if (listenDocumentStep) {
    document.addEventListener("mhg:fixed-focal-step", onStepEvent);
  }
  if (onDocumentRestore) {
    document.addEventListener("mhg:fixed-focal-restore", onRestoreEvent);
  }

  return () => {
    for (const host of uniqueHosts) {
      host.removeEventListener("wheel", onWheel, { capture: true });
      host.removeEventListener("pointerdown", onPointerDown, { capture: true });
      host.removeEventListener("pointermove", onPointerMove, { capture: true });
      host.removeEventListener("pointerup", onPointerUp, { capture: true });
      host.removeEventListener("pointercancel", onPointerUp, { capture: true });
    }
    if (listenDocumentStep) {
      document.removeEventListener("mhg:fixed-focal-step", onStepEvent);
    }
    if (onDocumentRestore) {
      document.removeEventListener("mhg:fixed-focal-restore", onRestoreEvent);
    }
  };
}
