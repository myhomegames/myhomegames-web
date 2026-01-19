import { useRef, useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Grid } from "react-window";
import type { GameItem } from "../../types";
import { GameListItem } from "./GamesList";
import "./VirtualizedGamesList.css";

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
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (game: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  allCollections?: import("../../types").CollectionItem[];
  collectionId?: string;
  onRemoveFromCollection?: (gameId: string) => void;
};

const GAP = 40; // Gap between items in grid
const OVERSCAN_COUNT = 2; // Number of items to render outside visible area

export default function VirtualizedGamesList({
  games,
  coverSize,
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
}: VirtualizedGamesListProps) {
  const location = useLocation();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isScrollRestored, setIsScrollRestored] = useState(false);
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
    if (dimensions.width === 0) return 1;
    const itemWidth = coverSize + GAP;
    return Math.max(1, Math.floor((dimensions.width + GAP) / itemWidth));
  }, [dimensions.width, coverSize]);

  // Calculate row count
  const rowCount = useMemo(() => {
    return Math.ceil(games.length / columnCount);
  }, [games.length, columnCount]);

  // Item dimensions
  const itemWidth = coverSize;
  const itemHeight = coverSize * 1.5 + GAP;

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height || window.innerHeight - 200, // Fallback height
        });
      }
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
  }, [location.pathname, storageKey, dimensions.height, rowCount, columnCount]);

  // Save scroll position when scrolling
  useEffect(() => {
    let scrollTimeout: number | null = null;
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
      };

      gridElement.addEventListener('scroll', handleScroll, { passive: true });
      
      cleanupFn = () => {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
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
  }, [gridRef.current, storageKey, itemHeight, itemWidth, rowCount, columnCount]);

  // Cell renderer for grid
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= games.length) {
      return <div style={style} />;
    }

    const game = games[index];

    return (
      <div
        style={{
          ...style,
          paddingLeft: columnIndex === 0 ? 0 : GAP / 2,
          paddingRight: columnIndex === columnCount - 1 ? 0 : GAP / 2,
          paddingTop: rowIndex === 0 ? 0 : GAP / 2,
          paddingBottom: rowIndex === rowCount - 1 ? 0 : GAP / 2,
        }}
      >
        <GameListItem
          game={game}
          onGameClick={onGameClick}
          onPlay={onPlay}
          onEditClick={onEditClick}
          onGameDelete={onGameDelete}
          onGameUpdate={onGameUpdate}
          buildCoverUrl={buildCoverUrl}
          coverSize={coverSize}
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
        />
      </div>
    );
  };

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div style={{ width: "100%", height: "100%" }} />;
  }

  return (
    <div style={{ opacity: isScrollRestored ? 1 : 0, transition: isScrollRestored ? 'opacity 0.1s' : 'none' }}>
      <Grid
      gridRef={gridRef}
      className="virtualized-games-grid"
      columnCount={columnCount}
      columnWidth={itemWidth + GAP}
      defaultHeight={dimensions.height}
      defaultWidth={dimensions.width}
      rowCount={rowCount}
      rowHeight={itemHeight}
      overscanCount={OVERSCAN_COUNT}
      cellComponent={Cell}
      cellProps={{} as any}
      style={{ height: dimensions.height, width: dimensions.width }}
      onResize={(size) => {
        setDimensions({ width: size.width, height: size.height });
      }}
      />
    </div>
  );
}
