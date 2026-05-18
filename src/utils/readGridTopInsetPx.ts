function readCssVarHeightPx(mount: HTMLElement, cssVar: string): number {
  const doc = mount.ownerDocument ?? document;
  const probe = doc.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    `position:absolute!important;left:-99999px!important;top:0!important;width:1px!important;box-sizing:border-box!important;height:var(${cssVar},0px)!important;min-height:0!important;max-height:none!important;visibility:hidden!important;pointer-events:none!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important`;
  mount.appendChild(probe);
  const h = probe.offsetHeight;
  probe.remove();
  return Number.isFinite(h) && h > 0 ? h : 0;
}

function gridInsetMountCandidates(containerEl?: HTMLElement | null): HTMLElement[] {
  if (typeof document === "undefined") return [];
  if (!containerEl?.isConnected) return [document.documentElement];
  const mounts: HTMLElement[] = [containerEl];
  const list = containerEl.querySelector(".collections-list-container");
  if (list instanceof HTMLElement) mounts.push(list);
  const fade = containerEl.querySelector(".virtualized-list-fade");
  if (fade instanceof HTMLElement) mounts.push(fade);
  return mounts;
}

function gridInsetsDisabled(containerEl?: HTMLElement | null): boolean {
  return !!containerEl?.closest("[data-mhg-grid-insets='none']");
}

function readFirstCssVarHeightPx(
  mounts: HTMLElement[],
  cssVars: string[],
): number {
  for (const mount of mounts) {
    if (!mount.isConnected) continue;
    if (gridInsetsDisabled(mount)) return 0;
    for (const cssVar of cssVars) {
      const raw = getComputedStyle(mount).getPropertyValue(cssVar).trim();
      if (!raw) continue;
      // Honor explicit 0 in the cascade; do not fall through to :root page insets.
      return readCssVarHeightPx(mount, cssVar);
    }
  }
  return 0;
}

/**
 * Resolves `--mhg-grid-top-inset` to used CSS pixels for the given element's
 * cascade context (same as VirtualizedGamesList / VirtualizedCollectionsList).
 */
/** PS3 context-rail column 2 (detail + tag games beside the fixed cover). */
export function isContextRailGamesScroll(containerEl?: HTMLElement | null): boolean {
  return !!containerEl?.closest(
    ".library-item-detail-context-games, .tag-games-context-games",
  );
}

/**
 * Snap so each row's cover top lands on the context-rail align line (grid top inset).
 * scrollTop steps: 0, rowStepPx, 2*rowStepPx, …
 */
export function snapContextRailGamesScrollTop(
  scrollTop: number,
  maxScrollTop: number,
  rowStepPx: number,
): number {
  const stepPx = Math.max(1, Math.round(rowStepPx));
  const target = Math.round(scrollTop / stepPx) * stepPx;
  return Math.max(0, Math.min(maxScrollTop, target));
}

export function readGridTopInsetPx(containerEl?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  if (gridInsetsDisabled(containerEl)) return 0;
  const mounts = gridInsetMountCandidates(containerEl);
  if (mounts.length === 0) mounts.push(document.documentElement);
  return readFirstCssVarHeightPx(mounts, [
    "--mhg-grid-top-inset",
    "--mhg-grid-top-inset-collections",
    "--mhg-grid-top-inset-games",
    "--mhg-grid-top-inset-tag",
  ]);
}

/** First-cover line on collection-like pages only (ignores tag/games fallbacks). */
export function readGridTopInsetCollectionsPx(containerEl?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const mounts = gridInsetMountCandidates(containerEl);
  if (mounts.length === 0) mounts.push(document.documentElement);
  return readFirstCssVarHeightPx(mounts, [
    "--mhg-grid-top-inset-collections",
    "--mhg-grid-top-inset",
  ]);
}

/**
 * Same probe technique as `readGridTopInsetPx` for `--mhg-grid-bottom-inset`.
 */
export function readGridBottomInsetPx(containerEl?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  if (gridInsetsDisabled(containerEl)) return 0;
  const mounts = gridInsetMountCandidates(containerEl);
  if (mounts.length === 0) mounts.push(document.documentElement);
  return readFirstCssVarHeightPx(mounts, [
    "--mhg-grid-bottom-inset",
    "--mhg-grid-bottom-inset-collections",
    "--mhg-grid-bottom-inset-games",
  ]);
}

/** Row height for react-window when top/bottom grid insets are active. */
export function virtualizedGridRowHeightPx(
  rowIndex: number,
  lastRowIndex: number,
  itemHeight: number,
  topInset: number,
  bottomInset: number,
): number {
  let h = itemHeight;
  if (rowIndex === 0 && topInset > 0) h += topInset;
  if (rowIndex === lastRowIndex && bottomInset > 0) h += bottomInset;
  return h;
}

export function computeVirtualizedGridRowOffset(
  rowIndex: number,
  lastRowIndex: number,
  itemHeight: number,
  topInset: number,
): number {
  let offset = 0;
  for (let i = 0; i < rowIndex; i++) {
    offset += virtualizedGridRowHeightPx(i, lastRowIndex, itemHeight, topInset, 0);
  }
  return offset;
}

/** How far above the first-cover line the last cover may rise (px). */
export function computeVirtualizedGridLastCoverAlignTopPx(
  topInset: number,
  lastCoverRaisePx: number,
): number {
  if (topInset <= 0) return 0;
  return Math.max(0, topInset - Math.max(0, lastCoverRaisePx));
}

export function readGridLastCoverRaisePx(containerEl?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const mounts = gridInsetMountCandidates(containerEl);
  if (mounts.length === 0) mounts.push(document.documentElement);
  return readFirstCssVarHeightPx(mounts, [
    "--mhg-grid-last-cover-raise",
    "--mhg-grid-last-cover-raise-collections",
  ]);
}

/**
 * Minimum empty space after the last cover so scroll range is tall enough to
 * bring its top up to the raised align line, without exceeding it (clamp).
 */
export function computeVirtualizedGridTailInsetPx(
  viewportHeight: number,
  itemHeight: number,
  topInset: number,
  lastCoverRaisePx = 0,
): number {
  if (topInset <= 0 || viewportHeight <= 0 || itemHeight <= 0) return 0;
  const alignTop = computeVirtualizedGridLastCoverAlignTopPx(topInset, lastCoverRaisePx);
  return Math.max(0, Math.ceil(viewportHeight - alignTop - itemHeight));
}

/** Max `scrollTop` so the last cover cannot rise above the raised align line. */
export function computeVirtualizedGridAlignMaxScrollTop(
  rowCount: number,
  itemHeight: number,
  topInset: number,
  lastCoverRaisePx = 0,
): number {
  if (rowCount <= 0 || topInset <= 0) return Number.POSITIVE_INFINITY;
  const lastRowIndex = rowCount - 1;
  if (lastRowIndex <= 0) return 0;
  const alignTop = computeVirtualizedGridLastCoverAlignTopPx(topInset, lastCoverRaisePx);
  const lastRowOffset = computeVirtualizedGridRowOffset(
    lastRowIndex,
    lastRowIndex,
    itemHeight,
    topInset,
  );
  return Math.max(0, lastRowOffset - alignTop);
}

export function clampVirtualizedGridScrollTop(
  scrollTop: number,
  rowCount: number,
  itemHeight: number,
  topInset: number,
  scrollHeight: number,
  clientHeight: number,
  lastCoverRaisePx = 0,
): number {
  const nativeMax = Math.max(0, scrollHeight - clientHeight);
  if (topInset <= 0 || rowCount <= 1) {
    return Math.max(0, Math.min(nativeMax, scrollTop));
  }
  const alignMax = computeVirtualizedGridAlignMaxScrollTop(
    rowCount,
    itemHeight,
    topInset,
    lastCoverRaisePx,
  );
  const max = Math.min(nativeMax, alignMax);
  return Math.max(0, Math.min(max, scrollTop));
}
