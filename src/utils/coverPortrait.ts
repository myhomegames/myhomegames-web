/** Portrait cover height factor for width (400×533px ≈ 3:4). */
export const COVER_PORTRAIT_HEIGHT_FACTOR = 533 / 400;

export function portraitCoverHeight(coverWidth: number): number {
  return coverWidth * COVER_PORTRAIT_HEIGHT_FACTOR;
}
