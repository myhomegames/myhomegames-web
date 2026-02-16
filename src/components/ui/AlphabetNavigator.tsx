import { useState, useEffect } from "react";
import type { GameItem } from "../../types";
import "./AlphabetNavigator.css";

type AlphabetNavigatorProps = {
  games: GameItem[];
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  ascending?: boolean;
  virtualizedGridRef?: React.RefObject<any>; // Ref to react-window Grid
  virtualizedListRef?: React.RefObject<any>; // Ref to react-window List
  viewMode?: "grid" | "detail" | "table";
  coverSize?: number; // For grid view to calculate column count
};

export default function AlphabetNavigator({
  games,
  scrollContainerRef,
  itemRefs,
  ascending = true,
  virtualizedGridRef,
  virtualizedListRef,
  viewMode,
  coverSize,
}: AlphabetNavigatorProps) {
  const [needsScroll, setNeedsScroll] = useState(false);

  // Check if scrolling is needed
  useEffect(() => {
    const checkScrollNeeded = () => {
      const container = scrollContainerRef.current;
      if (!container) {
        setNeedsScroll(false);
        return;
      }

      // Use requestAnimationFrame to check after DOM updates
      requestAnimationFrame(() => {
        if (!container) {
          setNeedsScroll(false);
          return;
        }
        
        // Check if virtual scrolling is being used by checking the container for the ref
        // This handles cases where the component is remounted (e.g., when navigating back)
        const containerAny = container as any;
        const hasVirtualizedGrid = containerAny.__virtualizedGridRef?.current;
        const hasVirtualizedList = containerAny.__virtualizedListRef?.current;
        const hasVirtualizedRef = virtualizedGridRef?.current || virtualizedListRef?.current || hasVirtualizedGrid || hasVirtualizedList;
        
        // If using virtual scrolling, always show navigator if there are many games
        if (hasVirtualizedRef) {
          setNeedsScroll(games.length > 10); // Show if more than 10 games
          return;
        }
        
        // Check if content height exceeds container height
        const hasScroll = container.scrollHeight > container.clientHeight;
        setNeedsScroll(hasScroll);
      });
    };

    // Check initially and after delays to account for rendering
    checkScrollNeeded();
    const timeoutId1 = setTimeout(checkScrollNeeded, 100);
    const timeoutId2 = setTimeout(checkScrollNeeded, 300);
    const timeoutId3 = setTimeout(checkScrollNeeded, 500);
    const timeoutId4 = setTimeout(checkScrollNeeded, 1000); // Additional check for when returning to page

    // Also check on window resize
    window.addEventListener("resize", checkScrollNeeded);

    // Check when games change - use MutationObserver to detect DOM changes
    if (scrollContainerRef.current) {
      // Use ResizeObserver to detect when container size changes
      const resizeObserver = new ResizeObserver(() => {
        // Add a small delay after resize to allow content to settle
        setTimeout(checkScrollNeeded, 50);
      });
      resizeObserver.observe(scrollContainerRef.current);

      // Use MutationObserver to detect when content is added/removed or attributes change
      const mutationObserver = new MutationObserver(() => {
        // Add a small delay after mutation to allow content to settle
        setTimeout(checkScrollNeeded, 50);
      });
      mutationObserver.observe(scrollContainerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });

      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
        clearTimeout(timeoutId4);
        window.removeEventListener("resize", checkScrollNeeded);
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    }

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearTimeout(timeoutId4);
      window.removeEventListener("resize", checkScrollNeeded);
    };
  }, [games, scrollContainerRef, virtualizedGridRef, virtualizedListRef]);

  const alphabet = ascending
    ? ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")]
    : [..."ZYXWVUTSRQPONMLKJIHGFEDCBA".split(""), "#"];

  // Get first letter of each game title
  const getFirstLetter = (title: string): string => {
    const firstChar = title.trim().charAt(0).toUpperCase();
    if (/[A-Z]/.test(firstChar)) {
      return firstChar;
    } else if (/[0-9]/.test(firstChar)) {
      return "#";
    } else {
      // For other special characters, use the first letter found in the title
      const match = title.match(/[A-Z]/i);
      return match ? match[0].toUpperCase() : "#";
    }
  };

  // Check if a letter has games
  const hasGamesForLetter = (letter: string): boolean => {
    return games.some((game) => getFirstLetter(game.title) === letter);
  };

  // Scroll to first game starting with letter
  const scrollToLetter = (letter: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Find first game starting with this letter
    const firstGameIndex = games.findIndex(
      (game) => getFirstLetter(game.title) === letter
    );
    if (firstGameIndex === -1) return;

    const game = games[firstGameIndex];

    // Check if virtual scrolling is being used by checking the container for the ref
    // This handles cases where the component is remounted (e.g., when navigating back)
    const containerAny = container as any;
    const gridRefFromContainer = containerAny.__virtualizedGridRef?.current;
    const listRefFromContainer = containerAny.__virtualizedListRef?.current;
    const actualGridRef = virtualizedGridRef?.current || gridRefFromContainer;
    const actualListRef = virtualizedListRef?.current || listRefFromContainer;

    // If using virtualized grid (grid view with virtualization)
    if (actualGridRef && viewMode === "grid") {
      const grid = actualGridRef;
      if (grid && typeof grid.scrollToCell === 'function') {
        // Calculate row and column from index
        const containerWidth = container.clientWidth;
        const itemWidth = (coverSize || 150) + 40; // coverSize + gap
        const columnCount = Math.max(1, Math.floor((containerWidth + 40) / itemWidth));
        const rowIndex = Math.floor(firstGameIndex / columnCount);
        const columnIndex = firstGameIndex % columnCount;
        
        grid.scrollToCell({
          rowIndex,
          columnIndex,
          align: "start",
          behavior: "smooth",
        });
        return;
      }
    }

    // If using virtualized list (detail or table view with virtualization)
    if (actualListRef && (viewMode === "detail" || viewMode === "table")) {
      const list = actualListRef;
      if (list && typeof list.scrollToRow === 'function') {
        list.scrollToRow({
          index: firstGameIndex,
          align: "start",
          behavior: "smooth",
        });
        return;
      }
    }

    // Try to find element using itemRefs (for non-virtualized or table view)
    if (itemRefs?.current) {
      const element = itemRefs.current.get(game.id);
      if (element) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Check if we're in table view by looking for thead element
        const thead = container.querySelector('thead');
        const headerHeight = thead ? thead.offsetHeight : 0;
        
        // Use header height + some padding, or fallback to 20px for non-table views
        const offset = headerHeight > 0 ? headerHeight + 4 : 20;
        
        const scrollTop =
          container.scrollTop + elementRect.top - containerRect.top - offset;

        container.scrollTo({
          top: scrollTop,
          behavior: "smooth",
        });
        return;
      }
    }

    // Fallback: scroll by calculating position
    // This is a simple approach - might need adjustment based on item height
    const itemsPerRow = Math.floor(container.clientWidth / 200); // Approximate
    const rowIndex = Math.floor(firstGameIndex / itemsPerRow);
    const scrollPosition = rowIndex * 200; // Approximate row height

    container.scrollTo({
      top: scrollPosition,
      behavior: "smooth",
    });
  };

  // Don't render if no scroll is needed or no games
  if (!needsScroll || games.length === 0) {
    return null;
  }

  return (
    <div className="home-page-alphabet-container">
      <div className="alphabet-navigator">
        {alphabet.map((letter) => {
          const hasGames = hasGamesForLetter(letter);
          return (
            <button
              key={letter}
              onClick={() => scrollToLetter(letter)}
              disabled={!hasGames}
              className="alphabet-button"
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
