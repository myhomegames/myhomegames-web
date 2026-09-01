import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isSmartTvBrowser } from "../../utils/smartTv";
import { requestTvGameDetailPlayFocus } from "../../utils/smartTvRemote";
import {
  peekTvCoverFocusIdentity,
  requestTvCoverFocusRestore,
} from "../../utils/tvCoverFocusRestore";

/** Owned game or IGDB catalog game detail. */
function isGameOrCatalogPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    /\/game\/[^/]+$/.test(path) ||
    /\/catalog-game\/[^/]+$/.test(path)
  );
}

/**
 * Collection-like detail shells (`LibraryItemDetailPage`): collections,
 * developers, publishers (and classic-layout series/franchise/platforms).
 */
function isLibraryItemDetailPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    /\/collections\/[^/]+$/.test(path) ||
    /\/developers\/[^/]+$/.test(path) ||
    /\/publishers\/[^/]+$/.test(path) ||
    /\/series\/[^/]+$/.test(path) ||
    /\/franchise\/[^/]+$/.test(path) ||
    /\/platforms\/[^/]+$/.test(path)
  );
}

function isDetailPlayFocusPath(pathname: string): boolean {
  return isGameOrCatalogPath(pathname) || isLibraryItemDetailPath(pathname);
}

/**
 * Smart TV route sync for game / catalog / collection-like detail:
 * - Entering detail → focus Play (or the icon beside it).
 * - Leaving game/catalog detail → restore the cover that opened it
 *   (complements hardware Back).
 */
export default function TvCoverFocusRouteSync() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = location.pathname;
    if (!isSmartTvBrowser()) return;

    const onPlayDetail = isDetailPlayFocusPath(location.pathname);
    const wasPlayDetail = isDetailPlayFocusPath(prev);
    const wasGameOrCatalog = isGameOrCatalogPath(prev);
    const onGameOrCatalog = isGameOrCatalogPath(location.pathname);
    const onLibraryItem = isLibraryItemDetailPath(location.pathname);

    // Entering / switching detail routes → focus Play.
    // Exception: Back from game/catalog onto collection-like — cover restore owns focus.
    if (onPlayDetail && (!wasPlayDetail || prev !== location.pathname)) {
      if (onLibraryItem && wasGameOrCatalog) {
        return;
      }
      requestTvGameDetailPlayFocus();
      return;
    }

    // Leaving game/catalog onto a non-detail list (not collection-like).
    if (!wasGameOrCatalog || onGameOrCatalog || onLibraryItem) {
      return;
    }
    if (!peekTvCoverFocusIdentity()) return;
    requestTvCoverFocusRestore();
  }, [location.pathname]);

  return null;
}
