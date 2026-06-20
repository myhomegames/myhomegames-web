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

const STRIP_ACTIVE_SELECTOR =
  ".mhg-library-active, .mhg-collection-shortcut-button--selected";

/** Layout inputs for keeping the vertical cover + title rail on screen after strip scroll. */
export type VerticalCoverRailScrollLayout = {
  /** Screen X of the rail left edge when the icon center is at 0 (typically alignHalf − shift). */
  railLeftOffsetFromIconCenter: number;
  /** `--mhg-vertical-column-width` / tag variant before viewport clamp. */
  columnWidthMax: number;
  /** Right viewport inset (`--mhg-vertical-column-viewport-margin`). */
  viewportMargin: number;
};

function readCssLengthPx(doc: Document, name: string, fallback: number): number {
  const raw = parseFloat(getComputedStyle(doc.documentElement).getPropertyValue(name));
  return Number.isFinite(raw) ? raw : fallback;
}

/** PS3 vertical rail: tag index aligns on cover half-width; other pages use rail half-width − shift. */
export function verticalCoverRailScrollLayoutForPath(
  pathname: string,
  doc: Document = document,
): VerticalCoverRailScrollLayout {
  const viewportMargin = readCssLengthPx(doc, "--mhg-vertical-column-viewport-margin", 72);

  if (pathname === "/tags" || pathname.startsWith("/tags/")) {
    const tagCoverSize = readCssLengthPx(doc, "--tag-list-cover-size", 150);
    return {
      railLeftOffsetFromIconCenter: tagCoverSize / 2,
      columnWidthMax: readCssLengthPx(
        doc,
        "--mhg-tag-vertical-column-width",
        readCssLengthPx(doc, "--mhg-vertical-column-width", 480),
      ),
      viewportMargin,
    };
  }

  const alignHalfWidth = readCssLengthPx(doc, "--mhg-vertical-rail-align-half-width", 180);
  const shiftX =
    pathname === "/recommended" || pathname.startsWith("/recommended/")
      ? readCssLengthPx(doc, "--mhg-recommended-column-shift-x", 72)
      : readCssLengthPx(doc, "--mhg-vertical-column-shift-x", 0);

  return {
    railLeftOffsetFromIconCenter: alignHalfWidth - shiftX,
    columnWidthMax: readCssLengthPx(doc, "--mhg-vertical-column-width", 480),
    viewportMargin,
  };
}

/**
 * Icon center X (viewport coords) so the cover + title column fits horizontally.
 * Centers the rail when there is room; otherwise clamps to the feasible range.
 */
export function targetActiveLibraryIconCenterX(
  viewportWidth: number,
  layout: VerticalCoverRailScrollLayout,
): number {
  const columnWidth = Math.min(
    layout.columnWidthMax,
    Math.max(0, viewportWidth - layout.viewportMargin),
  );
  const minX = layout.railLeftOffsetFromIconCenter;
  const maxX = viewportWidth - columnWidth + minX;
  if (maxX <= minX) return minX;
  return (minX + maxX) / 2;
}

/**
 * When the horizontal library strip overflows, scroll so the active icon sits where
 * the vertical cover + title rail fits on screen (not merely centered in the strip).
 */
export function centerActiveLibraryInStrip(
  container: HTMLElement,
  layout?: VerticalCoverRailScrollLayout,
): boolean {
  if (!librariesStripNeedsHorizontalScroll(container)) return false;

  const active = container.querySelector<HTMLElement>(STRIP_ACTIVE_SELECTOR);
  if (!active) return false;

  const stripViewport = container.getBoundingClientRect();
  const tile = active.getBoundingClientRect();
  const currentCenterX = tile.left + tile.width / 2;
  const viewportWidth =
    typeof window !== "undefined" && window.innerWidth > 0
      ? window.innerWidth
      : stripViewport.width;
  const railLayout = layout ?? verticalCoverRailScrollLayoutForPath("", container.ownerDocument);
  const targetCenterX = targetActiveLibraryIconCenterX(viewportWidth, railLayout);
  const targetScroll = container.scrollLeft + currentCenterX - targetCenterX;
  const max = maxLibrariesStripScrollLeft(container);
  container.scrollLeft = Math.max(0, Math.min(max, Math.round(targetScroll)));
  clampLibrariesStripScrollLeft(container);
  return true;
}
