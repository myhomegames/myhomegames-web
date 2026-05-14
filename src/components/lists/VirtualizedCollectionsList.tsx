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
    return { scrollTop: parsed.scrollTop || 0, scrollLeft: parsed.scrollLeft || 0 };
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

  // Item dimensions
  const itemWidth = coverSize;
  const itemHeight = coverSize * 1.5 + GAP;
  const stepRows = readStepScrollRows(containerRef.current);
  const enableStepScroll = FORCE_SINGLE_COLUMN && stepRows > 0;
  const gridContentWidth = useMemo(
    () => Math.max(itemWidth + GAP, columnCount * (itemWidth + GAP)),
    [columnCount, itemWidth, GAP]
  );
  const { leftGutter, rightGutter } = useMemo(() => {
    const remainingWidth = Math.max(
      0,
      dimensions.width - gridContentWidth - MIN_LEFT_GUTTER - MIN_RIGHT_GUTTER
    );
    const baseLeft = MIN_LEFT_GUTTER + Math.floor(remainingWidth / 2);
    const baseRight = MIN_RIGHT_GUTTER + Math.ceil(remainingWidth / 2);
    const trim = alphabetNavPresent ? LEFT_GUTTER_TRIM_WHEN_ALPHABET_NAV : 0;
    return {
      leftGutter: Math.max(MIN_LEFT_GUTTER - trim, baseLeft - trim),
      rightGutter: baseRight,
    };
  }, [
    dimensions.width,
    gridContentWidth,
    MIN_LEFT_GUTTER,
    MIN_RIGHT_GUTTER,
    alphabetNavPresent,
  ]);

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
      const contentHeight = Math.max(0, rect.height - padTop - padBottom);
      setDimensions({
        width: contentWidth || rect.width,
        height: contentHeight || rect.height || window.innerHeight - 200, // Fallback height
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateDimensions);
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
      let gridElement: HTMLElement | null = null;

      // Method 1: Try grid.element if available
      if (grid.element) {
        gridElement = grid.element;
      }
      // Method 2: Find scrollable element in container
      else if (containerRef.current) {
        // react-window creates a div with overflow: auto/scroll
        const scrollable = containerRef.current.querySelector('[style*="overflow"]') as HTMLElement;
        if (scrollable && (scrollable.scrollHeight > scrollable.clientHeight || scrollable.scrollWidth > scrollable.clientWidth)) {
          gridElement = scrollable;
        }
      }

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

  // Save scroll position when scrolling
  useEffect(() => {
    let scrollTimeout: number | null = null;
    let snapTimeout: number | null = null;
    let cleanupFn: (() => void) | null = null;

    // Wait for grid to be ready
    const setupScrollListener = (attempt = 0) => {
      const grid = gridRef.current;
      if (!grid) {
        if (attempt < 20) {
          setTimeout(() => setupScrollListener(attempt + 1), 100);
        }
        return;
      }

      // Find the scrollable element - react-window creates a scrollable div inside the container
      let gridElement: HTMLElement | null = null;
      
      // Method 1: Try grid.element if available
      if (grid.element) {
        gridElement = grid.element;
      }
      // Method 2: Find scrollable element in container
      else if (containerRef.current) {
        // react-window creates a div with overflow: auto/scroll
        const scrollable = containerRef.current.querySelector('[style*="overflow"]') as HTMLElement;
        if (scrollable && (scrollable.scrollHeight > scrollable.clientHeight || scrollable.scrollWidth > scrollable.clientWidth)) {
          gridElement = scrollable;
        }
      }
      
      if (!gridElement) {
        if (attempt < 20) {
          setTimeout(() => setupScrollListener(attempt + 1), 100);
        }
        return;
      }

      const handleScroll = () => {
        if (isRestoringRef.current) return;

        // Debounce scroll saving
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        if (snapTimeout) {
          clearTimeout(snapTimeout);
        }

        scrollTimeout = setTimeout(() => {
          // Save scroll position directly
          const scrollTop = gridElement!.scrollTop;
          const scrollLeft = gridElement!.scrollLeft;
          
          // Only save if position has actually changed
          if (!lastSavedScrollRef.current || 
              lastSavedScrollRef.current.scrollTop !== scrollTop || 
              lastSavedScrollRef.current.scrollLeft !== scrollLeft) {
            setScrollPosition(storageKey, scrollTop, scrollLeft);
            lastSavedScrollRef.current = { scrollTop, scrollLeft };
          }
        }, 150);

        if (enableStepScroll) {
          snapTimeout = window.setTimeout(() => {
            if (isRestoringRef.current) return;
            const el = gridElement!;
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

      gridElement.addEventListener('scroll', handleScroll, { passive: true });
      
      cleanupFn = () => {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        if (snapTimeout) {
          clearTimeout(snapTimeout);
        }
        gridElement.removeEventListener('scroll', handleScroll);
        // DON'T save position on unmount - it might overwrite with 0
        // The position is already saved during scroll events
      };
    };

    setupScrollListener();

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [gridRef.current, storageKey, itemHeight, itemWidth, rowCount, columnCount, enableStepScroll, stepRows, topInset]);

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
          coverSize={coverSize}
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
