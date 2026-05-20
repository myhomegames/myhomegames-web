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

/** Visual inset of a scaled cover inside its full-height slot (center origin). */
function fixedFocalScaledVisualInsets(
  coverHeight: number,
  scale: number,
): { topInset: number; bottomExtent: number } {
  return {
    topInset: (coverHeight * (1 - scale)) / 2,
    bottomExtent: (coverHeight * (1 + scale)) / 2,
  };
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

  const smallH = coverHeight * unselectedScale;
  const { topInset, bottomExtent } = fixedFocalScaledVisualInsets(
    coverHeight,
    unselectedScale,
  );
  const unselectedStep = smallH + gap;

  if (offset === 1) {
    return focalTopPx + coverHeight + gap - topInset;
  }
  if (offset === -1) {
    return focalTopPx - gap - bottomExtent;
  }
  if (offset > 1) {
    const firstBelow = focalTopPx + coverHeight + gap - topInset;
    return firstBelow + (offset - 1) * unselectedStep;
  }

  const firstAbove = focalTopPx - gap - bottomExtent;
  return firstAbove + (offset + 1) * unselectedStep;
}
