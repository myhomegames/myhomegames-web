import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { List } from "react-window";
import type { GameItem, CollectionItem } from "../../types";
import TableRow from "./TableRow";
import "./VirtualizedGamesListTable.css";

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

type VirtualizedGamesListTableProps = {
  games: GameItem[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  allCollections?: CollectionItem[];
  columnVisibility: {
    title: boolean;
    releaseDate: boolean;
    year: boolean;
    stars: boolean;
    criticRating: boolean;
    ageRating: boolean;
  };
  handleRatingChange: (gameId: string, newStars: number) => void;
  formatRating: (value: number | null | undefined) => string | null;
  formatGameDate: (game: GameItem, t: any, i18n: any) => string | null;
  t: any;
  i18n: any;
  editGame: any;
};

const ITEM_HEIGHT = 56; // Approximate height of each table row
const OVERSCAN_COUNT = 5; // Number of items to render outside visible area

export default function VirtualizedGamesListTable({
  games,
  containerRef,
  itemRefs,
  onGameClick,
  onPlay,
  onGameUpdate,
  onGameDelete,
  allCollections = [],
  columnVisibility,
  handleRatingChange,
  formatRating,
  formatGameDate,
  t,
  i18n,
  editGame,
}: VirtualizedGamesListTableProps) {
  const location = useLocation();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const listRef = useRef<any>(null);
  const isRestoringRef = useRef(false);
  const lastSavedScrollRef = useRef<number | null>(null);
  const storageKey = `${location.pathname}:table`;
  const [isScrollRestored, setIsScrollRestored] = useState(false);

  // Expose listRef to parent via containerRef if it's a ref object
  useEffect(() => {
    if (containerRef && 'current' in containerRef && containerRef.current) {
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

    const savedScrollTop = getScrollPosition(storageKey);
    if (savedScrollTop === null || savedScrollTop < 0) {
      setIsScrollRestored(true);
      return;
    }

    isRestoringRef.current = true;

    // Wait for list to be ready
    const restoreScroll = (attempt = 0) => {
      const list = listRef.current;
      if (!list) {
        if (attempt < 50) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          isRestoringRef.current = false;
          setIsScrollRestored(true);
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
        const scrollable = containerRef.current.querySelector('[style*="overflow"]') as HTMLElement;
        if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
          listElement = scrollable;
        }
      }
      
      if (!listElement) {
        if (attempt < 20) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          isRestoringRef.current = false;
          setIsScrollRestored(true);
        }
        return;
      }

      // Restore scroll position
      listElement.scrollTop = savedScrollTop;
      
      // Verify restoration
      setTimeout(() => {
        isRestoringRef.current = false;
        setIsScrollRestored(true);
      }, 50);
    };

    restoreScroll();
  }, [dimensions.height, games.length, storageKey, containerRef]);

  // Save scroll position on scroll
  useEffect(() => {
    if (isRestoringRef.current || dimensions.height === 0) return;

    const list = listRef.current;
    if (!list) return;

    let listElement: HTMLElement | null = null;
    if (list.element) {
      listElement = list.element;
    } else if (containerRef.current) {
      listElement = containerRef.current.querySelector('[style*="overflow"]') as HTMLElement;
    }

    if (!listElement) return;

    const handleScroll = () => {
      if (isRestoringRef.current) return;

      const scrollTop = listElement?.scrollTop || 0;
      
      // Debounce: only save if scroll position changed significantly
      if (lastSavedScrollRef.current !== null && Math.abs(lastSavedScrollRef.current - scrollTop) < 10) {
        return;
      }

      lastSavedScrollRef.current = scrollTop;
      setScrollPosition(storageKey, scrollTop);
    };

    // Debounce scroll events
    let scrollTimeout: number;
    listElement.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(handleScroll, 100);
    }, { passive: true });

    return () => {
      clearTimeout(scrollTimeout);
      listElement?.removeEventListener('scroll', handleScroll);
    };
  }, [dimensions.height, storageKey, containerRef]);

  // Row component for react-window
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const game = games[index];
    if (!game) return null;

    return (
      <div style={style} className="virtualized-table-row-wrapper">
        <TableRow
          game={game}
          index={index}
          itemRefs={itemRefs}
          onGameClick={onGameClick}
          onPlay={onPlay}
          onGameUpdate={onGameUpdate}
          onGameDelete={onGameDelete}
          allCollections={allCollections}
          columnVisibility={columnVisibility}
          handleRatingChange={handleRatingChange}
          formatRating={formatRating}
          formatGameDate={formatGameDate}
          t={t}
          i18n={i18n}
          editGame={editGame}
        />
      </div>
    );
  };

  if (dimensions.height === 0 || games.length === 0) {
    return <div style={{ width: "100%", height: "100%" }} />;
  }

  return (
    <div style={{ opacity: isScrollRestored ? 1 : 0, transition: isScrollRestored ? 'opacity 0.1s' : 'none' }}>
      <div className="virtualized-games-table-wrapper">
        <table className="games-table">
          <tbody className="virtualized-games-table-tbody">
            <List
              listRef={listRef}
              className="virtualized-games-table-list"
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
