/** Portrait cover height factor for width (400×533px ≈ 3:4). */
export const COVER_PORTRAIT_HEIGHT_FACTOR = 533 / 400;

/**
 * Space below the cover in virtualized grid cells (`.games-list-title-wrapper`:
 * margin-top 8px, gap 4px, title ~0.85rem, optional year ~0.75rem). Keep in sync with skin CSS.
 */
export const GRID_COVER_TITLE_BLOCK_HEIGHT = 48;

export function portraitCoverHeight(coverWidth: number): number {
  return coverWidth * COVER_PORTRAIT_HEIGHT_FACTOR;
}

/** react-window row height: cover + title block + inter-row gap (`--vgrid-gap-half` × 2). */
export function virtualizedCoverCellRowHeight(coverWidth: number, gap: number): number {
  return portraitCoverHeight(coverWidth) + GRID_COVER_TITLE_BLOCK_HEIGHT + gap;
}
