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

/** Clearance above the libraries icon strip when a tile is nudged out of it (`--mhg-fixed-focal-bar-skip-gap`). */
export function readFixedFocalBarSkipGapPx(fallback = 0): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--mhg-fixed-focal-bar-skip-gap"),
  );
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
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

function fixedFocalPackedStep(
  coverHeight: number,
  gap: number,
  unselectedScale: number,
  packed: boolean,
): number {
  if (!packed) return coverHeight + gap;
  return coverHeight * unselectedScale + gap;
}

function fixedFocalTileBottomAtRawTop(
  rawTop: number,
  offset: number,
  coverHeight: number,
  unselectedScale: number,
  packed: boolean,
): number {
  return fixedFocalSlotBottom(rawTop, offset, coverHeight, unselectedScale, packed);
}

/** Tile must leave the libraries strip or sit above the first stacked row (no overlap). */
function fixedFocalNeedsLibrariesStripStack(
  offset: number,
  focalTopPx: number,
  coverHeight: number,
  gap: number,
  unselectedScale: number,
  packed: boolean,
  stripTop: number,
  firstStackTop: number,
): boolean {
  const rawTop = fixedFocalItemTopRaw(
    focalTopPx,
    offset,
    coverHeight,
    gap,
    unselectedScale,
    packed,
  );
  const bottom = fixedFocalTileBottomAtRawTop(
    rawTop,
    offset,
    coverHeight,
    unselectedScale,
    packed,
  );
  return bottom > stripTop || bottom > firstStackTop;
}

/** Stack index from -1 down to `offset` among tiles that need strip stacking. */
function librariesStripStackIndex(
  offset: number,
  focalTopPx: number,
  coverHeight: number,
  gap: number,
  unselectedScale: number,
  packed: boolean,
  stripTop: number,
  firstStackTop: number,
): number {
  let count = 0;
  for (let o = -1; o >= offset; o--) {
    if (
      fixedFocalNeedsLibrariesStripStack(
        o,
        focalTopPx,
        coverHeight,
        gap,
        unselectedScale,
        packed,
        stripTop,
        firstStackTop,
      )
    ) {
      count++;
    }
  }
  return Math.max(0, count - 1);
}

/**
 * Absolute top for a cover offset from the focal index.
 * Tiles in the top tool dock band keep natural Y (pass behind the dock). Tiles that
 * intersect the libraries icon strip stack upward from the strip top without overlap.
 */
export function fixedFocalItemTop(
  focalTopPx: number,
  offset: number,
  coverHeight: number,
  gap: number,
  unselectedScale: number,
  packed: boolean,
  librariesStripBand: LibraryBarBandPx | null = null,
): number {
  const top = fixedFocalItemTopRaw(
    focalTopPx,
    offset,
    coverHeight,
    gap,
    unselectedScale,
    packed,
  );
  if (!librariesStripBand || offset >= 0) return top;

  const stripTop = librariesStripBand.top;
  const barSkipGap = readFixedFocalBarSkipGapPx(0);
  const packStep = fixedFocalPackedStep(coverHeight, gap, unselectedScale, packed);
  const { bottomExtent } = fixedFocalScaledVisualInsets(coverHeight, unselectedScale);
  const firstStackTop = stripTop - barSkipGap - bottomExtent;

  if (
    !fixedFocalNeedsLibrariesStripStack(
      offset,
      focalTopPx,
      coverHeight,
      gap,
      unselectedScale,
      packed,
      stripTop,
      firstStackTop,
    )
  ) {
    return top;
  }

  const stackIndex = librariesStripStackIndex(
    offset,
    focalTopPx,
    coverHeight,
    gap,
    unselectedScale,
    packed,
    stripTop,
    firstStackTop,
  );
  return firstStackTop - stackIndex * packStep;
}

/** Extra gap for strip titles in the library icon band (`--mhg-recommended-strip-bar-adjacent-gap`). */
export function readRecommendedStripBarAdjacentGapPx(fallback = 16): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--mhg-recommended-strip-bar-adjacent-gap",
    ),
  );
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

/** Lower the selected strip title from icon-center focal (`--mhg-recommended-strip-selected-nudge-down`). */
export function readRecommendedStripSelectedNudgeDownPx(fallback?: number): number {
  const fallbackPx = fallback ?? 56;
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallbackPx;
  }
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--mhg-recommended-strip-selected-nudge-down",
    ),
  );
  return Number.isFinite(raw) && raw >= 0 ? raw : fallbackPx;
}

/** Min gap between selected strip title bottom and the next title below (`--mhg-recommended-strip-below-selected-gap`). */
export function readRecommendedStripBelowSelectedGapPx(fallback = 40): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--mhg-recommended-strip-below-selected-gap",
    ),
  );
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

/** Min gap between the title above and the selected strip title top (`--mhg-recommended-strip-above-selected-gap`). */
export function readRecommendedStripAboveSelectedGapPx(fallback = 56): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--mhg-recommended-strip-above-selected-gap",
    ),
  );
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

/** Extra clearance above the library icon top for the strip title immediately above it. */
export function readRecommendedStripAboveIconGapPx(fallback = 12): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--mhg-recommended-strip-above-icon-gap",
    ),
  );
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

/** Largest `top` (px) so a strip title row sits above the icon and above the selected title. */
function recommendedStripMaxTopAboveIconAndSelected(
  selectedTop: number,
  rowHeight: number,
  iconBand: LibraryBarBandPx,
  aboveSelectedGap: number,
  aboveIconGap: number,
): number {
  const barSkipGap = readFixedFocalBarSkipGapPx(0);
  const capAboveSelected = selectedTop - aboveSelectedGap - rowHeight;
  const capAboveIcon = iconBand.top - barSkipGap - aboveIconGap - rowHeight;
  return Math.min(capAboveSelected, capAboveIcon);
}

/**
 * Recommended strip titles: selected (on icon) nudged down; titles below kept under it;
 * titles in the icon band above shift up together.
 */
export function fixedFocalRecommendedStripTitleTop(
  focalTopPx: number,
  offset: number,
  rowHeight: number,
  gap: number,
  unselectedScale: number,
  packed: boolean,
  iconBand: LibraryBarBandPx | null,
  selectedScale = 1,
): number {
  const top = fixedFocalItemTop(
    focalTopPx,
    offset,
    rowHeight,
    gap,
    unselectedScale,
    packed,
    iconBand,
  );

  const selectedNudge = readRecommendedStripSelectedNudgeDownPx();
  const selectedTop =
    fixedFocalItemTop(focalTopPx, 0, rowHeight, gap, unselectedScale, packed, iconBand) +
    selectedNudge;
  const selectedBottom = fixedFocalTileBottomAtRawTop(
    selectedTop,
    0,
    rowHeight,
    selectedScale,
    packed,
  );

  if (offset === 0) {
    return selectedTop;
  }

  if (offset > 0) {
    const belowGap = readRecommendedStripBelowSelectedGapPx();
    const packStep = fixedFocalPackedStep(rowHeight, gap, unselectedScale, packed);
    const plusOneTop = Math.max(
      fixedFocalItemTop(focalTopPx, 1, rowHeight, gap, unselectedScale, packed, iconBand),
      selectedBottom + belowGap,
    );
    if (offset === 1) {
      return Math.max(top, plusOneTop);
    }
    const minTop = plusOneTop + (offset - 1) * packStep;
    return Math.max(top, minTop);
  }

  if (!iconBand) return top;

  const aboveSelectedGap = readRecommendedStripAboveSelectedGapPx();
  const aboveIconGap = readRecommendedStripAboveIconGapPx();
  const packStep = fixedFocalPackedStep(rowHeight, gap, unselectedScale, packed);
  const maxTopAbove = recommendedStripMaxTopAboveIconAndSelected(
    selectedTop,
    rowHeight,
    iconBand,
    aboveSelectedGap,
    aboveIconGap,
  );

  let adjusted = top;

  const minusOneBase = fixedFocalItemTop(focalTopPx, -1, rowHeight, gap, unselectedScale, packed, iconBand);
  const minusOneTop = Math.min(minusOneBase, maxTopAbove);

  if (offset === -1) {
    return Math.min(adjusted, maxTopAbove);
  }

  if (offset < -1) {
    const minTop = minusOneTop - (-offset - 1) * packStep;
    return Math.min(adjusted, minTop);
  }

  return adjusted;
}
