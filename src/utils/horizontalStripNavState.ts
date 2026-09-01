/** Fired on `.scrollable-section` after D-pad moves focus along a virtualized strip. */
export const STRIP_NAV_SYNC_EVENT = "mhg-strip-nav-sync";

export function readAbsoluteStripCoverIndex(cover: HTMLElement): number | null {
  const cell = cover.closest("[data-mhg-strip-index]") as HTMLElement | null;
  if (!cell) return null;
  const n = parseInt(cell.getAttribute("data-mhg-strip-index") || "", 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function readStripColumnCount(
  sectionScroll: HTMLElement,
  scroller: HTMLElement,
): number | null {
  const candidates = [
    sectionScroll.getAttribute("data-mhg-strip-column-count"),
    scroller.getAttribute("data-mhg-strip-column-count"),
    sectionScroll
      .querySelector("[data-mhg-strip-column-count]")
      ?.getAttribute("data-mhg-strip-column-count"),
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function stripNavFromAbsoluteIndex(
  absoluteIndex: number,
  columnCount: number,
): { canScrollLeft: boolean; canScrollRight: boolean } {
  const idx = Math.max(0, Math.min(columnCount - 1, absoluteIndex));
  return {
    canScrollLeft: idx > 0,
    canScrollRight: idx < columnCount - 1,
  };
}

export function notifyStripNavSync(strip: HTMLElement): void {
  strip.closest(".scrollable-section")?.dispatchEvent(
    new Event(STRIP_NAV_SYNC_EVENT, { bubbles: false }),
  );
}
