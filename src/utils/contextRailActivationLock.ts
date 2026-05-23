import {
  clearContextRailActivationLockSession,
  peekContextRailActivationLockSession,
} from "./contextRailIndexPeek";

const GLOBAL_LOCK_CLASS = "mhg-context-rail-activation-lock-global";
const FOCAL_ACTIVATION_SELECTOR =
  ".fixed-focal-tag-list, .fixed-focal-collections-list, .fixed-focal-tag-list *, .fixed-focal-collections-list *";
const MIN_POINTER_MOVE_PX = 12;
const UNLOCK_FALLBACK_MS = 3000;

let engaged = false;
let originX: number | null = null;
let originY: number | null = null;
let fallbackTimer: number | null = null;
const lockListeners = new Set<() => void>();

function notifyLockListeners(): void {
  lockListeners.forEach((listener) => listener());
}

function shouldBlockTarget(target: EventTarget | null): boolean {
  if (!engaged) return false;
  if (GLOBAL_LOCK_CLASS && document.documentElement.classList.contains(GLOBAL_LOCK_CLASS)) {
    return true;
  }
  return target instanceof Element && target.closest(FOCAL_ACTIVATION_SELECTOR) != null;
}

function blockActivation(event: Event): void {
  if (!engaged) return;
  if (!shouldBlockTarget(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function detachListeners(): void {
  document.removeEventListener("mousedown", blockActivation, true);
  document.removeEventListener("click", blockActivation, true);
  document.removeEventListener("pointerup", blockActivation, true);
  document.removeEventListener("auxclick", blockActivation, true);
  window.removeEventListener("pointermove", onPointerMove);
}

function disengageContextRailActivationLock(): void {
  if (!engaged) return;
  engaged = false;
  originX = null;
  originY = null;
  document.documentElement.classList.remove(GLOBAL_LOCK_CLASS);
  if (fallbackTimer != null) {
    window.clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
  detachListeners();
  clearContextRailActivationLockSession();
  notifyLockListeners();
}

function onPointerMove(event: PointerEvent): void {
  if (!engaged) return;
  if (originX == null || originY == null) {
    originX = event.clientX;
    originY = event.clientY;
    return;
  }
  const dx = event.clientX - originX;
  const dy = event.clientY - originY;
  if (dx * dx + dy * dy >= MIN_POINTER_MOVE_PX * MIN_POINTER_MOVE_PX) {
    disengageContextRailActivationLock();
  }
}

/** Attach capture listeners immediately (before React paints the index). */
export function engageContextRailActivationLock(force = false): void {
  if (engaged) return;
  if (typeof document === "undefined") return;
  if (!force && !peekContextRailActivationLockSession()) {
    return;
  }

  engaged = true;
  originX = null;
  originY = null;
  document.documentElement.classList.add(GLOBAL_LOCK_CLASS);

  document.addEventListener("mousedown", blockActivation, true);
  document.addEventListener("click", blockActivation, true);
  document.addEventListener("pointerup", blockActivation, true);
  document.addEventListener("auxclick", blockActivation, true);
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  if (fallbackTimer != null) {
    window.clearTimeout(fallbackTimer);
  }
  fallbackTimer = window.setTimeout(
    disengageContextRailActivationLock,
    UNLOCK_FALLBACK_MS,
  );

  notifyLockListeners();
}

export function isContextRailActivationLocked(): boolean {
  return engaged;
}

export function subscribeContextRailActivationLock(listener: () => void): () => void {
  lockListeners.add(listener);
  return () => {
    lockListeners.delete(listener);
  };
}

/** Browser back: engage before React re-renders the index. */
export function handleContextRailHistoryPop(): void {
  if (peekContextRailActivationLockSession()) {
    engageContextRailActivationLock(true);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener(
    "popstate",
    () => {
      handleContextRailHistoryPop();
    },
    true,
  );
}
