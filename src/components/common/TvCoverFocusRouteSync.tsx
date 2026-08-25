import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isSmartTvBrowser } from "../../utils/smartTv";
import { requestTvGameDetailPlayFocus } from "../../utils/smartTvRemote";
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
 * Smart TV route sync for game / catalog detail:
 * - Entering detail → focus Play (or the icon beside it).
 * - Leaving detail → restore the cover that opened it (complements hardware Back).
 */
export default function TvCoverFocusRouteSync() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = location.pathname;
    if (!isSmartTvBrowser()) return;

    const onDetail = isGameOrCatalogPath(location.pathname);
    const wasDetail = isGameOrCatalogPath(prev);

    // Entering detail, or switching between game detail routes.
    if (onDetail && (!wasDetail || prev !== location.pathname)) {
      requestTvGameDetailPlayFocus();
      return;
    }

    if (!wasDetail || onDetail) {
      return;
    }
    if (!peekTvCoverFocusIdentity()) return;
    requestTvCoverFocusRestore();
  }, [location.pathname]);

  return null;
}
