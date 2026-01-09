import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Helper per sessionStorage
function getScrollPosition(key: string): number {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function setScrollPosition(key: string, position: number): void {
  try {
    sessionStorage.setItem(key, position.toString());
  } catch {
    // Ignore
  }
}

export function useScrollRestoration(
  scrollContainerRef: React.RefObject<HTMLElement | null>,
  viewMode?: string // Optional viewMode to differentiate scroll keys
) {
  const location = useLocation();
  const isRestoringRef = useRef(false);
  const storageKey = viewMode 
    ? `${location.pathname}:${viewMode}` 
    : location.pathname;

  // Restore scroll position when route changes
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      // Container not ready yet, retry after a delay
      const timer = setTimeout(() => {
        const retryContainer = scrollContainerRef.current;
        if (retryContainer) {
          const savedPosition = getScrollPosition(storageKey);
          if (savedPosition > 0) {
            retryContainer.scrollTop = savedPosition;
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }

    isRestoringRef.current = true;
    const savedPosition = getScrollPosition(storageKey);

    if (savedPosition <= 0) {
      isRestoringRef.current = false;
      return;
    }

    // Verify when content is ready
    const restoreScroll = (attempt = 0) => {
      const currentContainer = scrollContainerRef.current;
      if (!currentContainer) {
        if (attempt < 30) {
          setTimeout(() => restoreScroll(attempt + 1), 50);
        } else {
          isRestoringRef.current = false;
        }
        return;
      }

      // Check if it's a table and if it has rows
      const isTable = viewMode === "table";
      const hasTableRows = isTable ? currentContainer.querySelector('tbody tr') : true;

      // Verify that content is rendered (scrollHeight > clientHeight)
      const hasContent = currentContainer.scrollHeight > currentContainer.clientHeight;
      
      if (!hasContent || !hasTableRows) {
        if (attempt < 100) {
          // Retry after a frame or timeout
          if (attempt < 20) {
            requestAnimationFrame(() => restoreScroll(attempt + 1));
          } else {
            setTimeout(() => restoreScroll(attempt + 1), 50);
          }
        } else {
          isRestoringRef.current = false;
        }
        return;
      }

      // Content is ready, restore position
      currentContainer.scrollTop = savedPosition;
      
      // Verify restoration worked, retry if needed
      if (attempt < 10) {
        setTimeout(() => {
          const currentPos = currentContainer.scrollTop;
          if (Math.abs(currentPos - savedPosition) > 10) {
            // Restoration failed, retry
            currentContainer.scrollTop = savedPosition;
            restoreScroll(attempt + 1);
          } else {
            isRestoringRef.current = false;
          }
        }, 100);
      } else {
        isRestoringRef.current = false;
      }
    };

    // Start restoration after a delay to ensure DOM is ready
    const timer = setTimeout(() => {
      restoreScroll();
    }, 150);

    return () => {
      clearTimeout(timer);
      isRestoringRef.current = false;
    };
  }, [location.pathname, storageKey, scrollContainerRef, viewMode]);

  // Save scroll position when scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isRestoringRef.current) return;
      
      const position = container.scrollTop;
      if (position > 0) {
        setScrollPosition(storageKey, position);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      // Save position when component unmounts
      const finalPosition = container.scrollTop;
      if (finalPosition > 0 && !isRestoringRef.current) {
        setScrollPosition(storageKey, finalPosition);
      }
    };
  }, [location.pathname, storageKey, scrollContainerRef, viewMode]);
}

