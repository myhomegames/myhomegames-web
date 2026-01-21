import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { List } from "react-window";
import type { GameItem, CollectionItem } from "../../types";
import { GameDetailItem } from "./GamesListDetail";
import "./VirtualizedGamesListDetail.css";

// Helper functions for scroll restoration
function getScrollPosition(key: string): number | null {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? parseFloat(stored) : null;
  } catch {
    return null;
  }
}

function setScrollPosition(key: string, position: number): void {
  try {
    sessionStorage.setItem(key, position.toString());
  } catch {
    // Ignore
  }
}

type VirtualizedGamesListDetailProps = {
  games: GameItem[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (game: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  allCollections?: CollectionItem[];
};

const ITEM_HEIGHT = 144; // Height of each detail item (120px content + 24px margin-bottom)
const OVERSCAN_COUNT = 3; // Number of items to render outside visible area

export default function VirtualizedGamesListDetail({
  games,
  containerRef,
  itemRefs,
  onGameClick,
  onPlay,
  onEditClick,
  onGameDelete,
  onGameUpdate,
  buildCoverUrl,
  allCollections = [],
}: VirtualizedGamesListDetailProps) {
  const location = useLocation();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const listRef = useRef<any>(null);
  const isRestoringRef = useRef(false);
  const storageKey = `${location.pathname}:detail`;

  // Expose listRef to parent via containerRef if it's a ref object
  useEffect(() => {
    if (containerRef && 'current' in containerRef && containerRef.current) {
      // Store listRef in a data attribute or custom property for AlphabetNavigator to access
      (containerRef.current as any).__virtualizedListRef = listRef;
    }
  }, [containerRef]);

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width - 40,
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
    if (dimensions.height === 0 || games.length === 0) return;

    const savedRowIndex = getScrollPosition(storageKey);
    if (savedRowIndex === null || savedRowIndex < 0) return;

    isRestoringRef.current = true;

    // Wait for list to be ready
    const restoreScroll = (attempt = 0) => {
      const list = listRef.current;
      if (!list) {
        if (attempt < 50) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          isRestoringRef.current = false;
        }
        return;
      }

      // Find the scrollable element - react-window creates a scrollable div inside the container
      let listElement: HTMLElement | null = null;
      
      // Method 1: Try list.element if available
      if (list.element) {
        listElement = list.element;
      }
      // Method 2: Find scrollable element in container
      else if (containerRef.current) {
        // react-window creates a div with overflow: auto/scroll
        const scrollable = containerRef.current.querySelector('[style*="overflow"]') as HTMLElement;
        if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
          listElement = scrollable;
        }
      }
      
      if (!listElement) {
        if (attempt < 50) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          isRestoringRef.current = false;
        }
        return;
      }

      try {
        // Restore scroll position directly using scrollTop
        listElement.scrollTop = savedRowIndex;
        
        // Verify restoration worked
        setTimeout(() => {
          const currentScrollTop = listElement.scrollTop;
          
          // If position is significantly different, try again
          if (Math.abs(currentScrollTop - savedRowIndex) > 10) {
            if (attempt < 5) {
              listElement.scrollTop = savedRowIndex;
            }
          }
          
          // Reset restoring flag after a delay
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 200);
        }, 100);
      } catch (error) {
        if (attempt < 10) {
          setTimeout(() => restoreScroll(attempt + 1), 100);
        } else {
          isRestoringRef.current = false;
        }
      }
    };

    // Start restoration after a delay to ensure list is mounted
    const timer = setTimeout(() => {
      restoreScroll();
    }, 300);

    return () => {
      clearTimeout(timer);
      isRestoringRef.current = false;
    };
  }, [location.pathname, storageKey, dimensions.height, games.length]);

  // Save scroll position when scrolling
  useEffect(() => {
    let scrollTimeout: number | null = null;
    let cleanupFn: (() => void) | null = null;

    // Wait for list to be ready
    const setupScrollListener = (attempt = 0) => {
      const list = listRef.current;
      if (!list) {
        if (attempt < 20) {
          setTimeout(() => setupScrollListener(attempt + 1), 100);
        }
        return;
      }

      // Find the scrollable element - react-window creates a scrollable div inside the container
      let listElement: HTMLElement | null = null;
      
      // Method 1: Try list.element if available
      if (list.element) {
        listElement = list.element;
      }
      // Method 2: Find scrollable element in container
      else if (containerRef.current) {
        // react-window creates a div with overflow: auto/scroll
        const scrollable = containerRef.current.querySelector('[style*="overflow"]') as HTMLElement;
        if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
          listElement = scrollable;
        }
      }
      
      if (!listElement) {
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
          const scrollTop = listElement!.scrollTop;
          setScrollPosition(storageKey, scrollTop);
        }, 150);
      };

      listElement.addEventListener('scroll', handleScroll, { passive: true });
      
      cleanupFn = () => {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        listElement.removeEventListener('scroll', handleScroll);
        // Save position when component unmounts
        if (!isRestoringRef.current && listElement) {
          const scrollTop = listElement.scrollTop;
          setScrollPosition(storageKey, scrollTop);
        }
      };
    };

    setupScrollListener();

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [listRef.current, storageKey, games.length]);

  // Row renderer for list
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const game = games[index];

    return (
      <div style={style}>
        <GameDetailItem
          game={game}
          onGameClick={onGameClick}
          onPlay={onPlay}
          onEditClick={onEditClick}
          onGameDelete={onGameDelete}
          onGameUpdate={onGameUpdate}
          buildCoverUrl={buildCoverUrl}
          itemRefs={itemRefs}
          index={index}
          allCollections={allCollections}
        />
      </div>
    );
  };

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div style={{ width: "100%", height: "100%" }} />;
  }

  return (
    <List
      listRef={listRef}
      className="virtualized-games-list-detail"
      defaultHeight={dimensions.height}
      rowCount={games.length}
      rowHeight={ITEM_HEIGHT}
      overscanCount={OVERSCAN_COUNT}
      rowComponent={Row}
      rowProps={{} as any}
      style={{ height: dimensions.height, width: dimensions.width }}
      onResize={(size) => {
        setDimensions({ width: size.width, height: size.height });
      }}
    />
  );
}
