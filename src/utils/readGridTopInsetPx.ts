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
  const tagList = containerEl.querySelector(".fixed-focal-tag-list");
  if (tagList instanceof HTMLElement) mounts.push(tagList);
  const collectionsList = containerEl.querySelector(".fixed-focal-collections-list");
  if (collectionsList instanceof HTMLElement) mounts.push(collectionsList);
  const gamesList = containerEl.querySelector(".fixed-focal-games-list");
  if (gamesList instanceof HTMLElement) mounts.push(gamesList);
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
/** Context-rail column 2 (detail + tag games beside the fixed cover). */
export function isContextRailGamesScroll(containerEl?: HTMLElement | null): boolean {
  return !!containerEl?.closest(
    ".library-item-detail-context-games, .tag-games-context-games",
  );
}

/** Leading offset of column-2 covers (wrapper padding or grid top inset). */
export function readContextRailCoverTopPx(containerEl?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const host =
    containerEl?.closest(".library-item-detail-context-games, .tag-games-context-games") ??
    containerEl;
  const mounts =
    host instanceof HTMLElement ? [host] : gridInsetMountCandidates(containerEl);
  if (mounts.length === 0) mounts.push(document.documentElement);
  return readFirstCssVarHeightPx(mounts, ["--mhg-context-rail-cover-top"]);
}

/**
 * Context-rail fixed-focal: selected slot Y so cover tops line up with column-1
 * (collection/tag cover). Falls back to `--mhg-context-rail-cover-top`.
 */
export function readContextRailFocalTopPx(
  listEl?: HTMLElement | null,
  scrollContainerEl?: HTMLElement | null,
): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;

  const list = listEl?.isConnected ? listEl : null;
  const doc = list?.ownerDocument ?? scrollContainerEl?.ownerDocument ?? document;
  const col1Cover = doc.querySelector(
    ".library-item-detail-context-rail-cover, .tag-games-context-rail-cover",
  );

  if (list && col1Cover instanceof HTMLElement) {
    const coverTop = col1Cover.getBoundingClientRect().top;
    const listTop = list.getBoundingClientRect().top;
    const aligned = coverTop - listTop;
    if (Number.isFinite(aligned) && aligned >= 0) {
      return aligned;
    }
  }

  return readContextRailCoverTopPx(scrollContainerEl);
}

/** Fixed-focal games list: library bar on main pages, context-rail line on detail. */
export function readFixedFocalGamesTopPx(
  listEl?: HTMLElement | null,
  scrollContainerEl?: HTMLElement | null,
): number {
  if (isContextRailGamesScroll(scrollContainerEl)) {
    return readContextRailFocalTopPx(listEl, scrollContainerEl);
  }
  return readFixedFocalTopPx(listEl, scrollContainerEl);
}

/**
 * Max scrollTop so the last cover's top meets the same grid line as the first (y=0 in the scroller).
 */
export function computeContextRailGamesAlignMaxScrollTop(
  rowCount: number,
  itemHeight: number,
  gridTopInset: number,
  lastCoverRaisePx = 0,
): number {
  if (rowCount <= 1 || itemHeight <= 0) return 0;
  if (gridTopInset > 0) {
    return computeVirtualizedGridAlignMaxScrollTop(
      rowCount,
      itemHeight,
      gridTopInset,
      lastCoverRaisePx,
    );
  }
  return Math.max(0, (rowCount - 1) * itemHeight);
}

export function clampContextRailGamesScrollTop(
  scrollTop: number,
  nativeMaxScrollTop: number,
  alignMaxScrollTop: number,
): number {
  const cap = Math.min(nativeMaxScrollTop, Math.max(0, alignMaxScrollTop));
  return Math.max(0, Math.min(cap, scrollTop));
}

/**
 * Snap so each row's cover top lands on the context-rail align line (grid top inset).
 * scrollTop steps: 0, rowStepPx, 2*rowStepPx, …
 */
export function snapContextRailGamesScrollTop(
  scrollTop: number,
  maxScrollTop: number,
  rowStepPx: number,
  alignMaxScrollTop?: number,
): number {
  const stepPx = Math.max(1, Math.round(rowStepPx));
  const cap =
    alignMaxScrollTop !== undefined && Number.isFinite(alignMaxScrollTop)
      ? Math.min(maxScrollTop, Math.max(0, alignMaxScrollTop))
      : maxScrollTop;

  if (
    alignMaxScrollTop !== undefined &&
    Number.isFinite(alignMaxScrollTop) &&
    scrollTop >= alignMaxScrollTop - stepPx / 2
  ) {
    return cap;
  }

  const target = Math.round(scrollTop / stepPx) * stepPx;
  return Math.max(0, Math.min(cap, target));
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

function readFocalBelowBarGapPx(doc: Document = document): number {
  const raw = parseFloat(
    getComputedStyle(doc.documentElement).getPropertyValue("--mhg-cover-scale-focal-below-bar"),
  );
  return Number.isFinite(raw) ? raw : 2;
}

/**
 * Fixed-focal selected slot: offset from the list root so the cover top sits on
 * the library bar bottom + focal gap (same line as library games /
 * `useCoverScaleAroundBar`).
 */
export function readFixedFocalTopPx(
  listEl?: HTMLElement | null,
  scrollContainerEl?: HTMLElement | null,
): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  if (gridInsetsDisabled(scrollContainerEl)) return 0;

  const list = listEl?.isConnected ? listEl : null;
  const doc = list?.ownerDocument ?? scrollContainerEl?.ownerDocument ?? document;

  if (list) {
    const bar = doc.querySelector(".mhg-libraries-bar");
    if (bar instanceof HTMLElement) {
      const barBottom = bar.getBoundingClientRect().bottom;
      const listTop = list.getBoundingClientRect().top;
      const aligned = barBottom + readFocalBelowBarGapPx(doc) - listTop;
      if (Number.isFinite(aligned) && aligned > 0) {
        return aligned;
      }
    }
  }

  const mounts = gridInsetMountCandidates(scrollContainerEl);
  if (mounts.length === 0) mounts.push(doc.documentElement);
  return readFirstCssVarHeightPx(mounts, [
    "--mhg-grid-top-inset-games",
    "--mhg-grid-top-inset",
    "--mhg-grid-top-inset-collections",
  ]);
}

/**
 * Vista Tabella (`viewMode.table`): top inset for the sticky header section so
 * column titles sit on the same line as fixed-focal grid covers.
 */
export function readTableViewHeaderTopInsetPx(
  contentWrapperEl?: HTMLElement | null,
): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  if (gridInsetsDisabled(contentWrapperEl)) return 0;

  const wrapperEl = contentWrapperEl?.isConnected ? contentWrapperEl : null;
  const doc = wrapperEl?.ownerDocument ?? document;

  if (wrapperEl) {
    const bar = doc.querySelector(".mhg-libraries-bar");
    if (bar instanceof HTMLElement) {
      const barBottom = bar.getBoundingClientRect().bottom;
      const wrapperTop = wrapperEl.getBoundingClientRect().top;
      const aligned = barBottom + readFocalBelowBarGapPx(doc) - wrapperTop;
      if (Number.isFinite(aligned) && aligned >= 0) {
        return aligned;
      }
    }
  }

  const mounts = gridInsetMountCandidates(contentWrapperEl);
  if (mounts.length === 0) mounts.push(doc.documentElement);
  return readFirstCssVarHeightPx(mounts, [
    "--mhg-grid-top-inset-games",
    "--mhg-grid-top-inset",
  ]);
}

/**
 * Vista Dettaglio (`viewMode.detail`): padding-top on the page scroll container so
 * the first row's cover sits on the same line as fixed-focal grid covers.
 */
export function readDetailViewScrollPaddingTopPx(
  scrollContainerEl?: HTMLElement | null,
): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  if (gridInsetsDisabled(scrollContainerEl)) return 0;

  const scrollEl = scrollContainerEl?.isConnected ? scrollContainerEl : null;
  const doc = scrollEl?.ownerDocument ?? document;

  if (scrollEl) {
    const bar = doc.querySelector(".mhg-libraries-bar");
    if (bar instanceof HTMLElement) {
      const barBottom = bar.getBoundingClientRect().bottom;
      const scrollTop = scrollEl.getBoundingClientRect().top;
      const aligned = barBottom + readFocalBelowBarGapPx(doc) - scrollTop;
      if (Number.isFinite(aligned) && aligned >= 0) {
        return aligned;
      }
    }
  }

  const mounts = gridInsetMountCandidates(scrollContainerEl);
  if (mounts.length === 0) mounts.push(doc.documentElement);
  const fromViewport = readFirstCssVarHeightPx(mounts, [
    "--mhg-grid-top-inset-games",
    "--mhg-grid-top-inset",
  ]);
  if (!scrollEl || fromViewport <= 0) return fromViewport;

  const scrollTop = scrollEl.getBoundingClientRect().top;
  if (!Number.isFinite(scrollTop) || scrollTop <= 0) return fromViewport;
  return Math.max(0, fromViewport - scrollTop);
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
