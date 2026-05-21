import { portraitCoverHeight } from "./coverPortrait";
import type { LibraryBarBandPx } from "./readGridTopInsetPx";

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

function fixedFocalUnselectedStep(
  coverHeight: number,
  gap: number,
  unselectedScale: number,
  packed: boolean,
): number {
  if (!packed) return coverHeight + gap;
  return coverHeight * unselectedScale + gap;
}

function fixedFocalItemTopRaw(
  focalTopPx: number,
  offset: number,
  coverHeight: number,
  gap: number,
  unselectedScale: number,
  packed: boolean,
): number {
  if (offset === 0) return focalTopPx;
  if (!packed) {
    return focalTopPx + offset * (coverHeight + gap);
  }

  const { topInset, bottomExtent } = fixedFocalScaledVisualInsets(
    coverHeight,
    unselectedScale,
  );
  const unselectedStep = coverHeight * unselectedScale + gap;

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

function fixedFocalSlotBottom(
  top: number,
  offset: number,
  coverHeight: number,
  unselectedScale: number,
  packed: boolean,
): number {
  if (offset === 0 || !packed) return top + coverHeight;
  const { bottomExtent } = fixedFocalScaledVisualInsets(coverHeight, unselectedScale);
  return top + bottomExtent;
}

/**
 * Absolute top for a cover offset from the focal index.
 * Tiles above the focal that would draw inside the libraries bar band are moved
 * into the column above the bar; tiles already above the bar keep their position.
 */
export function fixedFocalItemTop(
  focalTopPx: number,
  offset: number,
  coverHeight: number,
  gap: number,
  unselectedScale: number,
  packed: boolean,
  barBand: LibraryBarBandPx | null = null,
  _maxNeighborAbove = 0,
): number {
  const top = fixedFocalItemTopRaw(
    focalTopPx,
    offset,
    coverHeight,
    gap,
    unselectedScale,
    packed,
  );
  if (!barBand || offset >= 0) return top;

  const bottom = fixedFocalSlotBottom(top, offset, coverHeight, unselectedScale, packed);

  if (bottom <= barBand.top) {
    return top;
  }
  if (top >= barBand.bottom) {
    return top;
  }

  const step = fixedFocalUnselectedStep(coverHeight, gap, unselectedScale, packed);
  const { bottomExtent } = fixedFocalScaledVisualInsets(coverHeight, unselectedScale);
  const slotIndex = -offset;
  return barBand.top - gap - bottomExtent - (slotIndex - 1) * step;
}
