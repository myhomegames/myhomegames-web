import { useRef, useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Grid } from "react-window";
import type { CollectionInfo, CollectionItem, GameItem } from "../../types";
import type { CollectionLikeResourceType } from "../collections/EditCollectionLikeModal";
import { GameListItem } from "./GamesList";
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

type VirtualizedGamesListProps = {
  games: GameItem[];
  coverSize: number;
  forceSingleColumn?: boolean;
  coverCacheBustTimestamp?: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (game: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean, customTimestamp?: number) => string;
  allCollections?: import("../../types").CollectionItem[];
  collectionId?: string;
  onRemoveFromCollection?: (gameId: string) => void;
  developerId?: string;
  publisherId?: string;
  onRemoveFromDeveloper?: (gameId: string) => void;
  onRemoveFromPublisher?: (gameId: string) => void;
  platformIdForPlay?: string;
  allCollectionLikes?: CollectionItem[];
  collectionLikeResourceType?: CollectionLikeResourceType;
  sliderParentCollectionLikeId?: string;
  onRemoveChildFromSliderParent?: (childId: string) => void | Promise<void>;
  onCollectionLikePseudoEdit?: (game: GameItem) => void;
  onPlayFirstInCollectionLike?: (resourceType: string, cid: string) => void | Promise<void>;
  onCollectionLikePseudoAddToParent?: (source: CollectionItem, parentId?: string) => void | Promise<void>;
  onCollectionLikePseudoUpdated?: (updated: CollectionInfo) => void;
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
function readGridSpacing(): { gap: number; minLeftGutter: number; minRightGutter: number } {
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
 * Skins (e.g. PS3) can push the first cover row down by injecting empty
 * space at the top of the virtualized grid via `--mhg-grid-top-inset`.
 * Padding-top on the outer scroll container would clip the grid at its
 * top edge — we want covers to remain visible BEHIND the (transparent)
 * libraries bar as they scroll up, so the inset is added as extra height
 * on the first row instead. Returns 0 when the variable is unset, which
 * disables the effect for skins that don't opt in.
 *
 * Reads from `containerEl` first (when provided) so per-page CSS scoping
 * — e.g. `.mhg-library-vertical-covers` vs `.recommended-page-scroll` —
 * can set different insets for different page types. Falls back to the
 * document root for the default value. Implemented in `readGridTopInsetPx`.
 */
function readStepScrollRows(containerEl?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const source = containerEl ?? document.documentElement;
  const raw = getComputedStyle(source).getPropertyValue("--mhg-step-scroll-rows");
  const value = parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export default function VirtualizedGamesList({
  games,
  coverSize,
  forceSingleColumn = false,
  coverCacheBustTimestamp,
  containerRef,
  itemRefs,
  onGameClick,
  onPlay,
  onEditClick,
  onGameDelete,
  onGameUpdate,
  buildCoverUrl,
  allCollections = [],
  collectionId,
  onRemoveFromCollection,
  developerId,
  publisherId,
  onRemoveFromDeveloper,
  onRemoveFromPublisher,
  platformIdForPlay,
  allCollectionLikes,
  collectionLikeResourceType,
  sliderParentCollectionLikeId,
  onRemoveChildFromSliderParent,
  onCollectionLikePseudoEdit,
  onPlayFirstInCollectionLike,
  onCollectionLikePseudoAddToParent,
  onCollectionLikePseudoUpdated,
}: VirtualizedGamesListProps) {
  const location = useLocation();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [alphabetNavPresent, setAlphabetNavPresent] = useState(false);
  const [isScrollRestored, setIsScrollRestored] = useState(false);
  const [spacing, setSpacing] = useState(() => readGridSpacing());
  const { gap: GAP, minLeftGutter: MIN_LEFT_GUTTER, minRightGutter: MIN_RIGHT_GUTTER } = spacing;
  const [topInset, setTopInset] = useState(() => readGridTopInsetPx(containerRef.current));
  const gridRef = useRef<any>(null);
  const isRestoringRef = useRef(false);
  const lastSavedScrollRef = useRef<{ scrollTop: number; scrollLeft: number } | null>(null);
  const storageKey = `${location.pathname}:grid`;

  // Expose gridRef to parent via containerRef if it's a ref object
  useEffect(() => {
    if (containerRef && 'current' in containerRef && containerRef.current) {
      // Store gridRef in a data attribute or custom property for AlphabetNavigator to access
      (containerRef.current as any).__virtualizedGridRef = gridRef;
    }
  }, [containerRef]);

  // Calculate column count based on container width
  const columnCount = useMemo(() => {
    if (forceSingleColumn) return 1;
    if (dimensions.width === 0) return 1;
    const itemWidthWithGap = coverSize + GAP;
    const usableWidth = Math.max(coverSize, dimensions.width - MIN_LEFT_GUTTER - MIN_RIGHT_GUTTER);
    return Math.max(1, Math.floor((usableWidth + GAP) / itemWidthWithGap));
  }, [forceSingleColumn, dimensions.width, coverSize, GAP, MIN_LEFT_GUTTER, MIN_RIGHT_GUTTER]);

  // Calculate row count
  const rowCount = useMemo(() => {
    return Math.ceil(games.length / columnCount);
  }, [games.length, columnCount]);

  // Item dimensions
  const itemWidth = coverSize;
  const itemHeight = coverSize * 1.5 + GAP;
  const stepRows = readStepScrollRows(containerRef.current);
  const enableStepScroll = forceSingleColumn && stepRows > 0;
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
  }, [containerRef, games.length]);

  const { activeSkinId } = useSkin();
  // Re-read grid spacing when the active skin changes (bundle.css is swapped).
  // A small delay lets the new stylesheet apply before we measure CSS vars.
  useEffect(() => {
    setSpacing(readGridSpacing());
    setTopInset(readGridTopInsetPx(containerRef.current));
    const t = window.setTimeout(() => {
      setSpacing(readGridSpacing());
      setTopInset(readGridTopInsetPx(containerRef.current));
    }, 50);
    return () => window.clearTimeout(t);
  }, [activeSkinId, containerRef]);

  // Publish a `--mhg-cell-scale` CSS variable on each cover pad based on its
  // position relative to the libraries bar. Skins that want the "covers behind
  // the bar shrink" effect consume the variable via `transform: scale(...)`;
  // skins that don't ignore it (the variable simply has no effect).
  useCoverScaleAroundBar({ gridRef, containerRef });

  // Update dimensions when container size changes.
  // We size the grid to the container's CONTENT box (excluding padding) so the
  // virtualized scroll bottom aligns with the visible viewport bottom. Skins
  // that pad `.home-page-scroll-container` (e.g. GOG Galaxy adds
  // padding-top/-bottom: 32px) would otherwise produce a grid that overflows
  // the container, hiding the last rows below the scroll bar's end position.
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
    // Check if we have a saved position first.
    // In forced single-column mode (vertical cover alignment) the rail is purely
    // vertical, so the previously saved horizontal offset is meaningless and we
    // drop it — but the vertical offset MUST still be restored, otherwise
    // navigating away and back resets the Library scroll to 0.
    const rawSavedPosition = getScrollPosition(storageKey);
    const savedPosition = rawSavedPosition
      ? {
          scrollTop: rawSavedPosition.scrollTop,
          scrollLeft: forceSingleColumn ? 0 : rawSavedPosition.scrollLeft,
        }
      : null;

    if (!savedPosition || (savedPosition.scrollTop === 0 && savedPosition.scrollLeft === 0)) {
      setIsScrollRestored(true); // No position to restore, show content immediately
      return;
    }

    // If we have a saved position, wait for dimensions before restoring
    if (dimensions.height === 0 || rowCount === 0 || columnCount === 0) {
      return;
    }

    isRestoringRef.current = true;
    setIsScrollRestored(false); // Hide content until scroll is restored

    // Wait for grid to be ready
    const restoreScroll = (attempt = 0) => {
      const grid = gridRef.current;
      if (!grid) {
        if (attempt < 50) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          isRestoringRef.current = false;
        }
        return;
      }

      // Find the scrollable element - react-window creates a scrollable div inside the container
      // Try multiple ways to find it
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
          isRestoringRef.current = false;
          setIsScrollRestored(true); // Show content even if element not found
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
          setTimeout(() => {
            isRestoringRef.current = false;
            setIsScrollRestored(true);
          }, 50);
        }, 50);
      } catch (error) {
        if (attempt < 10) {
          setTimeout(() => restoreScroll(attempt + 1), 100);
        } else {
          isRestoringRef.current = false;
          setIsScrollRestored(true);
        }
      }
    };

    // Start restoration after a delay to ensure grid is mounted
    const timer = setTimeout(() => {
      restoreScroll();
    }, 300);

    return () => {
      clearTimeout(timer);
      isRestoringRef.current = false;
    };
  }, [location.pathname, storageKey, dimensions.height, rowCount, columnCount, forceSingleColumn]);

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

  // Cell renderer for grid
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= games.length) {
      return <div style={style} />;
    }

    const game = games[index];
    // Row 0 is taller by `topInset` px (rowHeight function below) so the
    // first cover lands BELOW the overlay libraries bar at scroll=0 while
    // the grid itself still extends from y=0 of the page — covers can rise
    // through the bar area as the user scrolls. Pad the pad with a spacer
    // so the visual top of the cover starts at `topInset`.
    const isInsetRow = rowIndex === 0 && topInset > 0;

    return (
      <div style={style}>
        {isInsetRow && <div style={{ height: topInset, flexShrink: 0 }} />}
        <div className="virtualized-grid-cell-pad">
        <GameListItem
          game={game}
          onGameClick={onGameClick}
          onPlay={onPlay}
          onEditClick={onEditClick}
          onGameDelete={onGameDelete}
          onGameUpdate={onGameUpdate}
          buildCoverUrl={buildCoverUrl}
          coverSize={coverSize}
          coverCacheBustTimestamp={coverCacheBustTimestamp}
          itemRefs={itemRefs}
          index={index}
          onDragStart={() => {}}
          onDragOver={() => {}}
          onDragEnd={() => {}}
          isDragging={false}
          dragOverIndex={null}
          viewMode="grid"
          allCollections={allCollections}
          collectionId={collectionId}
          onRemoveFromCollection={onRemoveFromCollection}
          developerId={developerId}
          publisherId={publisherId}
          onRemoveFromDeveloper={onRemoveFromDeveloper}
          onRemoveFromPublisher={onRemoveFromPublisher}
          platformIdForPlay={platformIdForPlay}
          allCollectionLikes={allCollectionLikes}
          collectionLikeResourceType={collectionLikeResourceType}
          sliderParentCollectionLikeId={sliderParentCollectionLikeId}
          onRemoveChildFromSliderParent={onRemoveChildFromSliderParent}
          onCollectionLikePseudoEdit={onCollectionLikePseudoEdit}
          onPlayFirstInCollectionLike={onPlayFirstInCollectionLike}
          onCollectionLikePseudoAddToParent={onCollectionLikePseudoAddToParent}
          onCollectionLikePseudoUpdated={onCollectionLikePseudoUpdated}
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
      className="virtualized-games-grid"
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
