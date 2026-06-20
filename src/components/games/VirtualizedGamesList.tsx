import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Grid } from "react-window";
import type { CollectionInfo, CollectionItem, GameItem } from "../../types";
import type { CollectionLikeResourceType } from "../collections/EditCollectionLikeModal";
import { GameListItem } from "./GamesList";
import { useSkin } from "../../contexts/SkinContext";
import { flushCoverScaleAroundBar, useCoverScaleAroundBar } from "../../hooks/useCoverScaleAroundBar";
import { virtualizedCoverCellRowHeight } from "../../utils/coverPortrait";
import {
  clampContextRailGamesScrollTop,
  clampVirtualizedGridScrollTop,
  computeContextRailGamesAlignMaxScrollTop,
  computeVirtualizedGridTailInsetPx,
  isContextRailGamesScroll,
  readGridBottomInsetPx,
  readGridLastCoverRaisePx,
  readGridTopInsetPx,
  virtualizedGridRowHeightPx,
} from "../../utils/readGridTopInsetPx";
import { MHG_LIST_TOOLBAR_CHROME_SYNC_EVENT } from "../../utils/syncInlineListToolbarChrome";
import {
  applyVirtualizedStepSnap,
  applyWheelDeltaStep,
  nextVirtualizedStepScrollTop,
  readStepScrollRows,
  readWheelStepThresholdPx,
  type VirtualizedStepScrollSnapOptions,
} from "../../utils/stepScrollSnap";
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

/** Same idea as `findCollectionsVirtualizedScroller` — react-window puts overflow on the grid root. */
function findGamesVirtualizedScroller(root: HTMLElement): HTMLElement | null {
  const gridEl =
    (root.querySelector(".games-list-container--virtualized .virtualized-games-grid") as HTMLElement | null) ??
    (root.querySelector(".virtualized-games-grid") as HTMLElement | null);
  if (gridEl) return gridEl;
  const loose = root.querySelector('[style*="overflow"]') as HTMLElement | null;
  if (!loose) return null;
  if (loose.scrollHeight > loose.clientHeight || loose.scrollWidth > loose.clientWidth) return loose;
  return null;
}

function resolveGamesScrollHost(
  grid: { element?: HTMLElement | null } | null,
  containerRoot: HTMLElement | null,
): HTMLElement | null {
  if (containerRoot) {
    const fromDom = findGamesVirtualizedScroller(containerRoot);
    if (fromDom) return fromDom;
  }
  if (grid?.element instanceof HTMLElement) return grid.element;
  return null;
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
 * Skins can push the first cover row down by injecting empty
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
  const [bottomInset, setBottomInset] = useState(() =>
    readGridBottomInsetPx(containerRef.current)
  );
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
  const itemHeight = virtualizedCoverCellRowHeight(coverSize, GAP);
  const stepRows = readStepScrollRows(containerRef.current);
  const enableStepScroll = forceSingleColumn && stepRows > 0;
  const contextRailScroll = useMemo(
    () => isContextRailGamesScroll(containerRef.current),
    [containerRef, dimensions.width, dimensions.height, games.length],
  );
  const lastCoverRaisePx = readGridLastCoverRaisePx(containerRef.current);
  const contextRailAlignMaxScrollTop = useMemo(() => {
    if (!contextRailScroll || rowCount <= 0) return Number.POSITIVE_INFINITY;
    return computeContextRailGamesAlignMaxScrollTop(
      rowCount,
      itemHeight,
      topInset,
      lastCoverRaisePx,
    );
  }, [contextRailScroll, rowCount, itemHeight, topInset, lastCoverRaisePx]);
  const effectiveBottomInset = useMemo(() => {
    if (!contextRailScroll || dimensions.height <= 0 || itemHeight <= 0) {
      return bottomInset;
    }
    if (topInset > 0) {
      return computeVirtualizedGridTailInsetPx(
        dimensions.height,
        itemHeight,
        topInset,
        lastCoverRaisePx,
      );
    }
    return Math.max(0, Math.ceil(dimensions.height - itemHeight));
  }, [
    contextRailScroll,
    dimensions.height,
    itemHeight,
    topInset,
    bottomInset,
    lastCoverRaisePx,
  ]);
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
  const syncGridInsets = useCallback(() => {
    setSpacing(readGridSpacing());
    setTopInset(readGridTopInsetPx(containerRef.current));
    setBottomInset(readGridBottomInsetPx(containerRef.current));
  }, [containerRef]);
  // Re-read grid spacing when the active skin changes (bundle.css is swapped).
  // A small delay lets the new stylesheet apply before we measure CSS vars.
  useEffect(() => {
    syncGridInsets();
    const t = window.setTimeout(syncGridInsets, 50);
    return () => window.clearTimeout(t);
  }, [activeSkinId, syncGridInsets]);

  // Stacked page chrome may update `--mhg-scroll-top-inset` when the inline list toolbar resizes.
  useEffect(() => {
    let raf = 0;
    const onViewportChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncGridInsets);
    };
    window.addEventListener("resize", onViewportChange);
    window.addEventListener(MHG_LIST_TOOLBAR_CHROME_SYNC_EVENT, onViewportChange);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener(MHG_LIST_TOOLBAR_CHROME_SYNC_EVENT, onViewportChange);
    };
  }, [syncGridInsets]);

  // Publish a `--mhg-cell-scale` CSS variable on each cover pad based on its
  // position relative to the libraries bar. Skins that want the "covers behind
  // the bar shrink" effect consume the variable via `transform: scale(...)`;
  // skins that don't ignore it (the variable simply has no effect).
  useCoverScaleAroundBar({ gridRef, containerRef });

  // Update dimensions when container size changes.
  // We size the grid to the container's CONTENT box (excluding padding) so the
  // virtualized scroll bottom aligns with the visible viewport bottom. Skins
  // that pad `.home-page-scroll-container` (some persistent-shell skins add
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
      let gridElement: HTMLElement | null = resolveGamesScrollHost(grid, containerRef.current);

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

  // Save scroll position when scrolling. See VirtualizedCollectionsList — avoid
  // `gridRef.current` in the dependency array; re-attach when layout/data changes.
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
        if (attempt < 60) {
          attachTimers.push(window.setTimeout(() => tryAttach(attempt + 1), 50));
        }
        return;
      }

      const gridElement = resolveGamesScrollHost(gridRef.current, root);
      if (!gridElement) {
        if (attempt < 60) {
          attachTimers.push(window.setTimeout(() => tryAttach(attempt + 1), 50));
        }
        return;
      }

      const buildSnapOpts = (el: HTMLElement): VirtualizedStepScrollSnapOptions => {
        const nativeMax = Math.max(0, el.scrollHeight - el.clientHeight);
        const max =
          contextRailScroll && Number.isFinite(contextRailAlignMaxScrollTop)
            ? Math.min(nativeMax, contextRailAlignMaxScrollTop)
            : nativeMax;
        return {
          scrollTop: el.scrollTop,
          maxScrollTop: max,
          itemHeight,
          stepRows,
          topInset,
          contextRail: contextRailScroll,
          alignMaxScrollTop: contextRailScroll ? contextRailAlignMaxScrollTop : undefined,
        };
      };

      const runSnap = (el: HTMLElement) => {
        if (!enableStepScroll || isRestoringRef.current) return;
        const opts = buildSnapOpts(el);
        if (opts.maxScrollTop <= 0) return;
        if (applyVirtualizedStepSnap(el, opts)) {
          flushCoverScaleAroundBar(gridRef, containerRef);
        }
      };

      const wheelAccum = { accumulated: 0 };
      const wheelThresholdPx = readWheelStepThresholdPx(containerRef.current);

      const handleWheel = (e: WheelEvent) => {
        if (!enableStepScroll || isRestoringRef.current) return;
        if (Math.abs(e.deltaY) < 1) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

        e.preventDefault();
        e.stopPropagation();

        const el = gridElement;
        applyWheelDeltaStep(wheelAccum, e.deltaY, wheelThresholdPx, (direction) => {
          const opts = buildSnapOpts(el);
          if (opts.maxScrollTop <= 0) return;
          const target = nextVirtualizedStepScrollTop(opts, direction);
          if (target !== el.scrollTop) {
            el.scrollTop = target;
            flushCoverScaleAroundBar(gridRef, containerRef);
          }
        });
      };

      const handleScroll = () => {
        if (isRestoringRef.current) return;

        if (contextRailScroll && rowCount > 0) {
          const nativeMax = Math.max(0, gridElement.scrollHeight - gridElement.clientHeight);
          let clamped = gridElement.scrollTop;
          if (topInset > 0) {
            clamped = clampVirtualizedGridScrollTop(
              clamped,
              rowCount,
              itemHeight,
              topInset,
              gridElement.scrollHeight,
              gridElement.clientHeight,
              lastCoverRaisePx,
            );
          } else if (Number.isFinite(contextRailAlignMaxScrollTop)) {
            clamped = clampContextRailGamesScrollTop(
              clamped,
              nativeMax,
              contextRailAlignMaxScrollTop,
            );
          }
          if (clamped !== gridElement.scrollTop) {
            gridElement.scrollTop = clamped;
            flushCoverScaleAroundBar(gridRef, containerRef);
            return;
          }
        }

        if (enableStepScroll) {
          runSnap(gridElement);
        }

        if (scrollTimeout !== null) {
          window.clearTimeout(scrollTimeout);
          scrollTimeout = null;
        }

        scrollTimeout = window.setTimeout(() => {
          scrollTimeout = null;
          flushSave(gridElement);
        }, 100);
      };

      const handleScrollEnd = () => {
        if (enableStepScroll) {
          runSnap(gridElement);
        }
      };

      gridElement.addEventListener("scroll", handleScroll, { passive: true });
      gridElement.addEventListener("scrollend", handleScrollEnd, { passive: true });
      gridElement.addEventListener("wheel", handleWheel, { passive: false, capture: true });

      cleanupFn = () => {
        gridElement.removeEventListener("scroll", handleScroll);
        gridElement.removeEventListener("scrollend", handleScrollEnd);
        gridElement.removeEventListener("wheel", handleWheel, { capture: true });
        if (scrollTimeout !== null) {
          window.clearTimeout(scrollTimeout);
          scrollTimeout = null;
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
    games.length,
    rowCount,
    columnCount,
    itemHeight,
    enableStepScroll,
    stepRows,
    topInset,
    bottomInset,
    contextRailScroll,
    contextRailAlignMaxScrollTop,
    lastCoverRaisePx,
  ]);

  const lastRowIndex = Math.max(0, rowCount - 1);

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
    const isTopInsetRow = rowIndex === 0 && topInset > 0;
    const isBottomInsetRow = rowIndex === lastRowIndex && effectiveBottomInset > 0;

    return (
      <div style={style}>
        {isTopInsetRow && <div style={{ height: topInset, flexShrink: 0 }} />}
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
        {isBottomInsetRow && <div style={{ height: effectiveBottomInset, flexShrink: 0 }} />}
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
        topInset > 0 || effectiveBottomInset > 0
          ? (rowIndex: number) =>
              virtualizedGridRowHeightPx(
                rowIndex,
                lastRowIndex,
                itemHeight,
                topInset,
                effectiveBottomInset
              )
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
