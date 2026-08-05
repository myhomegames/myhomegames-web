import { useRef, useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Grid } from "react-window";
import type { TagItem } from "../../types";
import { TagListItem } from "./TagList";
import { useSkin } from "../../contexts/SkinContext";
import { useCoverScaleAroundBar } from "../../hooks/useCoverScaleAroundBar";
import {
  clampVirtualizedGridScrollTop,
  computeVirtualizedGridAlignMaxScrollTop,
  computeVirtualizedGridTailInsetPx,
  readGridLastCoverRaisePx,
  readGridTopInsetPx,
  virtualizedGridRowHeightPx,
} from "../../utils/readGridTopInsetPx";
import { MHG_LIST_TOOLBAR_CHROME_SYNC_EVENT } from "../../utils/syncInlineListToolbarChrome";
import {
  findCoverByTvFocusIdentity,
  MHG_TV_ENSURE_COVER_VISIBLE,
  type TvCoverFocusIdentity,
} from "../../utils/tvCoverFocusRestore";

function getScrollPosition(key: string): { scrollTop: number; scrollLeft: number } | null {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return { scrollTop: parsed.scrollTop ?? 0, scrollLeft: parsed.scrollLeft ?? 0 };
  } catch {
    return null;
  }
}

function setScrollPosition(key: string, scrollTop: number, scrollLeft: number): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ scrollTop, scrollLeft }));
  } catch {
    // Ignore
  }
}

function findTagVirtualizedScroller(root: HTMLElement): HTMLElement | null {
  const gridEl =
    (root.querySelector(".tag-list-container--virtualized .virtualized-tags-grid") as HTMLElement | null) ??
    (root.querySelector(".virtualized-tags-grid") as HTMLElement | null);
  if (gridEl) return gridEl;
  const loose = root.querySelector('[style*="overflow"]') as HTMLElement | null;
  if (!loose) return null;
  if (loose.scrollHeight > loose.clientHeight || loose.scrollWidth > loose.clientWidth) return loose;
  return null;
}

function resolveTagScrollHost(
  grid: { element?: HTMLElement | null } | null,
  containerRoot: HTMLElement | null,
): HTMLElement | null {
  if (containerRoot) {
    const fromDom = findTagVirtualizedScroller(containerRoot);
    if (fromDom) return fromDom;
  }
  if (grid?.element instanceof HTMLElement) return grid.element;
  return null;
}

/** 16:9 tag cards (overlay title) — height matches `.tag-list-item` cover box. */
function tagLandscapeCellRowHeight(coverWidth: number, gap: number): number {
  return coverWidth * (9 / 16) + gap;
}

type VirtualizedTagListProps = {
  items: TagItem[];
  coverSize: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onItemEdit?: (item: TagItem) => void;
  getDisplayName?: (item: TagItem) => string;
  getCoverUrl?: (item: TagItem) => string;
  getRoute?: (item: TagItem) => string;
  routeBase?: string;
};

const DEFAULT_GAP = 40;
const OVERSCAN_COUNT = 2;
const DEFAULT_MIN_SIDE_GUTTER = 56;
const LEFT_GUTTER_TRIM_WHEN_ALPHABET_NAV = 8;
const RAIL_GUTTER_FLOOR_PX = 4;

function readGridSpacing(): {
  gap: number;
  minLeftGutter: number;
  minRightGutter: number;
} {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      gap: DEFAULT_GAP,
      minLeftGutter: DEFAULT_MIN_SIDE_GUTTER,
      minRightGutter: DEFAULT_MIN_SIDE_GUTTER,
    };
  }
  const style = getComputedStyle(document.documentElement);
  const gapHalf = parseFloat(style.getPropertyValue("--vgrid-gap-half"));
  const fallbackGutter = parseFloat(style.getPropertyValue("--vgrid-side-gutter"));
  const leftGutter = parseFloat(style.getPropertyValue("--vgrid-side-gutter-left"));
  const rightGutter = parseFloat(style.getPropertyValue("--vgrid-side-gutter-right"));
  const resolvedFallback = Number.isFinite(fallbackGutter) ? fallbackGutter : DEFAULT_MIN_SIDE_GUTTER;
  return {
    gap: Number.isFinite(gapHalf) ? gapHalf * 2 : DEFAULT_GAP,
    minLeftGutter: Number.isFinite(leftGutter) ? leftGutter : resolvedFallback,
    minRightGutter: Number.isFinite(rightGutter) ? rightGutter : resolvedFallback,
  };
}

/**
 * Virtualized tag/index grids (platforms, series, themes, …).
 * Large series libraries mount hundreds of 16:9 covers — without this, Smart TV
 * D-pad walks the entire DOM on every key.
 */
export default function VirtualizedTagList({
  items,
  coverSize,
  containerRef,
  itemRefs,
  onItemEdit,
  getDisplayName,
  getCoverUrl,
  getRoute,
  routeBase = "",
}: VirtualizedTagListProps) {
  const location = useLocation();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [alphabetNavPresent, setAlphabetNavPresent] = useState(false);
  const [isScrollRestored, setIsScrollRestored] = useState(false);
  const [spacing, setSpacing] = useState(() => readGridSpacing());
  const { gap: GAP, minLeftGutter: MIN_LEFT_GUTTER, minRightGutter: MIN_RIGHT_GUTTER } = spacing;
  const [firstCoverInset, setFirstCoverInset] = useState(() => readGridTopInsetPx(containerRef.current));
  const [lastCoverRaisePx, setLastCoverRaisePx] = useState(() =>
    readGridLastCoverRaisePx(containerRef.current),
  );
  const { activeSkinId } = useSkin();
  const gridRef = useRef<{ element?: HTMLElement | null } | null>(null);
  const isRestoringRef = useRef(false);
  const lastSavedScrollRef = useRef<{ scrollTop: number; scrollLeft: number } | null>(null);
  useCoverScaleAroundBar({ gridRef, containerRef });
  const storageKey = `${location.pathname}:tags:${routeBase || "list"}`;

  const columnCount = useMemo(() => {
    if (dimensions.width === 0) return 1;
    const itemWidthWithGap = coverSize + GAP;
    const usableWidth = Math.max(coverSize, dimensions.width - MIN_LEFT_GUTTER - MIN_RIGHT_GUTTER);
    return Math.max(1, Math.floor((usableWidth + GAP) / itemWidthWithGap));
  }, [dimensions.width, coverSize, GAP, MIN_LEFT_GUTTER, MIN_RIGHT_GUTTER]);

  const rowCount = useMemo(
    () => Math.ceil(items.length / columnCount),
    [items.length, columnCount],
  );

  const { displayCoverSize, gridContentWidth, leftGutter, rightGutter, itemWidth, itemHeight } =
    useMemo(() => {
      const gap = GAP;
      const w = dimensions.width;
      let displayCoverSize = coverSize;
      let gridContentWidth = Math.max(
        displayCoverSize + gap,
        columnCount * (displayCoverSize + gap),
      );

      const remainingWidth = Math.max(
        0,
        w - gridContentWidth - MIN_LEFT_GUTTER - MIN_RIGHT_GUTTER,
      );
      const baseLeft = MIN_LEFT_GUTTER + Math.floor(remainingWidth / 2);
      const baseRight = MIN_RIGHT_GUTTER + Math.ceil(remainingWidth / 2);
      const trim = alphabetNavPresent ? LEFT_GUTTER_TRIM_WHEN_ALPHABET_NAV : 0;
      let leftGutter = Math.max(MIN_LEFT_GUTTER - trim, baseLeft - trim);
      let rightGutter = baseRight;

      if (w > 0) {
        let total = leftGutter + gridContentWidth + rightGutter;
        if (total > w) {
          let over = total - w;
          while (over > 0 && (leftGutter > RAIL_GUTTER_FLOOR_PX || rightGutter > RAIL_GUTTER_FLOOR_PX)) {
            if (leftGutter >= rightGutter && leftGutter > RAIL_GUTTER_FLOOR_PX) {
              leftGutter -= 1;
              over -= 1;
            } else if (rightGutter > RAIL_GUTTER_FLOOR_PX) {
              rightGutter -= 1;
              over -= 1;
            } else if (leftGutter > RAIL_GUTTER_FLOOR_PX) {
              leftGutter -= 1;
              over -= 1;
            } else {
              break;
            }
          }
          total = leftGutter + gridContentWidth + rightGutter;
          if (total > w) {
            const inner = Math.max(0, w - leftGutter - rightGutter);
            const maxCover = Math.max(
              64,
              Math.floor((inner - columnCount * gap) / Math.max(1, columnCount)),
            );
            displayCoverSize = Math.max(64, Math.min(coverSize, maxCover));
            gridContentWidth = Math.max(
              displayCoverSize + gap,
              columnCount * (displayCoverSize + gap),
            );
          }
        }
      }

      const itemWidth = displayCoverSize;
      const itemHeight = tagLandscapeCellRowHeight(displayCoverSize, gap);
      return { displayCoverSize, gridContentWidth, leftGutter, rightGutter, itemWidth, itemHeight };
    }, [
      dimensions.width,
      coverSize,
      columnCount,
      GAP,
      MIN_LEFT_GUTTER,
      MIN_RIGHT_GUTTER,
      alphabetNavPresent,
    ]);

  const lastRowIndex = Math.max(0, rowCount - 1);

  const tailInset = useMemo(
    () =>
      firstCoverInset > 0 && rowCount > 1
        ? computeVirtualizedGridTailInsetPx(
            dimensions.height,
            itemHeight,
            firstCoverInset,
            lastCoverRaisePx,
          )
        : 0,
    [dimensions.height, itemHeight, firstCoverInset, lastCoverRaisePx, rowCount],
  );

  const alignMaxScrollTop = useMemo(
    () =>
      computeVirtualizedGridAlignMaxScrollTop(
        rowCount,
        itemHeight,
        firstCoverInset,
        lastCoverRaisePx,
      ),
    [rowCount, itemHeight, firstCoverInset, lastCoverRaisePx],
  );

  const clampScrollerScrollTop = (el: HTMLElement, scrollTop: number) =>
    clampVirtualizedGridScrollTop(
      scrollTop,
      rowCount,
      itemHeight,
      firstCoverInset,
      el.scrollHeight,
      el.clientHeight,
      lastCoverRaisePx,
    );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const refresh = () => {
      setFirstCoverInset(readGridTopInsetPx(el));
      setLastCoverRaisePx(readGridLastCoverRaisePx(el));
    };
    setSpacing(readGridSpacing());
    refresh();
    const t = window.setTimeout(() => {
      setSpacing(readGridSpacing());
      refresh();
    }, 50);
    const t2 = window.setTimeout(refresh, 200);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [activeSkinId, containerRef, items.length, rowCount, itemHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const layout = el.closest(".home-page-layout");
    if (!layout) return;
    const sync = () =>
      setAlphabetNavPresent(!!layout.querySelector(".home-page-alphabet-container"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(layout, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [containerRef, items.length]);

  useEffect(() => {
    let rafId: number | null = null;

    const updateDimensions = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padBottom = parseFloat(cs.paddingBottom) || 0;
      const padLeft = parseFloat(cs.paddingLeft) || 0;
      const padRight = parseFloat(cs.paddingRight) || 0;
      const contentWidth = Math.max(0, rect.width - padLeft - padRight);
      let contentHeight = Math.max(0, rect.height - padTop - padBottom);

      const fade = el.querySelector<HTMLElement>(
        ".tag-list-container--virtualized .virtualized-list-fade",
      );
      if (fade) {
        const marginTopPx = parseFloat(window.getComputedStyle(fade).marginTop);
        if (Number.isFinite(marginTopPx) && marginTopPx < 0) {
          contentHeight += -marginTopPx;
        }
      }

      setFirstCoverInset(readGridTopInsetPx(el));
      setLastCoverRaisePx(readGridLastCoverRaisePx(el));
      setDimensions({
        width: contentWidth || rect.width,
        height: contentHeight || rect.height || window.innerHeight - 200,
      });
    };

    const updateDimensionsRaf = () => {
      updateDimensions();
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateDimensions();
      });
    };

    updateDimensionsRaf();
    window.addEventListener("resize", updateDimensionsRaf);
    window.addEventListener(MHG_LIST_TOOLBAR_CHROME_SYNC_EVENT, updateDimensionsRaf);
    const resizeObserver = new ResizeObserver(updateDimensionsRaf);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateDimensionsRaf);
      window.removeEventListener(MHG_LIST_TOOLBAR_CHROME_SYNC_EVENT, updateDimensionsRaf);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  useEffect(() => {
    const savedPosition = getScrollPosition(storageKey);

    if (!savedPosition || (savedPosition.scrollTop === 0 && savedPosition.scrollLeft === 0)) {
      setIsScrollRestored(true);
      return;
    }

    if (dimensions.height === 0 || rowCount === 0 || columnCount === 0) {
      const safety = setTimeout(() => setIsScrollRestored(true), 1500);
      return () => clearTimeout(safety);
    }

    isRestoringRef.current = true;
    setIsScrollRestored(false);

    const safetyReveal = setTimeout(() => {
      isRestoringRef.current = false;
      setIsScrollRestored(true);
    }, 1500);

    const markRestored = () => {
      isRestoringRef.current = false;
      clearTimeout(safetyReveal);
      setIsScrollRestored(true);
    };

    const restoreScroll = (attempt = 0) => {
      const grid = gridRef.current;
      if (!grid) {
        if (attempt < 50) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          markRestored();
        }
        return;
      }

      const gridElement = resolveTagScrollHost(grid, containerRef.current);
      if (!gridElement) {
        if (attempt < 50) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          markRestored();
        }
        return;
      }

      try {
        const restoredTop = clampVirtualizedGridScrollTop(
          savedPosition.scrollTop,
          rowCount,
          itemHeight,
          firstCoverInset,
          gridElement.scrollHeight,
          gridElement.clientHeight,
          lastCoverRaisePx,
        );
        gridElement.scrollTop = restoredTop;
        gridElement.scrollLeft = savedPosition.scrollLeft;

        setTimeout(() => {
          if (
            Math.abs(gridElement.scrollTop - restoredTop) > 10 ||
            Math.abs(gridElement.scrollLeft - savedPosition.scrollLeft) > 10
          ) {
            if (attempt < 5) {
              gridElement.scrollTop = restoredTop;
              gridElement.scrollLeft = savedPosition.scrollLeft;
            }
          }
          setTimeout(markRestored, 50);
        }, 50);
      } catch {
        if (attempt < 10) {
          setTimeout(() => restoreScroll(attempt + 1), 100);
        } else {
          markRestored();
        }
      }
    };

    const timer = setTimeout(() => restoreScroll(), 80);
    return () => {
      clearTimeout(timer);
      clearTimeout(safetyReveal);
      isRestoringRef.current = false;
    };
  }, [
    location.pathname,
    storageKey,
    dimensions.height,
    rowCount,
    columnCount,
    itemHeight,
    firstCoverInset,
    lastCoverRaisePx,
    containerRef,
  ]);

  useEffect(() => {
    const onEnsure = (ev: Event) => {
      const identity = (ev as CustomEvent<TvCoverFocusIdentity>).detail;
      if (!identity || identity.kind !== "tag") return;
      if (findCoverByTvFocusIdentity(identity)) return;
      const index = items.findIndex((item) => String(item.id) === identity.id);
      if (index < 0 || columnCount <= 0 || itemHeight <= 0) return;
      const gridElement = resolveTagScrollHost(gridRef.current, containerRef.current);
      if (!gridElement) return;
      const row = Math.floor(index / columnCount);
      const col = index % columnCount;
      const lastRow = Math.max(0, rowCount - 1);
      let scrollTop = 0;
      for (let r = 0; r < row; r++) {
        scrollTop += virtualizedGridRowHeightPx(
          r,
          lastRow,
          itemHeight,
          firstCoverInset,
          tailInset,
        );
      }
      isRestoringRef.current = true;
      gridElement.scrollTop = scrollTop;
      gridElement.scrollLeft = col * (itemWidth + GAP);
      window.setTimeout(() => {
        isRestoringRef.current = false;
        setIsScrollRestored(true);
      }, 50);
    };
    window.addEventListener(MHG_TV_ENSURE_COVER_VISIBLE, onEnsure);
    return () => window.removeEventListener(MHG_TV_ENSURE_COVER_VISIBLE, onEnsure);
  }, [
    items,
    columnCount,
    rowCount,
    itemHeight,
    itemWidth,
    GAP,
    firstCoverInset,
    tailInset,
    containerRef,
  ]);

  useEffect(() => {
    lastSavedScrollRef.current = getScrollPosition(storageKey);

    let cancelled = false;
    const attachTimers: number[] = [];
    let scrollTimeout: number | null = null;
    let cleanupFn: (() => void) | null = null;

    const flushSave = (gridElement: HTMLElement) => {
      if (cancelled || isRestoringRef.current) return;
      const scrollTop = gridElement.scrollTop;
      const scrollLeft = gridElement.scrollLeft;
      if (
        !lastSavedScrollRef.current ||
        lastSavedScrollRef.current.scrollTop !== scrollTop ||
        lastSavedScrollRef.current.scrollLeft !== scrollLeft
      ) {
        setScrollPosition(storageKey, scrollTop, scrollLeft);
        lastSavedScrollRef.current = { scrollTop, scrollLeft };
      }
    };

    const tryAttach = (attempt: number): void => {
      if (cancelled) return;
      const root = containerRef.current;
      if (!root) {
        if (attempt < 40) {
          attachTimers.push(window.setTimeout(() => tryAttach(attempt + 1), 50));
        }
        return;
      }
      const gridElement = resolveTagScrollHost(gridRef.current, root);
      if (!gridElement) {
        if (attempt < 40) {
          attachTimers.push(window.setTimeout(() => tryAttach(attempt + 1), 50));
        }
        return;
      }

      const handleScroll = () => {
        if (scrollTimeout !== null) window.clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(() => {
          scrollTimeout = null;
          flushSave(gridElement);
        }, 100);
      };

      gridElement.addEventListener("scroll", handleScroll, { passive: true });
      cleanupFn = () => {
        gridElement.removeEventListener("scroll", handleScroll);
        if (scrollTimeout !== null) {
          window.clearTimeout(scrollTimeout);
          scrollTimeout = null;
        }
        if (!isRestoringRef.current) flushSave(gridElement);
      };
    };

    tryAttach(0);
    return () => {
      cancelled = true;
      attachTimers.forEach((id) => window.clearTimeout(id));
      if (cleanupFn) cleanupFn();
    };
  }, [
    containerRef,
    storageKey,
    dimensions.width,
    dimensions.height,
    items.length,
    rowCount,
    columnCount,
    itemHeight,
  ]);

  useEffect(() => {
    if (firstCoverInset <= 0) return;
    const root = containerRef.current;
    if (!root) return;
    const el = resolveTagScrollHost(gridRef.current, root);
    if (!el) return;
    const clamped = clampScrollerScrollTop(el, el.scrollTop);
    if (clamped !== el.scrollTop) el.scrollTop = clamped;
  }, [
    alignMaxScrollTop,
    firstCoverInset,
    lastCoverRaisePx,
    tailInset,
    rowCount,
    itemHeight,
    dimensions.height,
    containerRef,
  ]);

  useEffect(() => {
    if (containerRef && "current" in containerRef && containerRef.current) {
      (containerRef.current as HTMLDivElement & { __virtualizedGridRef?: typeof gridRef }).__virtualizedGridRef =
        gridRef;
    }
  }, [containerRef]);

  const Cell = ({
    columnIndex,
    rowIndex,
    style,
  }: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
  }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= items.length) {
      return <div style={style} />;
    }

    const item = items[index]!;
    const isTopInsetRow = rowIndex === 0 && firstCoverInset > 0;
    const isTailInsetRow = rowIndex === lastRowIndex && tailInset > 0;

    return (
      <div style={style}>
        {isTopInsetRow && <div style={{ height: firstCoverInset, flexShrink: 0 }} />}
        <div className="virtualized-grid-cell-pad">
          <TagListItem
            item={item}
            coverSize={displayCoverSize}
            itemRefs={itemRefs}
            onItemEdit={onItemEdit}
            getDisplayName={getDisplayName}
            getCoverUrl={getCoverUrl}
            getRoute={getRoute}
          />
        </div>
        {isTailInsetRow && <div style={{ height: tailInset, flexShrink: 0 }} />}
      </div>
    );
  };

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div className="virtualized-list-fill" />;
  }

  return (
    <div
      className={`virtualized-list-fade${isScrollRestored ? " virtualized-list-fade--ready" : ""}`}
      style={{
        paddingLeft: `${leftGutter}px`,
        paddingRight: `${rightGutter}px`,
        boxSizing: "border-box",
      }}
    >
      <Grid
        gridRef={gridRef}
        className="virtualized-tags-grid"
        columnCount={columnCount}
        columnWidth={itemWidth + GAP}
        defaultHeight={dimensions.height}
        defaultWidth={gridContentWidth}
        rowCount={rowCount}
        rowHeight={
          firstCoverInset > 0 || tailInset > 0
            ? (rowIndex: number) =>
                virtualizedGridRowHeightPx(
                  rowIndex,
                  lastRowIndex,
                  itemHeight,
                  firstCoverInset,
                  tailInset,
                )
            : itemHeight
        }
        overscanCount={OVERSCAN_COUNT}
        cellComponent={Cell}
        cellProps={{} as object}
        style={{ height: dimensions.height, width: gridContentWidth }}
      />
    </div>
  );
}
