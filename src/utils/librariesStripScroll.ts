/** Ignore sub-pixel / rounding slack when deciding if horizontal scroll is needed. */
const OVERFLOW_SLACK_PX = 2;

/** Meaningful children of the horizontal library icon strip (exclude error placeholders). */
function librariesStripScrollChildren(container: HTMLElement): HTMLElement[] {
  return [...container.children].filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && !node.classList.contains("mhg-libraries-error"),
  );
}

/**
 * Max `scrollLeft` so the right edge of the last tile aligns with the strip viewport.
 * Uses layout boxes instead of `scrollWidth`, which skins can inflate with padding/reserves.
 */
export function maxLibrariesStripScrollLeft(container: HTMLElement): number {
  const children = librariesStripScrollChildren(container);
  if (children.length === 0) return 0;

  const last = children[children.length - 1]!;
  const viewport = container.getBoundingClientRect();
  const contentRight = container.scrollLeft + (last.getBoundingClientRect().right - viewport.left);
  return Math.max(0, Math.ceil(contentRight - container.clientWidth));
}

export function librariesStripNeedsHorizontalScroll(container: HTMLElement): boolean {
  return maxLibrariesStripScrollLeft(container) > OVERFLOW_SLACK_PX;
}

export function clampLibrariesStripScrollLeft(container: HTMLElement): boolean {
  const max = maxLibrariesStripScrollLeft(container);
  if (container.scrollLeft <= max) return false;
  container.scrollLeft = max;
  return true;
}

/** Clamp when needed; disable horizontal overflow when every tile already fits. */
export function syncLibrariesStripScroll(container: HTMLElement): void {
  if (!librariesStripNeedsHorizontalScroll(container)) {
    if (container.scrollLeft !== 0) container.scrollLeft = 0;
    container.style.overflowX = "hidden";
    return;
  }

  container.style.removeProperty("overflow-x");
  clampLibrariesStripScrollLeft(container);
}
