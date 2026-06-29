import { useLayoutEffect, useState } from "react";

/**
 * Controls the fade-in `--ready` class on list/index pages.
 * Skips the double-rAF delay when stale session cache is already on screen.
 */
export function usePageRevealReady(
  isBlocking: boolean,
  hasCachedContent: boolean,
): boolean {
  const [isReady, setIsReady] = useState(() => !isBlocking && hasCachedContent);

  useLayoutEffect(() => {
    if (isBlocking) {
      if (!hasCachedContent) {
        setIsReady(false);
      }
      return;
    }

    if (hasCachedContent) {
      setIsReady(true);
      return;
    }

    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isBlocking, hasCachedContent]);

  return isReady;
}
