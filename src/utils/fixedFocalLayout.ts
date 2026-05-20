import { portraitCoverHeight } from "./coverPortrait";

/** Neighbor slots above/below the focal cover (`--mhg-fixed-focal-neighbor-slots`). */
export function readFixedFocalNeighborSlots(fallback: number): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--mhg-fixed-focal-neighbor-slots")
  );
  if (Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  return fallback;
}

/** Pack unselected rows by scaled height (`--mhg-fixed-focal-packed-rows: 1`). */
export function readFixedFocalPackedRows(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--mhg-fixed-focal-packed-rows")
    .trim()
    .toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function fixedFocalCoverHeight(coverSize: number, portrait: boolean): number {
  return portrait ? portraitCoverHeight(coverSize) : coverSize * (9 / 16);
}

/** Virtual index step for session-storage focal selection. */
export function fixedFocalVirtualRowStep(
  coverHeight: number,
  gap: number,
  unselectedScale: number,
  packed: boolean
): number {
  if (packed) {
    return coverHeight * unselectedScale + gap;
  }
  return coverHeight + gap;
}

/** Absolute top for a cover offset from the focal index. */
export function fixedFocalItemTop(
  focalTopPx: number,
  offset: number,
  coverHeight: number,
  gap: number,
  unselectedScale: number,
  packed: boolean
): number {
  if (offset === 0) return focalTopPx;
  if (!packed) {
    return focalTopPx + offset * (coverHeight + gap);
  }
  /*
   * Uniform edge spacing between neighbors (smallH + gap). The selected cover
   * is full height; unselected tiles may tuck under it (z-index). Avoids a
   * larger step below the focal tile than above it.
   */
  const smallH = coverHeight * unselectedScale;
  return focalTopPx + offset * (smallH + gap);
}
