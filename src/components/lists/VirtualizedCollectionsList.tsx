import { useRef, useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Grid } from "react-window";
import type { CollectionItem, GameItem } from "../../types";
import { CollectionListItem, type GamesPathType } from "./CollectionsList";
import { useSkin } from "../../contexts/SkinContext";
import { useCoverScaleAroundBar } from "../../hooks/useCoverScaleAroundBar";
import { readGridTopInsetPx } from "../../utils/readGridTopInsetPx";
// Helper functions for scroll restoration
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

/**
 * `containerRef` is often the page `.home-page-scroll-container`. A naive
 * `[style*="overflow"]` can match another subtree before this list's react-window.
 *
 * react-window 2.x puts `overflow: auto` on the same element as `className`
 * (`virtualized-collections-grid`), not on a child — so do not use a descendant
 * combinator before `[style*="overflow"]`.
 */
function findCollectionsVirtualizedScroller(root: HTMLElement): HTMLElement | null {
  const gridEl =
    (root.querySelector(".collections-list-container--virtualized .virtualized-collections-grid") as
      | HTMLElement
      | null) ?? (root.querySelector(".virtualized-collections-grid") as HTMLElement | null);
  if (gridEl) return gridEl;
  const loose = root.querySelector('[style*="overflow"]') as HTMLElement | null;
  if (!loose) return null;
  if (loose.scrollHeight > loose.clientHeight || loose.scrollWidth > loose.clientWidth) return loose;
  return null;
}

/** Prefer DOM grid under `containerRef` (page box) over `grid.element` — ref can disagree. */
function resolveCollectionsScrollHost(
  grid: { element?: HTMLElement | null } | null,
  containerRoot: HTMLElement | null,
): HTMLElement | null {
  if (containerRoot) {
    const fromDom = findCollectionsVirtualizedScroller(containerRoot);
    if (fromDom) return fromDom;
  }
  if (grid?.element instanceof HTMLElement) return grid.element;
  return null;
}

type VirtualizedCollectionsListProps = {
  collections: CollectionItem[];
  /** Optional map of collection id -> display count (games + sub-collections) for subtitle */
  displayCountById?: Record<string, number>;
  coverSize: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onCollectionClick: (collection: CollectionItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick?: (collection: CollectionItem) => void;
  onCollectionDelete?: (deletedCollection: CollectionItem) => void;
  onCollectionUpdate?: (updatedCollection: CollectionItem) => void;
  onAddToCollectionLike?: (collection: CollectionItem, parentId?: string) => void;
  allCollectionLikes?: CollectionItem[];
  gamesPath?: GamesPathType;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
};

const DEFAULT_GAP = 40; // Fallback gap between items in grid
const OVERSCAN_COUNT = 2; // Number of items to render outside visible area
const DEFAULT_MIN_SIDE_GUTTER = 56; // Fallback breathing space (both sides)
/** When the A-Z rail is shown, nudge the grid slightly left (fixed px, no width math). */
const LEFT_GUTTER_TRIM_WHEN_ALPHABET_NAV = 8;
/** Floor for side gutters when the rail is wider than the viewport (avoid clipping covers). */
const RAIL_GUTTER_FLOOR_PX = 4;

/**
 * Resolve grid spacing from CSS custom properties so skins can override density:
 * `--vgrid-gap-half` (half of the inter-item gap) and side gutters:
 * `--vgrid-side-gutter` (legacy, both sides), `--vgrid-side-gutter-left`, `--vgrid-side-gutter-right`.
 */
function readGridSpacing(): {
  gap: number;
  minLeftGutter: number;
  minRightGutter: number;
  forceSingleColumn: boolean;
} {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      gap: DEFAULT_GAP,
      minLeftGutter: DEFAULT_MIN_SIDE_GUTTER,
      minRightGutter: DEFAULT_MIN_SIDE_GUTTER,
      forceSingleColumn: false,
    };
  }
  const style = getComputedStyle(document.documentElement);
  const gapHalf = parseFloat(style.getPropertyValue("--vgrid-gap-half"));
  const fallbackGutter = parseFloat(style.getPropertyValue("--vgrid-side-gutter"));
  const leftGutter = parseFloat(style.getPropertyValue("--vgrid-side-gutter-left"));
  const rightGutter = parseFloat(style.getPropertyValue("--vgrid-side-gutter-right"));
  const forceSingleColumn =
    document.documentElement.getAttribute("data-mhg-vertical-cover-alignment") === "true";
  const resolvedFallback = Number.isFinite(fallbackGutter) ? fallbackGutter : DEFAULT_MIN_SIDE_GUTTER;
  return {
    gap: Number.isFinite(gapHalf) ? gapHalf * 2 : DEFAULT_GAP,
    minLeftGutter: Number.isFinite(leftGutter) ? leftGutter : resolvedFallback,
    minRightGutter: Number.isFinite(rightGutter) ? rightGutter : resolvedFallback,
    forceSingleColumn,
  };
}

/**
 * See `readGridTopInsetPx` / VirtualizedGamesList — same opt-in via
 * `--mhg-grid-top-inset`. Pushes the first collection row below the
 * (overlay) libraries bar by injecting empty space INSIDE the grid so
 * scrolled-up covers remain visible through the transparent bar.
 *
 * Reads from `containerEl` first when provided so per-page CSS scoping
 * (Library / Tag / Collections / Recommended …) can set different
 * insets. Falls back to the document root. See `readGridTopInsetPx`.
 */
function readStepScrollRows(containerEl?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const source = containerEl ?? document.documentElement;
  const raw = getComputedStyle(source).getPropertyValue("--mhg-step-scroll-rows");
  const value = parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export default function VirtualizedCollectionsList({
  collections,
  displayCountById,
  coverSize,
  containerRef,
  itemRefs,
  onCollectionClick,
  onPlay,
  onEditClick,
  onCollectionDelete,
  onCollectionUpdate,
  onAddToCollectionLike,
  allCollectionLikes = [],
  gamesPath = "collections",
  buildCoverUrl,
}: VirtualizedCollectionsListProps) {
  const location = useLocation();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [alphabetNavPresent, setAlphabetNavPresent] = useState(false);
  const [isScrollRestored, setIsScrollRestored] = useState(false);
  const [spacing, setSpacing] = useState(() => readGridSpacing());
  const {
    gap: GAP,
    minLeftGutter: MIN_LEFT_GUTTER,
    minRightGutter: MIN_RIGHT_GUTTER,
    forceSingleColumn: FORCE_SINGLE_COLUMN,
  } = spacing;
  const [topInset, setTopInset] = useState(() => readGridTopInsetPx(containerRef.current));
  const { activeSkinId } = useSkin();
  useEffect(() => {
    setSpacing(readGridSpacing());
    setTopInset(readGridTopInsetPx(containerRef.current));
    const t = window.setTimeout(() => {
      setSpacing(readGridSpacing());
      setTopInset(readGridTopInsetPx(containerRef.current));
    }, 50);
    return () => window.clearTimeout(t);
  }, [activeSkinId, containerRef]);
  const gridRef = useRef<any>(null);
  const isRestoringRef = useRef(false);
  const lastSavedScrollRef = useRef<{ scrollTop: number; scrollLeft: number } | null>(null);

  // Publish a `--mhg-cell-scale` CSS variable on each cover pad based on its
  // position relative to the libraries bar (see useCoverScaleAroundBar).
  useCoverScaleAroundBar({ gridRef, containerRef });
  const storageKey = `${location.pathname}:collections:${gamesPath}`;

  // Calculate column count based on container width
  const columnCount = useMemo(() => {
    if (FORCE_SINGLE_COLUMN) return 1;
    if (dimensions.width === 0) return 1;
    const itemWidthWithGap = coverSize + GAP;
    const usableWidth = Math.max(coverSize, dimensions.width - MIN_LEFT_GUTTER - MIN_RIGHT_GUTTER);
    return Math.max(1, Math.floor((usableWidth + GAP) / itemWidthWithGap));
  }, [FORCE_SINGLE_COLUMN, dimensions.width, coverSize, GAP, MIN_LEFT_GUTTER, MIN_RIGHT_GUTTER]);

  // Calculate row count
  const rowCount = useMemo(() => {
    return Math.ceil(collections.length / columnCount);
  }, [collections.length, columnCount]);

  // Fit gutters + grid into the measured container width so PS3 vertical rails never clip covers
  // when minimum gutters plus `coverSize` exceed `dimensions.width` (common with overflow-x: hidden).
  const { displayCoverSize, gridContentWidth, leftGutter, rightGutter, itemWidth, itemHeight } =
    useMemo(() => {
      const gap = GAP;
      const w = dimensions.width;
      let displayCoverSize = coverSize;
      let gridContentWidth = Math.max(
        displayCoverSize + gap,
        columnCount * (displayCoverSize + gap)
      );

      const remainingWidth = Math.max(
        0,
        w - gridContentWidth - MIN_LEFT_GUTTER - MIN_RIGHT_GUTTER
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
              Math.floor((inner - columnCount * gap) / Math.max(1, columnCount))
            );
            displayCoverSize = Math.min(coverSize, maxCover);
            displayCoverSize = Math.max(64, displayCoverSize);
            gridContentWidth = Math.max(
              displayCoverSize + gap,
              columnCount * (displayCoverSize + gap)
            );
          }
        }
      }

      const itemWidth = displayCoverSize;
      const itemHeight = displayCoverSize * 1.5 + gap;
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

  const stepRows = readStepScrollRows(containerRef.current);
  const enableStepScroll = FORCE_SINGLE_COLUMN && stepRows > 0;

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
  }, [containerRef, collections.length]);

  // Update dimensions when container size changes.
  // Size to the container's CONTENT box (excluding padding) so the virtualized
  // scroll bottom lines up with the visible viewport bottom. Skins that pad
  // `.home-page-scroll-container` would otherwise make the grid overflow,
  // leaving the last rows hidden below the end of the scroll bar.
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

      // Skins (e.g. PS3 dock) pull `.virtualized-list-fade` up with a negative `margin-top`
      // so the first cover lines up under the libraries bar. That does not change the
      // scroll container's measured height, so react-window would still get the old
      // height and the rail ends short of the bottom — extend by the resolved pull.
      const fade = el.querySelector<HTMLElement>(
        ".collections-list-container--virtualized .virtualized-list-fade",
      );
      if (fade) {
        const marginTopPx = parseFloat(window.getComputedStyle(fade).marginTop);
        if (Number.isFinite(marginTopPx) && marginTopPx < 0) {
          contentHeight += -marginTopPx;
        }
      }

      setDimensions({
        width: contentWidth || rect.width,
        height: contentHeight || rect.height || window.innerHeight - 200, // Fallback height
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
    const resizeObserver = new ResizeObserver(updateDimensionsRaf);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateDimensionsRaf);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  // Restore scroll position when component mounts or route changes
  useEffect(() => {
    // Check if we have a saved position first
    const savedPosition = getScrollPosition(storageKey);

    if (!savedPosition || (savedPosition.scrollTop === 0 && savedPosition.scrollLeft === 0)) {
      setIsScrollRestored(true); // No position to restore, show content immediately
      return;
    }

    // If we have a saved position, wait for dimensions before restoring.
    // Keep isScrollRestored=false so the rail stays hidden during the wait,
    // and rely on a safety timer below to eventually reveal the content if
    // dimensions never become valid.
    if (dimensions.height === 0 || rowCount === 0 || columnCount === 0) {
      const safety = setTimeout(() => setIsScrollRestored(true), 1500);
      return () => clearTimeout(safety);
    }

    isRestoringRef.current = true;
    setIsScrollRestored(false); // Hide content until scroll is restored

    // Safety net: even if every retry path fails silently, reveal the rail
    // after a hard deadline so the page never stays invisible.
    const safetyReveal = setTimeout(() => {
      isRestoringRef.current = false;
      setIsScrollRestored(true);
    }, 1500);

    const markRestored = () => {
      isRestoringRef.current = false;
      clearTimeout(safetyReveal);
      setIsScrollRestored(true);
    };

    // Wait for grid to be ready
    const restoreScroll = (attempt = 0) => {
      const grid = gridRef.current;
      if (!grid) {
        if (attempt < 50) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          markRestored(); // Show content even if grid never mounts
        }
        return;
      }

      // Find the scrollable element - react-window creates a scrollable div inside the container
      let gridElement: HTMLElement | null = resolveCollectionsScrollHost(grid, containerRef.current);

      if (!gridElement) {
        if (attempt < 50) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          markRestored(); // Show content even if element not found
        }
        return;
      }

      try {
        // Restore scroll position directly using scrollTop/scrollLeft
        gridElement.scrollTop = savedPosition.scrollTop;
        gridElement.scrollLeft = savedPosition.scrollLeft;

        // Verify restoration worked
        setTimeout(() => {
          const currentScrollTop = gridElement.scrollTop;
          const currentScrollLeft = gridElement.scrollLeft;

          // If position is significantly different, try again
          if (Math.abs(currentScrollTop - savedPosition.scrollTop) > 10 ||
              Math.abs(currentScrollLeft - savedPosition.scrollLeft) > 10) {
            if (attempt < 5) {
              gridElement.scrollTop = savedPosition.scrollTop;
              gridElement.scrollLeft = savedPosition.scrollLeft;
            }
          }

          // Reset restoring flag and show content after scroll is restored
          setTimeout(markRestored, 50);
        }, 50);
      } catch (error) {
        if (attempt < 10) {
          setTimeout(() => restoreScroll(attempt + 1), 100);
        } else {
          markRestored(); // Show content even if restore failed
        }
      }
    };

    // Start restoration after a short delay so the grid has a frame to mount.
    const timer = setTimeout(() => {
      restoreScroll();
    }, 80);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyReveal);
      isRestoringRef.current = false;
    };
  }, [location.pathname, storageKey, dimensions.height, rowCount, columnCount]);

  // Save scroll position when scrolling. Do not put `gridRef.current` in the dependency
  // array — refs do not trigger re-renders, so the listener can stay detached after the
  // first `virtualized-list-fill` → Grid transition. Re-run when layout/size/data changes
  // and resolve the react-window scroller from `containerRef` (DOM) like restore does.
  useEffect(() => {
    lastSavedScrollRef.current = getScrollPosition(storageKey);

    let cancelled = false;
    const attachTimers: number[] = [];
    let scrollTimeout: number | null = null;
    let snapTimeout: number | null = null;
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
        if (attempt < 60) {
          attachTimers.push(window.setTimeout(() => tryAttach(attempt + 1), 50));
        }
        return;
      }

      const gridElement = resolveCollectionsScrollHost(gridRef.current, root);
      if (!gridElement) {
        if (attempt < 60) {
          attachTimers.push(window.setTimeout(() => tryAttach(attempt + 1), 50));
        }
        return;
      }

      const handleScroll = () => {
        if (isRestoringRef.current) return;

        if (scrollTimeout !== null) {
          window.clearTimeout(scrollTimeout);
          scrollTimeout = null;
        }
        if (snapTimeout !== null) {
          window.clearTimeout(snapTimeout);
          snapTimeout = null;
        }

        scrollTimeout = window.setTimeout(() => {
          scrollTimeout = null;
          flushSave(gridElement);
        }, 100);

        if (enableStepScroll) {
          snapTimeout = window.setTimeout(() => {
            snapTimeout = null;
            if (isRestoringRef.current) return;
            const el = gridElement;
            const max = Math.max(0, el.scrollHeight - el.clientHeight);
            if (max <= 0) return;

            const stepPx = Math.max(1, Math.round(itemHeight * stepRows));
            const firstStep = itemHeight + topInset;
            const current = el.scrollTop;
            let target = 0;

            if (topInset > 0) {
              if (current <= firstStep / 2) {
                target = 0;
              } else {
                const afterFirst = Math.max(0, current - firstStep);
                target = firstStep + Math.round(afterFirst / stepPx) * stepPx;
              }
            } else {
              target = Math.round(current / stepPx) * stepPx;
            }

            target = Math.max(0, Math.min(max, target));
            if (Math.abs(target - current) > 2) {
              el.scrollTop = target;
            }
          }, 120);
        }
      };

      gridElement.addEventListener("scroll", handleScroll, { passive: true });

      cleanupFn = () => {
        gridElement.removeEventListener("scroll", handleScroll);
        if (scrollTimeout !== null) {
          window.clearTimeout(scrollTimeout);
          scrollTimeout = null;
        }
        if (snapTimeout !== null) {
          window.clearTimeout(snapTimeout);
          snapTimeout = null;
        }
        if (!isRestoringRef.current) {
          flushSave(gridElement);
        }
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
    collections.length,
    rowCount,
    columnCount,
    itemHeight,
    enableStepScroll,
    stepRows,
    topInset,
  ]);

  // Expose gridRef to parent via containerRef if it's a ref object
  useEffect(() => {
    if (containerRef && 'current' in containerRef && containerRef.current) {
      // Store gridRef in a data attribute or custom property for AlphabetNavigator to access
      (containerRef.current as any).__virtualizedGridRef = gridRef;
    }
  }, [containerRef]);

  // Cell renderer for grid
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= collections.length) {
      return <div style={style} />;
    }

    const collection = collections[index];
    const isInsetRow = rowIndex === 0 && topInset > 0;

    return (
      <div style={style}>
        {isInsetRow && <div style={{ height: topInset, flexShrink: 0 }} />}
        <div className="virtualized-grid-cell-pad">
        <CollectionListItem
          collection={collection}
          displayCount={displayCountById?.[String(collection.id)]}
          onCollectionClick={onCollectionClick}
          onPlay={onPlay}
          onEditClick={onEditClick}
          onCollectionDelete={onCollectionDelete}
          onCollectionUpdate={onCollectionUpdate}
          onAddToCollectionLike={onAddToCollectionLike}
          allCollectionLikes={allCollectionLikes}
          gamesPath={gamesPath}
          buildCoverUrl={buildCoverUrl}
          coverSize={displayCoverSize}
          itemRefs={itemRefs}
        />
        </div>
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
        className="virtualized-collections-grid"
        columnCount={columnCount}
        columnWidth={itemWidth + GAP}
        defaultHeight={dimensions.height}
        defaultWidth={gridContentWidth}
        rowCount={rowCount}
        rowHeight={
          topInset > 0
            ? (rowIndex: number) => (rowIndex === 0 ? itemHeight + topInset : itemHeight)
            : itemHeight
        }
        overscanCount={OVERSCAN_COUNT}
        cellComponent={Cell}
        cellProps={{} as any}
        style={{ height: dimensions.height, width: gridContentWidth }}
      />
    </div>
  );
}
