import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { List, useDynamicRowHeight } from "react-window";
import type { GameItem, CollectionItem } from "../../types";
import TableRow from "./TableRow";
// Scroll restoration: we store the first visible row INDEX (from onRowsRendered), not scrollTop.
function getSavedScrollIndex(key: string): number | null {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

function setSavedScrollIndex(key: string, index: number): void {
  try {
    sessionStorage.setItem(key, index.toString());
  } catch {
    // Ignore
  }
}

type VirtualizedGamesListTableProps = {
  games: GameItem[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onGameClick: (game: GameItem) => void;
  onIgdbGameClick?: (igdbId: number) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  allCollections?: CollectionItem[];
  columnVisibility: {
    title: boolean;
    gameType: boolean;
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
  platformIdForPlay?: string;
};

const ITEM_HEIGHT = 56; // Approximate height of each table row
const OVERSCAN_COUNT = 5; // Number of items to render outside visible area

export default function VirtualizedGamesListTable({
  games,
  containerRef,
  itemRefs,
  onGameClick,
  onIgdbGameClick,
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
  platformIdForPlay,
}: VirtualizedGamesListTableProps) {
  const location = useLocation();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const listRef = useRef<any>(null);
  const isRestoringRef = useRef(false);
  const lastVisibleIndexRef = useRef<number>(0);
  const storageKeyRef = useRef<string>("");
  const restoreVerifyTimerRef = useRef<number | undefined>(undefined);
  const storageKey = `${location.pathname}:table:index`;
  storageKeyRef.current = storageKey;
  const [isScrollRestored, setIsScrollRestored] = useState(false);
  const dynamicRowHeight = useDynamicRowHeight({ defaultRowHeight: ITEM_HEIGHT });

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

  // Restore scroll: we saved the first visible row index; scroll to that row via list API.
  useEffect(() => {
    if (dimensions.height === 0 || games.length === 0) return;

    const savedIndex = getSavedScrollIndex(storageKey);
    if (savedIndex === null || savedIndex < 0) {
      setIsScrollRestored(true);
      return;
    }

    isRestoringRef.current = true;
    const index = Math.min(games.length - 1, Math.max(0, savedIndex));

    const restoreScroll = (attempt = 0) => {
      const list = listRef.current;
      if (!list || typeof list.scrollToRow !== "function") {
        if (attempt < 50) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          isRestoringRef.current = false;
          setIsScrollRestored(true);
        }
        return;
      }

      list.scrollToRow({ index, align: "start", behavior: "auto" });

      restoreVerifyTimerRef.current = window.setTimeout(() => {
        isRestoringRef.current = false;
        setIsScrollRestored(true);
      }, 200);
    };

    const timer = setTimeout(() => restoreScroll(), 300);
    return () => {
      clearTimeout(timer);
      clearTimeout(restoreVerifyTimerRef.current);
    };
  }, [dimensions.height, games.length, storageKey, location.pathname]);

  // Save scroll: use onRowsRendered from the List to get the first visible index; save on unmount.
  useEffect(() => {
    return () => {
      const idx = lastVisibleIndexRef.current;
      if (idx >= 0) setSavedScrollIndex(storageKeyRef.current, idx);
    };
  }, [storageKey, location.pathname]);

  // Row component for react-window (useDiv so we don't put <tr> inside <div> — valid HTML only)
  const Row = ({
    index,
    style,
    dynamicRowHeight: rowHeightObserver,
  }: {
    index: number;
    style: React.CSSProperties;
    dynamicRowHeight?: ReturnType<typeof useDynamicRowHeight>;
  }) => {
    const game = games[index];
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!rowRef.current || !rowHeightObserver) return;
      const unsub = rowHeightObserver.observeRowElements([rowRef.current]);
      return unsub;
    }, [index, rowHeightObserver]);

    if (!game) return null;

    return (
      <div ref={rowRef} style={style} className="virtualized-table-row-wrapper">
        <TableRow
          game={game}
          index={index}
          itemRefs={itemRefs}
          onGameClick={onGameClick}
          onIgdbGameClick={onIgdbGameClick}
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
          useDiv
          platformIdForPlay={platformIdForPlay}
        />
      </div>
    );
  };

  if (dimensions.height === 0 || games.length === 0) {
    return <div className="virtualized-list-fill" />;
  }

  return (
    <div className={`virtualized-list-fade${isScrollRestored ? " virtualized-list-fade--ready" : ""}`}>
      <div className="virtualized-games-table-wrapper">
        <List
          listRef={listRef}
          className="virtualized-games-table-list"
          defaultHeight={dimensions.height}
          rowCount={games.length}
          rowHeight={dynamicRowHeight}
          overscanCount={OVERSCAN_COUNT}
          rowComponent={Row}
          rowProps={{ dynamicRowHeight } as any}
          style={{ height: dimensions.height, width: dimensions.width }}
          onResize={(size) => {
            setDimensions({ width: size.width, height: size.height });
          }}
          onRowsRendered={({ startIndex }) => {
            if (!isRestoringRef.current) lastVisibleIndexRef.current = startIndex;
          }}
        />
      </div>
    </div>
  );
}
