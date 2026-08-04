import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isSmartTvBrowser } from "../../utils/smartTv";
import {
  peekTvCoverFocusIdentity,
  requestTvCoverFocusRestore,
} from "../../utils/tvCoverFocusRestore";

function isGameOrCatalogPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    /\/game\/[^/]+$/.test(path) ||
    /\/catalog-game\/[^/]+$/.test(path)
  );
}

/**
 * When SPA navigation leaves a game/catalog detail (Back, navigate(-1), …),
 * ask the Smart TV remote layer to restore the cover that opened it.
 * Complements hardware-Back-only restore so Library / collection-like work
 * the same way tags already do.
 */
export default function TvCoverFocusRouteSync() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = location.pathname;
    if (!isSmartTvBrowser()) return;
    if (!isGameOrCatalogPath(prev) || isGameOrCatalogPath(location.pathname)) {
      return;
    }
    if (!peekTvCoverFocusIdentity()) return;
    requestTvCoverFocusRestore();
  }, [location.pathname]);

  return null;
}
