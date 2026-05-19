import { snapContextRailGamesScrollTop } from "./readGridTopInsetPx";

export function readStepScrollRows(containerEl?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const source = containerEl ?? document.documentElement;
  const raw = getComputedStyle(source).getPropertyValue("--mhg-step-scroll-rows");
  const value = parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Minimum accumulated wheel delta (px) before a discrete step fires; 0 = one step per wheel event. */
export function readWheelStepThresholdPx(source?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const el = source ?? document.documentElement;
  const raw = getComputedStyle(el).getPropertyValue("--mhg-wheel-step-threshold-px").trim();
  const value = parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export type WheelDeltaAccumState = { accumulated: number };

/** Accumulate trackpad/mouse wheel delta before firing a discrete navigation step. */
export function applyWheelDeltaStep(
  state: WheelDeltaAccumState,
  deltaY: number,
  thresholdPx: number,
  step: (direction: 1 | -1) => void,
): void {
  if (thresholdPx <= 0) {
    if (Math.abs(deltaY) >= 0.01) {
      step(deltaY > 0 ? 1 : -1);
    }
    return;
  }
  state.accumulated += deltaY;
  while (Math.abs(state.accumulated) >= thresholdPx) {
    const direction: 1 | -1 = state.accumulated > 0 ? 1 : -1;
    step(direction);
    state.accumulated -= direction * thresholdPx;
  }
}

export type VirtualizedStepScrollSnapOptions = {
  scrollTop: number;
  maxScrollTop: number;
  itemHeight: number;
  stepRows: number;
  topInset: number;
  contextRail: boolean;
  alignMaxScrollTop?: number;
};

function stepPxFor(opts: VirtualizedStepScrollSnapOptions): number {
  return Math.max(1, Math.round(opts.itemHeight * opts.stepRows));
}

/** All discrete scroll positions for a virtualized games/collections grid. */
export function buildVirtualizedStepScrollPositions(
  opts: Pick<
    VirtualizedStepScrollSnapOptions,
    "maxScrollTop" | "itemHeight" | "stepRows" | "topInset" | "contextRail" | "alignMaxScrollTop"
  >,
): number[] {
  const max = Math.max(0, opts.maxScrollTop);
  const stepPx = stepPxFor(opts as VirtualizedStepScrollSnapOptions);

  if (opts.contextRail) {
    const cap =
      opts.alignMaxScrollTop !== undefined && Number.isFinite(opts.alignMaxScrollTop)
        ? Math.min(max, Math.max(0, opts.alignMaxScrollTop))
        : max;
    const positions: number[] = [];
    for (let p = 0; p < cap; p += stepPx) positions.push(p);
    if (positions.length === 0 || positions[positions.length - 1] !== cap) {
      positions.push(cap);
    }
    return positions;
  }

  if (opts.topInset > 0) {
    const firstStep = opts.itemHeight + opts.topInset;
    const positions = [0];
    for (let p = firstStep; p < max; p += stepPx) positions.push(p);
    if (positions[positions.length - 1] !== max) positions.push(max);
    return positions;
  }

  const positions: number[] = [];
  for (let p = 0; p < max; p += stepPx) positions.push(p);
  if (positions.length === 0 || positions[positions.length - 1] !== max) {
    positions.push(max);
  }
  return positions;
}

/** Nearest snap position for the current scroll offset (no debounce). */
export function snapVirtualizedStepScrollTop(opts: VirtualizedStepScrollSnapOptions): number {
  const max = Math.max(0, opts.maxScrollTop);
  const stepPx = stepPxFor(opts);
  const current = opts.scrollTop;

  if (opts.contextRail) {
    return snapContextRailGamesScrollTop(
      current,
      max,
      stepPx,
      opts.alignMaxScrollTop,
    );
  }

  if (opts.topInset > 0) {
    const firstStep = opts.itemHeight + opts.topInset;
    if (current <= firstStep / 2) return 0;
    const afterFirst = Math.max(0, current - firstStep);
    return Math.max(0, Math.min(max, firstStep + Math.round(afterFirst / stepPx) * stepPx));
  }

  return Math.max(0, Math.min(max, Math.round(current / stepPx) * stepPx));
}

function nearestSnapIndex(positions: number[], scrollTop: number): number {
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < positions.length; i++) {
    const dist = Math.abs(positions[i] - scrollTop);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Next or previous snap index from wheel / keyboard step. */
export function nextVirtualizedStepScrollTop(
  opts: VirtualizedStepScrollSnapOptions,
  direction: 1 | -1,
): number {
  const positions = buildVirtualizedStepScrollPositions(opts);
  if (positions.length === 0) return 0;
  const idx = nearestSnapIndex(positions, opts.scrollTop);
  const nextIdx = Math.max(0, Math.min(positions.length - 1, idx + direction));
  return positions[nextIdx];
}

export type TagListStepScrollSnapOptions = {
  scrollTop: number;
  maxScrollTop: number;
  firstOffset: number;
  stepPx: number;
  stopEarlyPx: number;
};

export function snapTagListScrollTop(opts: TagListStepScrollSnapOptions): number {
  const { scrollTop: current, maxScrollTop: max, firstOffset, stepPx, stopEarlyPx } = opts;
  let target = 0;
  if (current <= firstOffset / 2) {
    target = 0;
  } else {
    const afterFirst = Math.max(0, current - firstOffset);
    const snapped = firstOffset + Math.round(afterFirst / stepPx) * stepPx;
    target = Math.max(firstOffset, snapped - stopEarlyPx);
  }
  return Math.max(0, Math.min(max, target));
}

export function buildTagListStepScrollPositions(
  opts: Pick<TagListStepScrollSnapOptions, "maxScrollTop" | "firstOffset" | "stepPx" | "stopEarlyPx">,
): number[] {
  const max = Math.max(0, opts.maxScrollTop);
  const positions = [0];
  for (let p = opts.firstOffset; p < max; p += opts.stepPx) {
    positions.push(Math.max(opts.firstOffset, p - opts.stopEarlyPx));
  }
  if (positions[positions.length - 1] !== max) {
    positions.push(max);
  }
  return positions;
}

export function nextTagListStepScrollTop(
  opts: TagListStepScrollSnapOptions,
  direction: 1 | -1,
): number {
  const positions = buildTagListStepScrollPositions(opts);
  if (positions.length === 0) return 0;
  const snapped = snapTagListScrollTop(opts);
  const idx = nearestSnapIndex(positions, snapped);
  const nextIdx = Math.max(0, Math.min(positions.length - 1, idx + direction));
  return positions[nextIdx];
}

/** Apply tag-list snap immediately; returns whether scrollTop changed. */
export function applyTagListStepSnap(el: HTMLElement, opts: TagListStepScrollSnapOptions): boolean {
  const target = snapTagListScrollTop(opts);
  if (Math.abs(target - opts.scrollTop) <= 2) return false;
  el.scrollTop = target;
  return true;
}

/** Apply snap immediately; returns whether scrollTop changed. */
export function applyVirtualizedStepSnap(el: HTMLElement, opts: VirtualizedStepScrollSnapOptions): boolean {
  const target = snapVirtualizedStepScrollTop(opts);
  if (Math.abs(target - opts.scrollTop) <= 2) return false;
  el.scrollTop = target;
  return true;
}
