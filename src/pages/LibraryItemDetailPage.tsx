import { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import type { MainAppOutletContext } from "../layouts/MainAppLayout";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useGameEvents } from "../hooks/useGameEvents";
import { useLoading } from "../contexts/LoadingContext";
import { useSettings } from "../contexts/SettingsContext";
import { useSkin } from "../contexts/SkinContext";
import { useCollections } from "../contexts/CollectionsContext";
import { useDevelopers } from "../contexts/DevelopersContext";
import { usePublishers } from "../contexts/PublishersContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import { useTitleFilterQuery } from "../contexts/TitleFilterContext";
import { useCatalogGamesForTag, type CatalogTagKey } from "../hooks/useCatalogGamesForTag";
import GamesList from "../components/games/GamesList";
import Cover from "../components/games/Cover";
import LibrariesBar from "../components/layout/LibrariesBar";
import StarRating from "../components/common/StarRating";
import Summary from "../components/common/Summary";
import EditCollectionLikeModal from "../components/collections/EditCollectionLikeModal";
import CompanyProfileBlock, { CompanyStatusBadge } from "../components/companies/CompanyProfileBlock";
import AddCollectionLikeToCollectionLikeModal from "../components/collections/AddCollectionLikeToCollectionLikeModal";
import DropdownMenu from "../components/common/DropdownMenu";
import Tooltip from "../components/common/Tooltip";
import BackgroundManager, { useBackground } from "../components/common/BackgroundManager";
import { resolveFocalBackdropUrl } from "../components/common/FocalSelectionBackgroundShell";
import { dispatchDeveloperOrPublisherUpdated, mergeCompanyProfileOntoItem, type CompanyProfilePatch, dispatchCollectionLikeChildLinked } from "../utils/companyProfileSync";
import { collectionInfoFromApi, hasCompanyProfileFields, pickCompanyProfileFields } from "../utils/companyProfile";
import BackgroundToggle from "../components/ui/BackgroundToggle";
import NewGamesToggle from "../components/ui/NewGamesToggle";
import ScrollableGamesSection from "../components/common/ScrollableGamesSection";
import { navigateToLibraryRoot } from "../utils/libraryNavigation";
import {
  CONTEXT_RAIL_COVER_VIEW_TRANSITION,
  CONTEXT_RAIL_LIBRARY_VIEW_TRANSITION,
  contextRailViewTransitionsEnabled,
  readContextRailNavState,
} from "../utils/contextRailIndexPeek";
import ContextRailIndexPeek from "../components/contextRail/ContextRailIndexPeek";
import { compareTitles } from "../utils/stringUtils";
import { titleMatchesFilter } from "../utils/titleFilter";
import { parseCollectionLikePseudoGameId, matchesActiveCollectionLikeDetail, type ActiveCollectionLikeDetail } from "../utils/collectionLikePseudoGame";
import {
  loadCollectionLikeSlideSections,
  parseGamesListFromApiJson,
  type CollectionLikeSlideSection,
} from "../utils/collectionLikeSectionGames";
import { isMainGameType } from "../utils/gameType";
import { buildApiUrl, buildCoverUrl, buildApiHeaders } from "../utils/api";
import { API_BASE, getApiToken } from "../config";
import type { GameItem, CollectionInfo, CollectionItem } from "../types";
import type { CollectionLikeResourceType } from "../components/collections/EditCollectionLikeModal";
type LibraryItemDetailPageProps = {
  onGameClick: (game: GameItem) => void;
  onCatalogGameClick?: (gameId: number) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  allCollections?: CollectionItem[];
};

function parseGamesFromJson(json: { games?: unknown[] }) {
  return parseGamesListFromApiJson(json);
}

/** GET /developers|publishers/:id returned 404 (company may exist only under the other role). */
const unavailableCollectionLikeIds = new Map<string, Set<string>>();

function getUnavailableCollectionLikeIds(resourceType: string): Set<string> {
  let ids = unavailableCollectionLikeIds.get(resourceType);
  if (!ids) {
    ids = new Set();
    unavailableCollectionLikeIds.set(resourceType, ids);
  }
  return ids;
}

export default function LibraryItemDetailPage({
  onGameClick,
  onCatalogGameClick,
  onGamesLoaded,
  onPlay,
  allCollections = [],
}: LibraryItemDetailPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const goBackOrHome = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };
  const { setLoading, isLoading } = useLoading();
  const { collections: allCollectionsFromContext } = useCollections();
  const { developers: allDevelopers, updateDeveloper } = useDevelopers();
  const { publishers: allPublishers, updatePublisher } = usePublishers();
  const { catalogSearchEnabled } = useSettings();
  const { activeSkinWeb } = useSkin();
  const fixedFocalContextRail =
    activeSkinWeb.compactCollectionLikeDetail && activeSkinWeb.verticalCoverAlignment;
  const titleFilterQuery = useTitleFilterQuery();
  const { games: libraryGames } = useLibraryGames();
  const params = useParams<{ collectionId?: string; developerId?: string; publisherId?: string }>();
  const collectionId = params.collectionId;
  const developerId = params.developerId;
  const publisherId = params.publisherId;
  const resourceType: CollectionLikeResourceType = collectionId
    ? "collections"
    : developerId
      ? "developers"
      : "publishers";
  const id = collectionId ?? developerId ?? publisherId ?? null;

  const [item, setItem] = useState<CollectionInfo | null>(null);
  const [games, setGames] = useState<GameItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [viewMode] = useState<"grid" | "detail" | "table">("grid");
  const [coverSize, setCoverSize] = useState(() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  });
  const [customOrder, setCustomOrder] = useState<string[] | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [scrollRestoreTrigger, setScrollRestoreTrigger] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const fetchingGamesRef = useRef<boolean>(false);
  const lastIdRef = useRef<string | undefined>(undefined);
  const scrollPositionToRestoreRef = useRef<number | null>(null);
  /** Snapshot taken when user clicks Edit; only we write it, so nothing can overwrite it before restore */
  const scrollSnapshotForModalRef = useRef<number | null>(null);
  const [focalGameBackground, setFocalGameBackground] = useState<
    { background?: string } | undefined
  >();
  const handleFocalGameSelectionChange = useCallback((game: GameItem | null) => {
    if (!game) {
      setFocalGameBackground(undefined);
      return;
    }
    setFocalGameBackground({ background: game.background });
  }, []);

  useEffect(() => {
    setFocalGameBackground(undefined);
  }, [id]);

  useEffect(() => {
    if (resourceType !== "developers" && resourceType !== "publishers") return;
    const handleCompanyProfileUpdated = (event: Event) => {
      const profile = (event as CustomEvent<{ profile: CompanyProfilePatch }>).detail?.profile;
      if (!profile || !id || String(profile.id) !== String(id)) return;
      setItem((prev) => (prev ? mergeCompanyProfileOntoItem(prev, profile) : prev));
    };
    window.addEventListener("companyProfileUpdated", handleCompanyProfileUpdated);
    return () => window.removeEventListener("companyProfileUpdated", handleCompanyProfileUpdated);
  }, [resourceType, id]);

  const scrollStorageKey = `${location.pathname}:modalScroll`;

  const libraryGameIds = useMemo(
    () =>
      libraryGames
        .map((g) => (typeof g.id === "number" ? g.id : parseInt(String(g.id), 10)))
        .filter((n) => !Number.isNaN(n)),
    [libraryGames]
  );

  const catalogTagKey: CatalogTagKey | null =
    resourceType === "developers" ? "developers" : resourceType === "publishers" ? "publishers" : null;
  const { catalogGames: catalogTagGames, loading: _catalogTagLoading } = useCatalogGamesForTag(
    catalogSearchEnabled && catalogTagKey && id ? catalogTagKey : null,
    id ?? null,
    libraryGameIds,
    true,
    undefined
  );

  const canShowNewGamesToggle = (resourceType === "developers" || resourceType === "publishers") && !!catalogSearchEnabled;
  const storageKeyForNewGames = resourceType === "developers" ? "developers" : "publishers";
  const [showNewGames, setShowNewGames] = useState<boolean>(() => {
    if (resourceType !== "developers" && resourceType !== "publishers") return false;
    const saved = localStorage.getItem(`showNewGames_${storageKeyForNewGames}`);
    if (saved === "false") return false;
    if (saved === "true") return true;
    return false;
  });
  useEffect(() => {
    if (!canShowNewGamesToggle) return;
    localStorage.setItem(`showNewGames_${storageKeyForNewGames}`, String(showNewGames));
  }, [canShowNewGamesToggle, showNewGames, storageKeyForNewGames]);

  /*
   * Local per-item `mainGamesOnly` used only by the classic shell (each detail page owns its
   * state and persists it per collection/developer/publisher).
   *
   * Under the persistent shell (`persistentLibraryShell`) the in-page
   * LibrariesBar is hidden via CSS and the visible toggle lives on the shell bar mounted by
   * MainAppLayout. In that case we reuse the shared outlet-context state so the shell toggle
   * actually filters the detail view, and a single user choice stays active while navigating
   * across library/collections/developers/publishers.
   */
  const outletContext = useOutletContext<MainAppOutletContext | null>();
  const [localMainGamesOnly, setLocalMainGamesOnly] = useState(false);
  useEffect(() => {
    if (outletContext) return;
    if (!id) return;
    const key = `mainGamesOnly_${resourceType}_${id}`;
    const saved = localStorage.getItem(key);
    setLocalMainGamesOnly(saved === "true");
  }, [id, resourceType, outletContext]);
  useEffect(() => {
    if (outletContext) return;
    if (!id) return;
    localStorage.setItem(`mainGamesOnly_${resourceType}_${id}`, String(localMainGamesOnly));
  }, [id, resourceType, localMainGamesOnly, outletContext]);
  const mainGamesOnly = outletContext ? outletContext.mainGamesOnly : localMainGamesOnly;
  const setMainGamesOnly = outletContext ? outletContext.setMainGamesOnly : setLocalMainGamesOnly;

  useScrollRestoration(scrollContainerRef, undefined, !fixedFocalContextRail);

  useEffect(() => {
    const navState = (location.state as { resetScrollToTop?: boolean } | null) ?? null;
    if (!navState?.resetScrollToTop) return;

    const clearAndScrollTop = () => {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = 0;
      }
      try {
        sessionStorage.removeItem(location.pathname);
        sessionStorage.removeItem(`${location.pathname}:modalScroll`);
        sessionStorage.removeItem(`${location.pathname}:collections`);
        sessionStorage.removeItem(`${location.pathname}:grid`);
      } catch {
        // Ignore storage errors
      }
    };

    clearAndScrollTop();
    const t0 = setTimeout(clearAndScrollTop, 0);
    const t50 = setTimeout(clearAndScrollTop, 50);
    const t150 = setTimeout(clearAndScrollTop, 150);
    return () => {
      clearTimeout(t0);
      clearTimeout(t50);
      clearTimeout(t150);
    };
  }, [location.pathname, location.state]);

  // Keep scroll position ref updated on scroll (when modal closed) so we have it before click on Edit.
  // Re-run when item is set so we attach the listener once the scroll container is in the DOM.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || isEditModalOpen) return;
    const onScroll = () => {
      const pos = el.scrollTop;
      // Only update ref when there's real scrollable content; when scrollHeight collapses
      // (e.g. on modal open/re-render) we get scrollTop 0 and would overwrite the good value.
      if (el.scrollHeight > el.clientHeight) {
        scrollPositionToRestoreRef.current = pos;
        try {
          if (pos > 0) sessionStorage.setItem(scrollStorageKey, String(pos));
        } catch {
          // ignore
        }
      }
    };
    if (el.scrollHeight > el.clientHeight) {
      scrollPositionToRestoreRef.current = el.scrollTop;
      try {
        if (el.scrollTop > 0) sessionStorage.setItem(scrollStorageKey, String(el.scrollTop));
      } catch {
        // ignore
      }
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isEditModalOpen, item, scrollStorageKey]);

  // Restore scroll when modal is closed
  useLayoutEffect(() => {
    if (isEditModalOpen) return;
    let saved = scrollSnapshotForModalRef.current ?? scrollPositionToRestoreRef.current;
    // Fallback: read from sessionStorage (we write there on every valid scroll; nothing overwrites it when collapsed)
    if ((saved === null || saved === 0) && scrollStorageKey) {
      try {
        const stored = sessionStorage.getItem(scrollStorageKey);
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed > 0) saved = parsed;
        }
      } catch {
        // ignore
      }
    }
    if (saved === null) return;
    scrollSnapshotForModalRef.current = null;
    scrollPositionToRestoreRef.current = null;
    const container = scrollContainerRef.current;
    if (!container) return;

    const restore = () => {
      if (!container.scrollHeight) return;
      const maxScroll = container.scrollHeight - container.clientHeight;
      const toSet = maxScroll > 0 ? Math.min(saved, maxScroll) : 0;
      container.scrollTop = toSet;
      try {
        container.focus({ preventScroll: true });
      } catch {
        // ignore
      }
    };
    // Restore immediately
    restore();
    // Run again after modal's useEffect cleanup (body overflow + focus) so we win over browser scroll
    const t0 = setTimeout(restore, 0);
    const t50 = setTimeout(restore, 50);
    const t100 = setTimeout(restore, 100);
    const t200 = setTimeout(restore, 200);
    try {
      sessionStorage.setItem(location.pathname, String(saved));
    } catch {
      // ignore
    }
    return () => {
      clearTimeout(t0);
      clearTimeout(t50);
      clearTimeout(t100);
      clearTimeout(t200);
    };
  }, [item, games, isEditModalOpen, location.pathname, scrollRestoreTrigger]);

  const handleCoverSizeChange = (size: number) => {
    setCoverSize(size);
    localStorage.setItem("coverSize", size.toString());
    window.dispatchEvent(
      new CustomEvent("mhg-cover-size-changed", { detail: { size } })
    );
  };

  /*
   * In the persistent shell (`persistentLibraryShell`), LibrariesBar in
   * MainAppLayout owns coverSize; moving the slider there does not update this page’s local
   * coverSize (initialized once from localStorage). Listen for the event from
   * useLibrariesShellState (and from our own handler) to keep detail-page cover size in sync.
   */
  useEffect(() => {
    function handler(event: Event) {
      const detail = (event as CustomEvent<{ size?: number }>).detail;
      const next = detail?.size;
      if (typeof next === "number" && Number.isFinite(next)) {
        setCoverSize((prev) => (prev === next ? prev : next));
      }
    }
    window.addEventListener("mhg-cover-size-changed", handler as EventListener);
    return () =>
      window.removeEventListener("mhg-cover-size-changed", handler as EventListener);
  }, []);

  // Load item info when id changes (collections)
  useEffect(() => {
    if (resourceType !== "collections" || !collectionId) return;
    if (collectionId !== lastIdRef.current) {
      lastIdRef.current = collectionId;
      fetchingGamesRef.current = false;
      const foundInContext = allCollectionsFromContext.find((c) => String(c.id) === String(collectionId));
      if (foundInContext) {
        setItem({
          id: String(foundInContext.id),
          title: foundInContext.title,
          summary: foundInContext.summary,
          cover: foundInContext.cover,
          background: foundInContext.background,
          showTitle: (foundInContext as any).showTitle !== false,
          childs: (foundInContext as any).childs || [],
        });
      }
      // Always refresh the single item from API so cover/background are never stale.
      fetchCollectionInfo(collectionId);
      if (!fetchingGamesRef.current) fetchCollectionGames(collectionId);
    }
  }, [collectionId, resourceType, allCollectionsFromContext]);

  useEffect(() => {
    if (resourceType === "collections" && collectionId && !item) {
      const foundInContext = allCollectionsFromContext.find((c) => String(c.id) === String(collectionId));
      if (foundInContext) {
        setItem({
          id: String(foundInContext.id),
          title: foundInContext.title,
          summary: foundInContext.summary,
          cover: foundInContext.cover,
          background: foundInContext.background,
          showTitle: (foundInContext as any).showTitle !== false,
          childs: (foundInContext as any).childs || [],
        });
      }
    }
  }, [allCollectionsFromContext, collectionId, resourceType, item]);

  // When a game is added to THIS collection, save scroll then refetch so the list updates and we restore position
  useEffect(() => {
    if (resourceType !== "collections" || !collectionId) return;
    const handleCollectionUpdated = (e: Event) => {
      const ev = e as CustomEvent<{ collectionId?: string | number }>;
      if (String(ev.detail?.collectionId) !== String(collectionId)) return;
      const el = scrollContainerRef.current;
      if (el && el.scrollHeight > el.clientHeight && el.scrollTop > 0) {
        scrollPositionToRestoreRef.current = el.scrollTop;
        try {
          sessionStorage.setItem(scrollStorageKey, String(el.scrollTop));
        } catch {
          // ignore
        }
      }
      fetchCollectionGames(collectionId);
    };
    window.addEventListener("collectionUpdated", handleCollectionUpdated as EventListener);
    return () => window.removeEventListener("collectionUpdated", handleCollectionUpdated as EventListener);
  }, [collectionId, resourceType, scrollStorageKey]);

  // When a game is added to ANY collection (e.g. "Aggiungi a" on an item), bump trigger so restore effect runs after re-render
  useEffect(() => {
    const handle = () => setScrollRestoreTrigger((n) => n + 1);
    window.addEventListener("collectionUpdated", handle);
    return () => window.removeEventListener("collectionUpdated", handle);
  }, []);

  // Load item info when id changes (developers) — same pattern as collections
  useEffect(() => {
    if (resourceType !== "developers" || !developerId) return;
    if (developerId !== lastIdRef.current) {
      lastIdRef.current = developerId;
      fetchingGamesRef.current = false;
      const foundInContext = allDevelopers.find((d) => String(d.id) === String(developerId));
      if (foundInContext) {
        setItem({
          id: String(foundInContext.id),
          title: foundInContext.title,
          summary: foundInContext.summary,
          cover: foundInContext.cover,
          background: (foundInContext as any).background,
          showTitle: (foundInContext as any).showTitle !== false,
          childs: (foundInContext as any).childs || [],
        });
      }
      fetchDeveloperInfo(developerId);
      if (!fetchingGamesRef.current) fetchDeveloperGames(developerId);
    }
  }, [developerId, resourceType, allDevelopers]);

  useEffect(() => {
    if (resourceType === "developers" && developerId && !item) {
      const foundInContext = allDevelopers.find((d) => String(d.id) === String(developerId));
      if (foundInContext) {
        setItem({
          id: String(foundInContext.id),
          title: foundInContext.title,
          summary: foundInContext.summary,
          cover: foundInContext.cover,
          background: (foundInContext as any).background,
          showTitle: (foundInContext as any).showTitle !== false,
          childs: (foundInContext as any).childs || [],
        });
      }
    }
  }, [allDevelopers, developerId, resourceType, item]);

  // Load item info when id changes (publishers) — same pattern as collections
  useEffect(() => {
    if (resourceType !== "publishers" || !publisherId) return;
    if (publisherId !== lastIdRef.current) {
      lastIdRef.current = publisherId;
      fetchingGamesRef.current = false;
      const foundInContext = allPublishers.find((p) => String(p.id) === String(publisherId));
      if (foundInContext) {
        setItem({
          id: String(foundInContext.id),
          title: foundInContext.title,
          summary: foundInContext.summary,
          cover: foundInContext.cover,
          background: (foundInContext as any).background,
          showTitle: (foundInContext as any).showTitle !== false,
          childs: (foundInContext as any).childs || [],
        });
      }
      fetchPublisherInfo(publisherId);
      if (!fetchingGamesRef.current) fetchPublisherGames(publisherId);
    }
  }, [publisherId, resourceType, allPublishers]);

  useEffect(() => {
    if (resourceType === "publishers" && publisherId && !item) {
      const foundInContext = allPublishers.find((p) => String(p.id) === String(publisherId));
      if (foundInContext) {
        setItem({
          id: String(foundInContext.id),
          title: foundInContext.title,
          summary: foundInContext.summary,
          cover: foundInContext.cover,
          background: (foundInContext as any).background,
          showTitle: (foundInContext as any).showTitle !== false,
          childs: (foundInContext as any).childs || [],
        });
      }
    }
  }, [allPublishers, publisherId, resourceType, item]);

  useGameEvents({ setGames, enabledEvents: ["gameUpdated", "gameDeleted"] });

  useEffect(() => {
    const handleLanguageChanged = () => {
      if (resourceType === "collections" && collectionId) {
        void fetchCollectionInfo(collectionId);
        void fetchCollectionGames(collectionId);
      } else if (resourceType === "developers" && developerId) {
        void fetchDeveloperInfo(developerId);
        void fetchDeveloperGames(developerId);
      } else if (resourceType === "publishers" && publisherId) {
        void fetchPublisherInfo(publisherId);
        void fetchPublisherGames(publisherId);
      }
    };
    window.addEventListener("mhg-language-changed", handleLanguageChanged);
    return () => window.removeEventListener("mhg-language-changed", handleLanguageChanged);
  }, [resourceType, collectionId, developerId, publisherId]);

  useLayoutEffect(() => {
    if (!isLoading && item) {
      requestAnimationFrame(() => requestAnimationFrame(() => setIsReady(true)));
    } else if (isLoading && !item) {
      setIsReady(false);
    }
  }, [isLoading, item, games.length]);

  async function fetchCollectionInfo(cid: string) {
    try {
      const singleUrl = buildApiUrl(API_BASE, `/collections/${cid}`);
      const singleRes = await fetch(singleUrl, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (singleRes.ok) {
        const found = await singleRes.json();
        setItem({
          id: String(found.id),
          title: found.title,
          summary: found.summary,
          cover: found.cover,
          background: found.background,
          showTitle: found.showTitle !== false,
          childs: found.childs || [],
        });
        return;
      }
      const found = allCollectionsFromContext.find((c) => String(c.id) === String(cid));
      if (found) {
        setItem({
          id: String(found.id),
          title: found.title,
          summary: found.summary,
          cover: found.cover,
          background: found.background,
          showTitle: (found as any).showTitle !== false,
          childs: (found as any).childs || [],
        });
      }
    } catch (err: any) {
      console.error("Error fetching collection info:", err?.message);
    }
  }

  async function fetchCollectionGames(cid: string) {
    if (fetchingGamesRef.current) return;
    fetchingGamesRef.current = true;
    setLoading(true);
    try {
      const url = buildApiUrl(API_BASE, `/collections/${cid}/games`);
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const parsed = parseGamesFromJson(json);
      const yearSorted = [...parsed].sort((a, b) => {
        const yearA = a.year ?? 0;
        const yearB = b.year ?? 0;
        if (yearA !== 0 && yearB !== 0) return yearA - yearB;
        if (yearA !== 0 && yearB === 0) return -1;
        if (yearA === 0 && yearB !== 0) return 1;
        return 0;
      });
      const orderFromBackend = parsed.map((g) => g.id);
      const yearSortedOrder = yearSorted.map((g) => g.id);
      const orderMatches =
        orderFromBackend.length === yearSortedOrder.length &&
        orderFromBackend.every((id, idx) => id === yearSortedOrder[idx]);
      if (!orderMatches) setCustomOrder(orderFromBackend);
      else setCustomOrder(null);
      setGames(parsed);
      onGamesLoaded(parsed);
    } catch (err: any) {
      console.error("Error fetching collection games:", err?.message);
    } finally {
      setLoading(false);
      fetchingGamesRef.current = false;
    }
  }

  async function fetchDeveloperInfo(devId: string) {
    try {
      const url = buildApiUrl(API_BASE, `/developers/${devId}`);
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setItem(collectionInfoFromApi(data));
    } catch (err) {
      console.error("Error fetching developer:", err);
    }
  }

  async function fetchDeveloperGames(devId: string) {
    fetchingGamesRef.current = true;
    setLoading(true);
    try {
      const url = buildApiUrl(API_BASE, `/developers/${devId}/games`);
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const parsed = parseGamesFromJson(json);
      setGames(parsed);
      onGamesLoaded(parsed);
    } catch (err) {
      console.error("Error fetching developer games:", err);
    } finally {
      setLoading(false);
      fetchingGamesRef.current = false;
    }
  }

  async function fetchPublisherInfo(pubId: string) {
    try {
      const url = buildApiUrl(API_BASE, `/publishers/${pubId}`);
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setItem(collectionInfoFromApi(data));
    } catch (err) {
      console.error("Error fetching publisher:", err);
    }
  }

  async function fetchPublisherGames(pubId: string) {
    fetchingGamesRef.current = true;
    setLoading(true);
    try {
      const url = buildApiUrl(API_BASE, `/publishers/${pubId}/games`);
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const parsed = parseGamesFromJson(json);
      setGames(parsed);
      onGamesLoaded(parsed);
    } catch (err) {
      console.error("Error fetching publisher games:", err);
    } finally {
      setLoading(false);
      fetchingGamesRef.current = false;
    }
  }

  const handleConfirmDelete = async () => {
    if (!id || !item) return;
    const apiToken = getApiToken();
    const base = resourceType; // "collections" | "developers" | "publishers"
    setIsDeleting(true);
    setDeleteError(null);
    setLoading(true);
    try {
      const url = buildApiUrl(API_BASE, `/${base}/${id}`);
      const res = await fetch(url, { method: "DELETE", headers: { "X-Auth-Token": apiToken } });
      if (!res.ok) throw new Error("Delete failed");
      const eventName = resourceType === "collections" ? "collectionDeleted" : resourceType === "developers" ? "developerDeleted" : "publisherDeleted";
      const detailKey = resourceType === "collections" ? "collectionId" : resourceType === "developers" ? "developerId" : "publisherId";
      window.dispatchEvent(new CustomEvent(eventName, { detail: { [detailKey]: id } }));
      setShowDeleteModal(false);
      goBackOrHome();
    } catch (err) {
      setDeleteError(String((err as Error).message));
    } finally {
      setIsDeleting(false);
      setLoading(false);
    }
  };

  const handleRemoveFromDeveloper = async (gameId: string) => {
    if (!developerId) return;
    const apiToken = getApiToken();
    try {
      const gameUrl = buildApiUrl(API_BASE, `/games/${gameId}`);
      const gameRes = await fetch(gameUrl, {
        headers: { Accept: "application/json", "X-Auth-Token": apiToken },
      });
      if (!gameRes.ok) throw new Error("Failed to fetch game");
      const gameData = await gameRes.json();
      const game = gameData.game || gameData;
      const current = (game.developers || []).map((d: any) => (typeof d === "object" ? { id: d.id, name: d.name } : { id: d, name: String(d) }));
      const newDevelopers = current.filter((d: any) => Number(d.id) !== Number(developerId));
      const putRes = await fetch(gameUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Auth-Token": apiToken },
        body: JSON.stringify({ developers: newDevelopers }),
      });
      if (!putRes.ok) throw new Error("Failed to remove from developer");
      const result = await putRes.json();
      const updatedGame = result.game;
      if (updatedGame) window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
      window.dispatchEvent(new CustomEvent("developerUpdated", { detail: { developerId } }));
      if (scrollContainerRef.current) scrollPositionToRestoreRef.current = scrollContainerRef.current.scrollTop;
      setGames((prev) => prev.filter((g) => String(g.id) !== String(gameId)));
    } catch (err) {
      console.error("Error removing game from developer:", err);
    }
  };

  const handleRemoveFromPublisher = async (gameId: string) => {
    if (!publisherId) return;
    const apiToken = getApiToken();
    try {
      const gameUrl = buildApiUrl(API_BASE, `/games/${gameId}`);
      const gameRes = await fetch(gameUrl, {
        headers: { Accept: "application/json", "X-Auth-Token": apiToken },
      });
      if (!gameRes.ok) throw new Error("Failed to fetch game");
      const gameData = await gameRes.json();
      const game = gameData.game || gameData;
      const current = (game.publishers || []).map((p: any) => (typeof p === "object" ? { id: p.id, name: p.name } : { id: p, name: String(p) }));
      const newPublishers = current.filter((p: any) => Number(p.id) !== Number(publisherId));
      const putRes = await fetch(gameUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Auth-Token": apiToken },
        body: JSON.stringify({ publishers: newPublishers }),
      });
      if (!putRes.ok) throw new Error("Failed to remove from publisher");
      const result = await putRes.json();
      const updatedGame = result.game;
      if (updatedGame) window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
      window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: { publisherId } }));
      if (scrollContainerRef.current) scrollPositionToRestoreRef.current = scrollContainerRef.current.scrollTop;
      setGames((prev) => prev.filter((g) => String(g.id) !== String(gameId)));
    } catch (err) {
      console.error("Error removing game from publisher:", err);
    }
  };

  const mergedGames = useMemo(() => {
    if (!canShowNewGamesToggle || !id) return games;
    const libraryById = new Map(games.map((g) => [String(g.id), g]));
    const seenIds = new Set<string>();
    const result: GameItem[] = [];
    for (const ig of catalogTagGames) {
      const sid = String(ig.id);
      seenIds.add(sid);
      const lib = libraryById.get(sid);
      if (lib) result.push(lib);
      else
        result.push({
          id: sid,
          title: ig.name,
          cover: ig.cover || undefined,
          year: ig.releaseDate ?? undefined,
          isCatalogOnly: true,
        });
    }
    for (const g of games) {
      if (!seenIds.has(String(g.id))) result.push(g);
    }
    result.sort((a, b) => {
      const yearA = a.year ?? 0;
      const yearB = b.year ?? 0;
      if (yearA !== 0 && yearB !== 0) return yearA - yearB;
      if (yearA !== 0 && yearB === 0) return -1;
      if (yearA === 0 && yearB !== 0) return 1;
      return compareTitles(a.title || "", b.title || "");
    });
    return result;
  }, [canShowNewGamesToggle, id, catalogTagGames, games]);

  const gamesToShow = canShowNewGamesToggle && showNewGames ? mergedGames : games;

  const sortedGames = useMemo(() => {
    const source = gamesToShow;
    if (resourceType === "collections" && customOrder && customOrder.length === source.length) {
      const gameMap = new Map(source.map((g) => [g.id, g]));
      return customOrder.map((id) => gameMap.get(id)).filter(Boolean) as GameItem[];
    }
    const sorted = [...source];
    sorted.sort((a, b) => {
      const yearA = a.year ?? 0;
      const yearB = b.year ?? 0;
      if (yearA !== 0 && yearB !== 0) return yearA - yearB;
      if (yearA !== 0 && yearB === 0) return -1;
      if (yearA === 0 && yearB !== 0) return 1;
      return compareTitles(a.title || "", b.title || "");
    });
    return sorted;
  }, [gamesToShow, customOrder, resourceType]);

  const gridGames = useMemo(() => {
    const base = !mainGamesOnly ? sortedGames : sortedGames.filter((g) => isMainGameType(g));
    return base.filter((g) => titleMatchesFilter(g.title, titleFilterQuery));
  }, [sortedGames, mainGamesOnly, titleFilterQuery]);

  const titleFilterActive = titleFilterQuery.trim().length > 0;

  const handleGameUpdate = (updatedGame: GameItem) => {
    if (scrollContainerRef.current) scrollPositionToRestoreRef.current = scrollContainerRef.current.scrollTop;
    setGames((prev) => prev.map((g) => (String(g.id) === String(updatedGame.id) ? updatedGame : g)));
    window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
    // Don't refetch collection here: it would overwrite state with API response (cover without timestamp) and the list would show the old cover again
    // if (collectionId) fetchCollectionGames(collectionId);
  };

  const handleGameDelete = (deletedGame: GameItem) => {
    if (scrollContainerRef.current) scrollPositionToRestoreRef.current = scrollContainerRef.current.scrollTop;
    setGames((prev) => prev.filter((g) => String(g.id) !== String(deletedGame.id)));
  };

  const handleRemoveFromCollection = (gameId: string) => {
    if (scrollContainerRef.current) scrollPositionToRestoreRef.current = scrollContainerRef.current.scrollTop;
    setGames((prev) => prev.filter((g) => String(g.id) !== String(gameId)));
  };

  const handleDragEnd = async (sourceIndex: number, destinationIndex: number) => {
    if (sourceIndex === destinationIndex || resourceType !== "collections") return;
    if (scrollContainerRef.current) scrollPositionToRestoreRef.current = scrollContainerRef.current.scrollTop;
    const newGames = [...sortedGames];
    const [removed] = newGames.splice(sourceIndex, 1);
    newGames.splice(destinationIndex, 0, removed);
    const newOrder = newGames.map((g) => g.id);
    setCustomOrder(newOrder);
    setGames(newGames);
    if (collectionId) {
      try {
        const url = buildApiUrl(API_BASE, `/collections/${collectionId}/games/order`);
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Auth-Token": getApiToken() },
          body: JSON.stringify({ gameIds: newOrder }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err: any) {
        setCustomOrder(null);
        fetchCollectionGames(collectionId);
      }
    }
  };

  const yearRange = useMemo(() => {
    const years = gamesToShow.map((g) => g.year).filter((y): y is number => y != null);
    if (years.length === 0) return null;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? min.toString() : `${min} - ${max}`;
  }, [gamesToShow]);

  const averageRating = useMemo(() => {
    const ratings = gamesToShow.map((g) => g.stars).filter((s): s is number => s != null);
    if (ratings.length === 0) return null;
    const sum = ratings.reduce((a, b) => a + b, 0);
    return (sum / ratings.length / 10) * 5;
  }, [gamesToShow]);

  const notFoundMessage =
    resourceType === "collections"
      ? "Collection not found"
      : resourceType === "developers"
        ? t("tags.noItemsFound", { type: t("catalogInfo.developers", "Developers") })
        : t("tags.noItemsFound", { type: t("catalogInfo.publishers", "Publishers") });

  if (!id) {
    return (
      <div className="library-item-detail-not-found bg-[#1a1a1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400">{notFoundMessage}</div>
        </div>
      </div>
    );
  }

  const coverWidth = 240;
  const coverHeight = 360;
  const backdropMedia = useMemo(() => {
    if (activeSkinWeb.autoShowBackgroundOnSelection && fixedFocalContextRail && focalGameBackground) {
      return { id: `game-${id}`, ...focalGameBackground };
    }
    if (item) {
      return {
        id: String(id),
        background: item.background,
      };
    }
    return null;
  }, [
    activeSkinWeb.autoShowBackgroundOnSelection,
    fixedFocalContextRail,
    focalGameBackground,
    item,
    id,
  ]);
  const backgroundUrl = resolveFocalBackdropUrl(backdropMedia);
  const hasBackground = Boolean(backgroundUrl && backgroundUrl.trim() !== "");

  const backgroundStateKey = `${id}:${backdropMedia?.background ?? ""}`;

  return (
    <BackgroundManager
      backgroundUrl={backgroundUrl}
      hasBackground={hasBackground}
      elementId={backgroundStateKey}
      autoShowWhenAvailable={activeSkinWeb.autoShowBackgroundOnSelection}
    >
      <LibraryItemDetailContent
        item={item}
        itemCover={item?.cover}
        coverWidth={coverWidth}
        coverHeight={coverHeight}
        yearRange={yearRange}
        averageRating={averageRating}
        onPlay={onPlay}
        sortedGames={sortedGames}
        onGameClick={onGameClick}
        onCatalogGameClick={onCatalogGameClick}
        onGameUpdate={handleGameUpdate}
        onGameDelete={handleGameDelete}
        buildCoverUrl={(apiBase, cover, addTimestamp, customTimestamp) => buildCoverUrl(apiBase, cover, addTimestamp ?? false, customTimestamp)}
        coverSize={coverSize}
        handleCoverSizeChange={handleCoverSizeChange}
        viewMode={viewMode}
        itemRefs={itemRefs}
        handleDragEnd={handleDragEnd}
        scrollContainerRef={scrollContainerRef}
        isReady={isReady}
        isEditModalOpen={isEditModalOpen}
        onEditModalOpen={() => {
          // Prefer sessionStorage (persistent, only updated when scrollHeight > clientHeight)
          let toSave: number | null = null;
          try {
            const stored = sessionStorage.getItem(scrollStorageKey);
            if (stored !== null) toSave = parseInt(stored, 10);
          } catch {
            // ignore
          }
          if (toSave === null || isNaN(toSave)) {
            const el = scrollContainerRef.current;
            const live = el && el.scrollHeight > el.clientHeight ? el.scrollTop : null;
            toSave = scrollPositionToRestoreRef.current ?? live;
          }
          scrollSnapshotForModalRef.current = toSave;
          setIsEditModalOpen(true);
        }}
        onEditModalClose={() => setIsEditModalOpen(false)}
        onItemUpdate={(updated) => {
          const merged = { ...item, ...updated, childs: updated.childs ?? item?.childs ?? [] } as CollectionInfo;
          setItem(merged);
          if (resourceType === "developers") updateDeveloper({ ...merged, gameCount: sortedGames.length });
          if (resourceType === "publishers") updatePublisher({ ...merged, gameCount: sortedGames.length });
        }}
        t={t}
        allCollections={allCollections}
        allCollectionLikes={
          resourceType === "collections"
            ? allCollectionsFromContext
            : resourceType === "developers"
              ? allDevelopers
              : allPublishers
        }
        resourceType={resourceType}
        collectionId={resourceType === "collections" ? collectionId : undefined}
        onRemoveFromCollection={resourceType === "collections" ? handleRemoveFromCollection : undefined}
        developerId={resourceType === "developers" ? developerId ?? undefined : undefined}
        publisherId={resourceType === "publishers" ? publisherId ?? undefined : undefined}
        onRemoveFromDeveloper={resourceType === "developers" ? handleRemoveFromDeveloper : undefined}
        onRemoveFromPublisher={resourceType === "publishers" ? handleRemoveFromPublisher : undefined}
        showDeleteModal={showDeleteModal}
        isDeleting={isDeleting}
        deleteError={deleteError}
        onDeleteClick={() => setShowDeleteModal(true)}
        onConfirmDelete={handleConfirmDelete}
        onCloseDeleteModal={() => !isDeleting && setShowDeleteModal(false)}
        onCollectionClick={(cid) => {
          const base =
            resourceType === "collections"
              ? "collections"
              : resourceType === "developers"
                ? "developers"
                : "publishers";
          const targetPath = `/${base}/${cid}`;
          try {
            // Ensure destination detail opens from top instead of restoring previous scroll.
            sessionStorage.removeItem(targetPath);
            sessionStorage.removeItem(`${targetPath}:modalScroll`);
            sessionStorage.removeItem(`${targetPath}:collections`);
            sessionStorage.removeItem(`${targetPath}:collections:${base}`);
          } catch {
            // Ignore storage errors
          }
          navigate(targetPath, { state: { resetScrollToTop: true } });
        }}
        onPlayFirstInCollectionLike={async (type: string, cid: string) => {
          if (!onPlay) return;
          const base =
            type === "collections"
              ? "collections"
              : type === "developers"
                ? "developers"
                : "publishers";
          try {
            const url = buildApiUrl(API_BASE, `/${base}/${cid}/games`);
            const res = await fetch(url, {
              headers: buildApiHeaders({ Accept: "application/json" }),
            });
            if (!res.ok) return;
            const json = await res.json();
            const games = parseGamesFromJson(json);
            const first = games.find((g) => g.executables && g.executables.length > 0);
            if (first) onPlay(first);
          } catch (e) {
            console.error(`Error fetching ${base} games:`, e);
          }
        }}
        showNewGamesToggle={canShowNewGamesToggle}
        showNewGames={showNewGames}
        onShowNewGamesChange={setShowNewGames}
        showNewGamesLabel={canShowNewGamesToggle ? t("tagGames.showNewGames") : undefined}
        gridGames={gridGames}
        mainGamesOnly={mainGamesOnly}
        onMainGamesOnlyChange={setMainGamesOnly}
        collectionDragEnabled={resourceType === "collections" && !mainGamesOnly && !titleFilterActive}
        onAfterDeleteSelfNavigate={goBackOrHome}
        onFocalGameSelectionChange={
          activeSkinWeb.autoShowBackgroundOnSelection && fixedFocalContextRail
            ? handleFocalGameSelectionChange
            : undefined
        }
        setTopBarBeforeMainGamesActions={outletContext?.setTopBarBeforeMainGamesActions}
        setTopBarRightActions={outletContext?.setTopBarRightActions}
      />
    </BackgroundManager>
  );
}

type LibraryItemDetailContentProps = {
  item: CollectionInfo | null;
  itemCover?: string;
  coverWidth: number;
  coverHeight: number;
  yearRange: string | null;
  averageRating: number | null;
  onPlay?: (game: GameItem) => void;
  sortedGames: GameItem[];
  onGameClick: (game: GameItem) => void;
  onCatalogGameClick?: (gameId: number) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean, customTimestamp?: number) => string;
  coverSize: number;
  handleCoverSizeChange: (size: number) => void;
  viewMode: "grid" | "detail" | "table";
  itemRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  handleDragEnd: (sourceIndex: number, destinationIndex: number) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  isReady: boolean;
  isEditModalOpen: boolean;
  onEditModalOpen: () => void;
  onEditModalClose: () => void;
  onItemUpdate: (updated: CollectionInfo) => void;
  t: TFunction;
  allCollections?: CollectionItem[];
  allCollectionLikes?: CollectionItem[];
  resourceType: CollectionLikeResourceType;
  collectionId?: string;
  onRemoveFromCollection?: (gameId: string) => void;
  developerId?: string;
  publisherId?: string;
  onRemoveFromDeveloper?: (gameId: string) => void;
  onRemoveFromPublisher?: (gameId: string) => void;
  showDeleteModal?: boolean;
  isDeleting?: boolean;
  deleteError?: string | null;
  onDeleteClick?: () => void;
  onConfirmDelete?: () => void;
  onCloseDeleteModal?: () => void;
  onCollectionClick?: (collectionId: string) => void;
  onPlayFirstInCollectionLike?: (resourceType: string, id: string) => void | Promise<void>;
  showNewGamesToggle?: boolean;
  showNewGames?: boolean;
  onShowNewGamesChange?: (value: boolean) => void;
  showNewGamesLabel?: string;
  gridGames: GameItem[];
  mainGamesOnly: boolean;
  onMainGamesOnlyChange: (value: boolean) => void;
  /** Reorder is disabled while a title filter is active (indices would not match full list). */
  collectionDragEnabled: boolean;
  /** After deleting this collection/developer/publisher from the menu, leave the page (back or home). */
  onAfterDeleteSelfNavigate: () => void;
  onFocalGameSelectionChange?: (game: GameItem | null) => void;
  setTopBarBeforeMainGamesActions?: (value: ReactNode | null) => void;
  setTopBarRightActions?: (value: ReactNode | null) => void;
};

function LibraryItemDetailContent({
  item,
  itemCover,
  coverWidth,
  coverHeight,
  yearRange,
  averageRating,
  onPlay,
  sortedGames,
  onGameClick,
  onCatalogGameClick,
  onGameUpdate,
  onGameDelete,
  buildCoverUrl,
  coverSize,
  handleCoverSizeChange,
  viewMode,
  itemRefs,
  handleDragEnd,
  scrollContainerRef,
  isReady,
  isEditModalOpen,
  onEditModalOpen,
  onEditModalClose,
  onItemUpdate,
  t,
  allCollections = [],
  allCollectionLikes = [],
  resourceType,
  collectionId,
  onRemoveFromCollection,
  developerId,
  publisherId,
  onRemoveFromDeveloper,
  onRemoveFromPublisher,
  showDeleteModal = false,
  isDeleting = false,
  deleteError = null,
  onDeleteClick,
  onConfirmDelete,
  onCloseDeleteModal,
  onCollectionClick,
  onPlayFirstInCollectionLike,
  showNewGamesToggle = false,
  showNewGames = false,
  onShowNewGamesChange,
  showNewGamesLabel,
  gridGames,
  mainGamesOnly,
  onMainGamesOnlyChange,
  collectionDragEnabled,
  onAfterDeleteSelfNavigate,
  onFocalGameSelectionChange,
  setTopBarBeforeMainGamesActions,
  setTopBarRightActions,
}: LibraryItemDetailContentProps) {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { hasBackground, isBackgroundVisible, setBackgroundVisible } = useBackground();
  const { isLoading } = useLoading();
  const { activeSkinWeb } = useSkin();
  /*
   * In compact mode (skin opt-in) the collection-like detail hides the hero
   * (cover, title, rating, summary, actions), section headings, the sub-collections grid, and
   * the parent collection-like strip: only top-bar controls and the direct games list remain.
   * Edit/delete/play still live on the persistent libraries bar and sidebar entries.
   */
  const compactDetail = activeSkinWeb.compactCollectionLikeDetail;
  /** Context rail: hide the icon strip; left column = library tab + cover, right column = scrollable games. */
  const contextRailLayout = compactDetail && activeSkinWeb.verticalCoverAlignment;
  const contextRailViewTransitions = contextRailViewTransitionsEnabled(activeSkinWeb);
  const contextRailNavState = readContextRailNavState(routerLocation.state);
  const indexPeekSnapshot = contextRailNavState?.contextRailIndexPeek;
  const contextRailMotionEnter = contextRailNavState?.contextRailMotion === true;

  useEffect(() => {
    if (!contextRailLayout) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const pinOuterScroll = () => {
      if (el.scrollTop !== 0) el.scrollTop = 0;
    };
    pinOuterScroll();
    el.addEventListener("scroll", pinOuterScroll, { passive: true });
    return () => el.removeEventListener("scroll", pinOuterScroll);
  }, [contextRailLayout, scrollContainerRef, isReady, gridGames.length]);

  const contextRailLibraryKey =
    resourceType === "collections"
      ? "collections"
      : resourceType === "developers"
        ? "developers"
        : "publishers";
  const calculateSummaryMaxLines = (): number => {
    let fieldCount = 1;
    if (yearRange) fieldCount++;
    if (averageRating !== null) fieldCount++;
    if ((onPlay && sortedGames.length > 0) || item) fieldCount++;
    return Math.max(2, Math.min(6, 7 - fieldCount));
  };
  const summaryMaxLines = calculateSummaryMaxLines();

  const isCollection = resourceType === "collections";
  const showDeleteInMenu = resourceType === "developers" || resourceType === "publishers";
  const showCompactTopActions = compactDetail && !!item && (isCollection || showDeleteInMenu);
  const showTopBarBackgroundAction =
    isCollection && hasBackground && (compactDetail || activeSkinWeb.persistentLibraryShell);
  const compactBackgroundAction = useMemo(
    () =>
      showTopBarBackgroundAction ? (
        <Tooltip text={isBackgroundVisible ? t("common.hideBackground") : t("common.showBackground")} delay={200}>
          <div className="library-item-detail-compact-top-action">
            <BackgroundToggle isVisible={isBackgroundVisible} onChange={setBackgroundVisible} />
          </div>
        </Tooltip>
      ) : null,
    [showTopBarBackgroundAction, isBackgroundVisible, setBackgroundVisible, t]
  );
  const showTopBarNewGamesAction =
    activeSkinWeb.persistentLibraryShell && showNewGamesToggle && viewMode === "grid";
  const beforeMainGamesTopActions = useMemo(
    () => {
      const hasBg = Boolean(compactBackgroundAction);
      const hasNew = Boolean(showTopBarNewGamesAction && onShowNewGamesChange);
      if (!hasBg && !hasNew) return null;
      return (
        <>
          {compactBackgroundAction}
          {hasNew ? (
            <div className="library-item-detail-compact-top-action">
              <NewGamesToggle
                showNewGames={showNewGames}
                onChange={onShowNewGamesChange!}
              />
            </div>
          ) : null}
        </>
      );
    },
    [
      compactBackgroundAction,
      showTopBarNewGamesAction,
      onShowNewGamesChange,
      showNewGames,
    ]
  );
  const compactTopActions = useMemo(
    () =>
      showCompactTopActions ? (
        <>
          <Tooltip text={t("common.edit")} delay={200}>
            <button
              onClick={onEditModalOpen}
              className="library-item-detail-edit-button library-item-detail-compact-top-action"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </Tooltip>
          <DropdownMenu
            collectionId={isCollection ? item.id : undefined}
            collectionTitle={item.title}
            developerId={resourceType === "developers" ? item.id : undefined}
            publisherId={resourceType === "publishers" ? item.id : undefined}
            onCollectionDelete={(deletedId: string) => {
              if (item.id === deletedId) onAfterDeleteSelfNavigate();
            }}
            onCollectionUpdate={onItemUpdate}
            onAddToCollection={(parentId) =>
              addChildToParent(
                {
                  id: item.id,
                  title: item.title,
                  summary: item.summary,
                  cover: item.cover,
                  background: item.background,
                  showTitle: item.showTitle,
                  childs: item.childs || [],
                },
                parentId
              )
            }
            sourceCollectionLike={{
              id: item.id,
              title: item.title,
              summary: item.summary,
              cover: item.cover,
              background: item.background,
              showTitle: item.showTitle,
              childs: item.childs || [],
            }}
            allCollectionLikes={allCollectionLikes}
            collectionLikeResourceType={resourceType}
            onDelete={showDeleteInMenu ? onDeleteClick : undefined}
            horizontal={true}
            className="library-item-detail-dropdown-menu library-item-detail-compact-top-action"
            toolTipDelay={200}
          />
        </>
      ) : null,
    [
      showCompactTopActions,
      t,
      onEditModalOpen,
      isCollection,
      item,
      resourceType,
      onAfterDeleteSelfNavigate,
      onItemUpdate,
      addChildToParent,
      allCollectionLikes,
      showDeleteInMenu,
      onDeleteClick,
    ]
  );

  const contextRailDockActions = useMemo(() => {
    if (!contextRailLayout) return null;
    if (!beforeMainGamesTopActions && !compactTopActions) return null;
    return (
      <>
        {beforeMainGamesTopActions}
        {compactTopActions}
      </>
    );
  }, [contextRailLayout, beforeMainGamesTopActions, compactTopActions]);

  useEffect(() => {
    if (!setTopBarRightActions) return;
    setTopBarRightActions(compactTopActions);
    return () => setTopBarRightActions(null);
  }, [setTopBarRightActions, compactTopActions]);
  useEffect(() => {
    if (!setTopBarBeforeMainGamesActions) return;
    setTopBarBeforeMainGamesActions(beforeMainGamesTopActions);
    return () => setTopBarBeforeMainGamesActions(null);
  }, [setTopBarBeforeMainGamesActions, beforeMainGamesTopActions]);
  const [editingChild, setEditingChild] = useState<CollectionInfo | null>(null);
  const [isEditChildModalOpen, setIsEditChildModalOpen] = useState(false);
  const [linkSourceCollectionLike, setLinkSourceCollectionLike] = useState<CollectionItem | null>(null);
  const [hydratedCollectionLikes, setHydratedCollectionLikes] = useState<CollectionItem[]>([]);
  const [parentCollectionLikesWithGames, setParentCollectionLikesWithGames] = useState<
    CollectionLikeSlideSection[]
  >([]);
  const [subCollectionLikesWithGames, setSubCollectionLikesWithGames] = useState<
    CollectionLikeSlideSection[]
  >([]);

  const completeCollectionLikes = useMemo(() => {
    const byId = new Map<string, CollectionItem>();
    for (const item of allCollectionLikes) byId.set(String(item.id), item);
    for (const item of hydratedCollectionLikes) {
      const id = String(item.id);
      const existing = byId.get(id);
      byId.set(id, existing ? { ...existing, ...item } : item);
    }
    return Array.from(byId.values());
  }, [allCollectionLikes, hydratedCollectionLikes]);

  const subCollectionLikes = useMemo(() => {
    if (!item || !Array.isArray(item.childs) || item.childs.length === 0) return [];
    const childIds = new Set(item.childs.map((id) => String(id)));
    const children = completeCollectionLikes.filter((c) => childIds.has(String(c.id)));
    children.sort((a, b) => compareTitles(a.title || "", b.title || ""));
    return children;
  }, [item, completeCollectionLikes]);

  const parentCollectionLikes = useMemo(() => {
    if (!item) return [];
    const itemId = String(item.id);
    const parents = completeCollectionLikes.filter((candidate) => {
      if (String(candidate.id) === itemId) return false;
      const childs = Array.isArray(candidate.childs) ? candidate.childs.map((id) => String(id)) : [];
      return childs.includes(itemId);
    });
    parents.sort((a, b) => compareTitles(a.title || "", b.title || ""));
    return parents;
  }, [item, completeCollectionLikes]);

  const titleFilterQuery = useTitleFilterQuery();

  const subCollectionLikesFiltered = useMemo(
    () => subCollectionLikes.filter((c) => titleMatchesFilter(c.title, titleFilterQuery)),
    [subCollectionLikes, titleFilterQuery]
  );

  /** Horizontal slider only when the lone sub-item has games or nested rows to scroll. */
  const useSingleSubCollectionSlideLayout = useMemo(() => {
    if (subCollectionLikes.length !== 1 || subCollectionLikesFiltered.length !== 1) {
      return false;
    }
    if (subCollectionLikesWithGames.length === 0) {
      return false;
    }
    return subCollectionLikesWithGames.some(
      (block) => block.games.length > 0 || block.slideItems.length > 0,
    );
  }, [
    subCollectionLikes.length,
    subCollectionLikesFiltered.length,
    subCollectionLikesWithGames,
  ]);

  const activeCollectionLikeDetail = useMemo((): ActiveCollectionLikeDetail => {
    const routeId =
      resourceType === "collections"
        ? collectionId
        : resourceType === "developers"
          ? developerId
          : publisherId;
    return {
      resourceType,
      id: String(routeId ?? item?.id ?? ""),
    };
  }, [resourceType, collectionId, developerId, publisherId, item?.id]);

  const collectionLikeDetailPath = (id: string) =>
    `/${
      resourceType === "collections"
        ? "collections"
        : resourceType === "developers"
          ? "developers"
          : "publishers"
    }/${encodeURIComponent(id)}`;

  const parentCollectionLikesWithGamesForDisplay = useMemo(
    // Title filter must affect only the current collection-like scope (its children and games),
    // not parent collection-like blocks rendered for context.
    () => parentCollectionLikesWithGames,
    [parentCollectionLikesWithGames]
  );

  // Display count for each sub-collection card: games assigned directly + first-level sub-collections only (aligned with CollectionsList).
  const subCollectionDisplayCountById = useMemo(() => {
    const map: Record<string, number> = {};
    const byId = new Map(completeCollectionLikes.map((c) => [String(c.id), c]));
    for (const col of subCollectionLikes) {
      const directChilds = Array.isArray(col.childs)
        ? col.childs
            .map((id) => String(id))
            .filter((id) => id !== String(col.id) && byId.has(id))
        : [];
      map[String(col.id)] = (col.gameCount ?? 0) + directChilds.length;
    }
    return map;
  }, [subCollectionLikes, completeCollectionLikes]);

  useEffect(() => {
    let cancelled = false;
    const loadMissingCollectionLikes = async () => {
      if (!item) {
        setHydratedCollectionLikes([]);
        return;
      }

      const knownRoleIds = new Set(allCollectionLikes.map((entry) => String(entry.id)));
      const unavailableIds = getUnavailableCollectionLikeIds(resourceType);
      const hydratedById = new Map<string, CollectionItem>();

      // Company childs are role-agnostic; only fetch ids that belong to this role (GET /developers|publishers/:id).
      const directChildIds = Array.isArray(item.childs)
        ? item.childs
            .map((id) => String(id))
            .filter((id) => id && id !== String(item.id))
        : [];

      const idsToFetch = directChildIds.filter(
        (id) => !knownRoleIds.has(id) && !unavailableIds.has(id),
      );

      for (const id of idsToFetch) {
        if (cancelled) break;
        try {
          const url = buildApiUrl(API_BASE, `/${resourceType}/${encodeURIComponent(id)}`);
          const res = await fetch(url, {
            headers: buildApiHeaders({ Accept: "application/json" }),
          });
          if (!res.ok) {
            unavailableIds.add(id);
            continue;
          }
          const data = await res.json();
          hydratedById.set(String(data.id), {
            id: String(data.id),
            title: data.title,
            summary: data.summary,
            cover: data.cover,
            background: data.background,
            gameCount: data.gameCount,
            showTitle: data.showTitle !== false,
            childs: Array.isArray(data.childs) ? data.childs : [],
          });
        } catch {
          // Ignore network errors for optional hydration
        }
      }

      if (!cancelled) {
        setHydratedCollectionLikes(Array.from(hydratedById.values()));
      }
    };

    loadMissingCollectionLikes();
    return () => {
      cancelled = true;
    };
  }, [item, resourceType, allCollectionLikes]);

  useEffect(() => {
    let cancelled = false;
    const loadParentCollectionLikeGames = async () => {
      if (parentCollectionLikes.length === 0) {
        setParentCollectionLikesWithGames([]);
        return;
      }
      const token = getApiToken() || "";
      const loaded = await loadCollectionLikeSlideSections(
        parentCollectionLikes,
        resourceType,
        completeCollectionLikes,
        token,
      );
      if (!cancelled) {
        setParentCollectionLikesWithGames(loaded);
      }
    };
    loadParentCollectionLikeGames();
    return () => {
      cancelled = true;
    };
  }, [parentCollectionLikes, resourceType, completeCollectionLikes]);

  useEffect(() => {
    let cancelled = false;
    const loadSubCollectionLikeGames = async () => {
      if (subCollectionLikes.length !== 1) {
        setSubCollectionLikesWithGames([]);
        return;
      }
      const token = getApiToken() || "";
      const loaded = await loadCollectionLikeSlideSections(
        [subCollectionLikes[0]],
        resourceType,
        completeCollectionLikes,
        token,
      );
      if (!cancelled) {
        setSubCollectionLikesWithGames(loaded);
      }
    };
    loadSubCollectionLikeGames();
    return () => {
      cancelled = true;
    };
  }, [subCollectionLikes, resourceType, completeCollectionLikes]);

  const dispatchCollectionLikeUpdated = (updatedItem: CollectionInfo) => {
    if (resourceType === "collections") {
      window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collection: updatedItem } }));
    } else if (resourceType === "developers" || resourceType === "publishers") {
      dispatchDeveloperOrPublisherUpdated(resourceType, updatedItem);
    }
  };

  const openChildEditModal = (col: CollectionItem) => {
    const childInfo: CollectionInfo = {
      id: String(col.id),
      title: col.title,
      summary: col.summary || "",
      cover: col.cover,
      background: (col as any).background,
      showTitle: (col as any).showTitle,
    };
    setEditingChild(childInfo);
    setIsEditChildModalOpen(true);
  };

  const removeChildFromParent = async (childId: string) => {
    if (!item?.id) return;
    const token = getApiToken();
    try {
      const url = buildApiUrl(
        API_BASE,
        `/${resourceType}/${encodeURIComponent(String(item.id))}/childs/${encodeURIComponent(String(childId))}`
      );
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "X-Auth-Token": token },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const prevChilds = Array.isArray(item.childs) ? item.childs : [];
      onItemUpdate({
        ...item,
        childs: prevChilds.filter((id: string | number) => String(id) !== String(childId)),
      });

      if (resourceType === "collections") {
        window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collectionId: String(item.id) } }));
      } else if (resourceType === "developers") {
        window.dispatchEvent(new CustomEvent("developerUpdated", { detail: {} }));
      } else {
        window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: {} }));
      }
    } catch (err) {
      console.error("Error removing child from parent:", err);
    }
  };

  const removeChildFromSliderParent = async (parentId: string, childId: string) => {
    const token = getApiToken();
    try {
      const url = buildApiUrl(
        API_BASE,
        `/${resourceType}/${encodeURIComponent(parentId)}/childs/${encodeURIComponent(childId)}`
      );
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "X-Auth-Token": token },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      if (resourceType === "collections") {
        window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collectionId: String(parentId) } }));
      } else if (resourceType === "developers") {
        window.dispatchEvent(new CustomEvent("developerUpdated", { detail: {} }));
      } else {
        window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: {} }));
      }
    } catch (err) {
      console.error("Error removing child from slider parent:", err);
    }
  };

  const handleCollectionLikePseudoEdit = (g: GameItem) => {
    const p = parseCollectionLikePseudoGameId(g.id);
    if (!p) return;
    const existing = completeCollectionLikes.find((c) => String(c.id) === p.childId);
    if (existing) {
      openChildEditModal(existing);
    } else {
      openChildEditModal({
        id: p.childId,
        title: g.title,
        summary: typeof g.summary === "string" ? g.summary : "",
        cover: g.cover,
        childs: [],
        showTitle: (g as { showTitle?: boolean }).showTitle !== false,
      });
    }
  };

  async function addChildToParent(source: CollectionItem, parentId?: string) {
    if (!parentId) {
      setLinkSourceCollectionLike(source);
      return;
    }
    const token = getApiToken();
    try {
      const url = buildApiUrl(
        API_BASE,
        `/${resourceType}/${encodeURIComponent(String(parentId))}/childs/${encodeURIComponent(String(source.id))}`
      );
      const res = await fetch(url, {
        method: "POST",
        headers: { "X-Auth-Token": token },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const recentKey = `recentCollectionLikeParents_${resourceType}`;
      const current = JSON.parse(localStorage.getItem(recentKey) || "[]") as string[];
      const next = [String(parentId), ...current.filter((id) => String(id) !== String(parentId))].slice(0, 5);
      localStorage.setItem(recentKey, JSON.stringify(next));

      if (resourceType === "collections") {
        window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collectionId: String(parentId) } }));
      } else {
        dispatchCollectionLikeChildLinked(resourceType, parentId, source.id);
        if (resourceType === "developers") {
          window.dispatchEvent(new CustomEvent("developerUpdated", { detail: {} }));
        } else {
          window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: {} }));
        }
      }
    } catch (err) {
      console.error("Error adding child to parent:", err);
    }
  }

  const renderCollectionLikeSlideSectionBlock = useCallback(
    ({ parent, slideItems }: CollectionLikeSlideSection, sectionIdPrefix: string) => {
      const parentMatchesActiveDetail = matchesActiveCollectionLikeDetail(
        resourceType,
        String(parent.id),
        activeCollectionLikeDetail,
      );

      return (
        <div key={String(parent.id)} className="game-detail-collection-group">
          <ScrollableGamesSection
            sectionId={`${sectionIdPrefix}-${resourceType}-${String(parent.id)}`}
            titleOverride={parent.title}
            titleHref={
              onCollectionClick && !parentMatchesActiveDetail
                ? collectionLikeDetailPath(String(parent.id))
                : undefined
            }
            disableVerticalCoverAlignment
            games={slideItems}
            onGameClick={(selected) => {
              const rawId = String(selected.id ?? "");
              if (rawId.startsWith("collectionlike:")) {
                const parts = rawId.split(":");
                const linkedId = parts[2];
                if (
                  linkedId &&
                  onCollectionClick &&
                  !matchesActiveCollectionLikeDetail(resourceType, linkedId, activeCollectionLikeDetail)
                ) {
                  onCollectionClick(linkedId);
                  return;
                }
                return;
              }
              onGameClick(selected);
            }}
            onPlay={onPlay}
            onGameUpdate={onGameUpdate}
            coverSize={140}
            allCollections={allCollections}
            allCollectionLikes={allCollectionLikes}
            collectionLikeResourceType={resourceType}
            sliderParentCollectionLikeId={String(parent.id)}
            onRemoveChildFromSliderParent={(childId) =>
              removeChildFromSliderParent(String(parent.id), childId)
            }
            onCollectionLikePseudoEdit={handleCollectionLikePseudoEdit}
            onPlayFirstInCollectionLike={onPlayFirstInCollectionLike}
            onCollectionLikePseudoAddToParent={addChildToParent}
            onCollectionLikePseudoUpdated={dispatchCollectionLikeUpdated}
            activeCollectionLikeDetail={activeCollectionLikeDetail}
          />
        </div>
      );
    },
    [
      activeCollectionLikeDetail,
      allCollectionLikes,
      allCollections,
      collectionLikeDetailPath,
      dispatchCollectionLikeUpdated,
      onCollectionClick,
      onGameClick,
      onGameUpdate,
      onPlay,
      onPlayFirstInCollectionLike,
      addChildToParent,
      removeChildFromSliderParent,
      resourceType,
    ],
  );

  return (
    <>
      <div
        className={`library-item-detail-libraries-bar-host${contextRailLayout ? " library-item-detail-libraries-bar-host--dock-only" : ""}${hasBackground && isBackgroundVisible ? " game-detail-libraries-bar-transparent" : ""}`}
      >
        <LibrariesBar
          libraries={[]}
          activeLibrary={isCollection ? { key: "collection", type: "collection" } : null}
          onSelectLibrary={() => {}}
          loading={false}
          error={null}
          coverSize={coverSize}
          onCoverSizeChange={handleCoverSizeChange}
          viewMode={viewMode}
          onViewModeChange={() => {}}
          showNewGamesToggle={showNewGamesToggle}
          showNewGames={showNewGames}
          onShowNewGamesChange={onShowNewGamesChange ?? (() => {})}
          showNewGamesLabel={showNewGamesLabel}
          showMainGamesToggle={viewMode === "grid" && sortedGames.length > 0}
          mainGamesOnly={mainGamesOnly}
          onMainGamesOnlyChange={onMainGamesOnlyChange}
          rightActionsBeforeMainGames={
            contextRailLayout ? contextRailDockActions : beforeMainGamesTopActions
          }
          hideBackgroundToggle={showTopBarBackgroundAction}
          rightActions={contextRailLayout ? null : compactTopActions}
        />
      </div>
      <div
        className={`library-item-detail-page-shell${contextRailLayout ? " library-item-detail-page-shell--context-rail" : ""}${contextRailMotionEnter ? " mhg-context-rail-motion-enter" : ""}`}
      >
        <div className="home-page-main-container library-item-detail-main-inner">
          <main className="flex-1 home-page-content library-item-detail-main-min-h">
            <div className="home-page-layout library-item-detail-layout-min-h">
              <div
                className={`home-page-content-wrapper library-item-detail-content-wrapper${isReady ? " library-item-detail-content-wrapper--ready" : ""}`}
              >
                <div
                  ref={contextRailLayout ? undefined : scrollContainerRef}
                  className={`home-page-scroll-container library-item-detail-scroll${contextRailLayout ? " library-item-detail-scroll--context-rail" : ""}`}
                  tabIndex={-1}
                  style={
                    {
                      ["--lid-cover-size" as string]: `${coverSize}px`,
                      ["--lid-cover-h" as string]: `${coverHeight}px`,
                    } as React.CSSProperties
                  }
                >
                  {item && !compactDetail && (
                    <div className="pt-8 library-item-detail-hero">
                      <div className="library-item-detail-hero-cover">
                        <Cover
                          title={item.title}
                          cover={itemCover}
                          width={coverWidth}
                          height={coverHeight}
                          imageFit="fill"
                          onPlay={
                            onPlay && sortedGames.some((g) => g.executables?.length)
                              ? () => {
                                  const g = sortedGames.find((x) => x.executables?.length);
                                  if (g) onPlay(g);
                                }
                              : undefined
                          }
                          showTitle={false}
                          detail={false}
                          play={sortedGames.some((g) => g.executables && g.executables.length > 0)}
                          showBorder={true}
                        />
                      </div>
                      <div className="library-item-detail-meta">
                        <div className="library-item-detail-meta-header library-item-detail-meta-primary">
                          <div className="library-item-detail-title-column">
                            <div className="library-item-detail-title-main">
                              <div className="library-item-detail-title-heading">
                                <h1 className="library-item-detail-title text-white">
                                  {item.title}
                                </h1>
                                {(resourceType === "developers" || resourceType === "publishers") &&
                                  hasCompanyProfileFields(item) && (
                                    <CompanyStatusBadge status={pickCompanyProfileFields(item).status} />
                                  )}
                              </div>
                              {(resourceType === "developers" || resourceType === "publishers") &&
                                hasCompanyProfileFields(item) && (
                                  <CompanyProfileBlock
                                    info={pickCompanyProfileFields(item)}
                                    resourceType={resourceType}
                                  />
                                )}
                                {yearRange && (
                                  <div className="library-item-detail-year-range text-white">
                                    {yearRange}
                                  </div>
                                )}
                                {averageRating !== null && <StarRating rating={averageRating} />}
                              </div>
                              <div className="library-item-detail-actions">
                                {onPlay && sortedGames.some((g) => g.executables?.length) && (
                                  <button
                                    type="button"
                                    className="library-item-detail-play-btn"
                                    onClick={() => {
                                      const g = sortedGames.find((x) => x.executables?.length);
                                      if (g) onPlay(g);
                                    }}
                                  >
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                    {t("common.play")}
                                  </button>
                                )}
                                <Tooltip text={t("common.edit")} delay={200}>
                                  <button onClick={onEditModalOpen} className="library-item-detail-edit-button">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </button>
                                </Tooltip>
                                {item && (isCollection || showDeleteInMenu) && (
                                  <DropdownMenu
                                    collectionId={isCollection ? item.id : undefined}
                                    collectionTitle={item.title}
                                    developerId={resourceType === "developers" ? item.id : undefined}
                                    publisherId={resourceType === "publishers" ? item.id : undefined}
                                    onCollectionDelete={(deletedId: string) => {
                                      if (item.id === deletedId) onAfterDeleteSelfNavigate();
                                    }}
                                    onCollectionUpdate={onItemUpdate}
                                    onAddToCollection={(parentId) =>
                                      addChildToParent(
                                        {
                                          id: item.id,
                                          title: item.title,
                                          summary: item.summary,
                                          cover: item.cover,
                                          background: item.background,
                                          showTitle: item.showTitle,
                                          childs: item.childs || [],
                                        },
                                        parentId
                                      )
                                    }
                                    sourceCollectionLike={{
                                      id: item.id,
                                      title: item.title,
                                      summary: item.summary,
                                      cover: item.cover,
                                      background: item.background,
                                      showTitle: item.showTitle,
                                      childs: item.childs || [],
                                    }}
                                    allCollectionLikes={allCollectionLikes}
                                    collectionLikeResourceType={resourceType}
                                    onDelete={showDeleteInMenu ? onDeleteClick : undefined}
                                    horizontal={true}
                                    className="library-item-detail-dropdown-menu"
                                    toolTipDelay={200}
                                  />
                                )}
                              </div>
                            </div>
                          {item && (
                            <EditCollectionLikeModal
                              isOpen={isEditModalOpen}
                              onClose={onEditModalClose}
                              resourceType={resourceType}
                              item={item}
                              onItemUpdate={onItemUpdate}
                            />
                          )}
                          {showDeleteModal && item && (
                            <div
                              className="dropdown-menu-confirm-overlay"
                              onClick={() => onCloseDeleteModal?.()}
                            >
                              <div className="dropdown-menu-confirm-container" onClick={(e) => e.stopPropagation()}>
                                <div className="dropdown-menu-confirm-header">
                                  <h2>{t("common.deleteTitle", "Delete")}</h2>
                                  <button
                                    className="dropdown-menu-confirm-close"
                                    onClick={onCloseDeleteModal}
                                    aria-label="Close"
                                  >
                                    ×
                                  </button>
                                </div>
                                <div className="dropdown-menu-confirm-content">
                                  <p>{t("common.confirmDelete", { title: item.title })}</p>
                                  {deleteError && <div className="dropdown-menu-confirm-error">{deleteError}</div>}
                                </div>
                                <div className="dropdown-menu-confirm-footer">
                                  <button
                                    className="dropdown-menu-confirm-cancel"
                                    onClick={onCloseDeleteModal}
                                    disabled={isDeleting}
                                  >
                                    {t("common.cancel", "Cancel")}
                                  </button>
                                  <button
                                    className="dropdown-menu-confirm-delete"
                                    onClick={onConfirmDelete}
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? t("common.deleting", "Deleting...") : t("common.delete", "Delete")}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {item?.summary && (
                          <div className="library-item-detail-summary">
                            <Summary
                              summary={item.summary}
                              maxLines={summaryMaxLines}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {item && compactDetail && (
                    <EditCollectionLikeModal
                      isOpen={isEditModalOpen}
                      onClose={onEditModalClose}
                      resourceType={resourceType}
                      item={item}
                      onItemUpdate={onItemUpdate}
                    />
                  )}
                  {showDeleteModal && item && compactDetail && (
                    <div
                      className="dropdown-menu-confirm-overlay"
                      onClick={() => onCloseDeleteModal?.()}
                    >
                      <div className="dropdown-menu-confirm-container" onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown-menu-confirm-header">
                          <h2>{t("common.deleteTitle", "Delete")}</h2>
                          <button
                            className="dropdown-menu-confirm-close"
                            onClick={onCloseDeleteModal}
                            aria-label="Close"
                          >
                            ×
                          </button>
                        </div>
                        <div className="dropdown-menu-confirm-content">
                          <p>{t("common.confirmDelete", { title: item.title })}</p>
                          {deleteError && <div className="dropdown-menu-confirm-error">{deleteError}</div>}
                        </div>
                        <div className="dropdown-menu-confirm-footer">
                          <button
                            className="dropdown-menu-confirm-cancel"
                            onClick={onCloseDeleteModal}
                            disabled={isDeleting}
                          >
                            {t("common.cancel", "Cancel")}
                          </button>
                          <button
                            className="dropdown-menu-confirm-delete"
                            onClick={onConfirmDelete}
                            disabled={isDeleting}
                          >
                            {isDeleting ? t("common.deleting", "Deleting...") : t("common.delete", "Delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {(!isLoading || item) && (
                    <div
                      className={`library-item-detail-section-full${contextRailLayout ? " library-item-detail-context-layout" : ""}`}
                    >
                      {contextRailLayout && item && (
                        <aside className="library-item-detail-context-rail" aria-label={item.title}>
                          <button
                            type="button"
                            className="mhg-library-button mhg-library-active library-item-detail-context-rail-library"
                            data-mhg-library-key={contextRailLibraryKey}
                            style={
                              contextRailViewTransitions
                                ? { viewTransitionName: CONTEXT_RAIL_LIBRARY_VIEW_TRANSITION }
                                : undefined
                            }
                            onClick={() =>
                              navigateToLibraryRoot(navigate, contextRailLibraryKey, {
                                contextRailReturn: indexPeekSnapshot ?? undefined,
                              })
                            }
                          >
                            <span className="mhg-library-button-label">
                              {t(`libraries.${contextRailLibraryKey}`)}
                            </span>
                          </button>
                          <div
                            className="library-item-detail-context-rail-cover"
                            style={
                              {
                                ...(contextRailViewTransitions
                                  ? { viewTransitionName: CONTEXT_RAIL_COVER_VIEW_TRANSITION }
                                  : {}),
                              } as React.CSSProperties
                            }
                          >
                            <Cover
                              title={item.title}
                              cover={itemCover}
                              width={coverSize}
                              height={Math.round(coverSize * 1.5)}
                              imageFit="fill"
                              onPlay={
                                onPlay && sortedGames.some((g) => g.executables?.length)
                                  ? () => {
                                      const g = sortedGames.find((x) => x.executables?.length);
                                      if (g) onPlay(g);
                                    }
                                  : undefined
                              }
                              showTitle={false}
                              detail={false}
                              play={sortedGames.some(
                                (g) => g.executables && g.executables.length > 0,
                              )}
                              showBorder={true}
                            />
                          </div>
                        </aside>
                      )}
                      {contextRailLayout && item ? (
                        <div className="mhg-context-rail-bridge" aria-hidden="true" />
                      ) : null}
                      {contextRailLayout && indexPeekSnapshot ? (
                        <ContextRailIndexPeek snapshot={indexPeekSnapshot} />
                      ) : null}
                      <div
                        ref={contextRailLayout ? scrollContainerRef : undefined}
                        className={contextRailLayout ? "library-item-detail-context-games" : undefined}
                      >
                      {!compactDetail && subCollectionLikesFiltered.length > 0 && (
                        <div className="library-item-detail-subsection">
                          <h2 className="library-item-detail-heading-2 text-white">
                            {(() => {
                              const label =
                                resourceType === "collections"
                                  ? t("collections.subcollections", { count: subCollectionLikesFiltered.length })
                                  : resourceType === "developers"
                                    ? t("catalogInfo.subDevelopers", { count: subCollectionLikesFiltered.length })
                                    : t("catalogInfo.subPublishers", { count: subCollectionLikesFiltered.length });
                              return label.replace(/(\p{L})/u, (_, c) => c.toUpperCase());
                            })()}
                          </h2>
                          {useSingleSubCollectionSlideLayout ? (
                            <div className="game-detail-collections-list library-item-detail-collections-list-mt">
                              {subCollectionLikesWithGames.map((block) =>
                                renderCollectionLikeSlideSectionBlock(block, "sub"),
                              )}
                            </div>
                          ) : (
                            <div className="library-item-detail-collections-list library-item-detail-collections-list-mt">
                              <div className="collections-list-container library-item-detail-subcollections-grid">
                                {subCollectionLikesFiltered.map((col) => {
                                  const isActiveDetailChild = matchesActiveCollectionLikeDetail(
                                    resourceType,
                                    String(col.id),
                                    activeCollectionLikeDetail,
                                  );
                                  const handleClick = () => {
                                    if (isActiveDetailChild) return;
                                    if (onCollectionClick) {
                                      onCollectionClick(String(col.id));
                                    }
                                  };
                                  return (
                                    <div
                                      key={String(col.id)}
                                      className={`group collections-list-item library-item-detail-subcollection-cell${isActiveDetailChild ? " games-list-item--detail-current" : " cursor-pointer"}`}
                                    >
                                      <Cover
                                        title={col.title}
                                        cover={col.cover}
                                        width={coverSize}
                                        height={coverSize * 1.5}
                                        onClick={isActiveDetailChild ? undefined : handleClick}
                                        detailNavigationDisabled={isActiveDetailChild}
                                        subtitle={
                                          (subCollectionDisplayCountById[String(col.id)] ?? col.gameCount) != null
                                            ? t("common.elements", { count: subCollectionDisplayCountById[String(col.id)] ?? col.gameCount })
                                            : undefined
                                        }
                                        play={!isActiveDetailChild && !!onPlayFirstInCollectionLike}
                                        onPlay={
                                          isActiveDetailChild || !onPlayFirstInCollectionLike
                                            ? undefined
                                            : () => onPlayFirstInCollectionLike(resourceType, String(col.id))
                                        }
                                        onEdit={isActiveDetailChild ? undefined : () => openChildEditModal(col)}
                                        onAddToCollection={(parentId) => addChildToParent(col, parentId)}
                                        onRemoveFromParent={() => removeChildFromParent(String(col.id))}
                                        sourceCollectionLike={col}
                                        allCollectionLikes={allCollectionLikes}
                                        collectionLikeResourceType={resourceType}
                                        dropdownHorizontal={false}
                                        dropdownToolTipDelay={200}
                                        collectionId={resourceType === "collections" ? String(col.id) : undefined}
                                        developerId={resourceType === "developers" ? String(col.id) : undefined}
                                        publisherId={resourceType === "publishers" ? String(col.id) : undefined}
                                        collectionTitle={col.title}
                                        onCollectionUpdate={
                                          resourceType === "collections"
                                            ? (updated) => dispatchCollectionLikeUpdated(updated)
                                            : undefined
                                        }
                                        showTitle={(col as any).showTitle !== false}
                                        detail={true}
                                        showBorder={true}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {editingChild && (
                        <EditCollectionLikeModal
                          isOpen={isEditChildModalOpen}
                          onClose={() => setIsEditChildModalOpen(false)}
                          resourceType={resourceType}
                          item={editingChild}
                          onItemUpdate={(updated) => {
                            setEditingChild(updated);
                          }}
                        />
                      )}
                      {linkSourceCollectionLike && (
                        <AddCollectionLikeToCollectionLikeModal
                          isOpen={true}
                          onClose={() => setLinkSourceCollectionLike(null)}
                          sourceItem={linkSourceCollectionLike}
                          resourceType={resourceType}
                          allItems={allCollectionLikes}
                          onLinked={() => setLinkSourceCollectionLike(null)}
                        />
                      )}
                      {sortedGames.length > 0 && (
                        <>
                          {!compactDetail && (
                            <div className="library-item-detail-games-heading-block">
                              <h2 className="library-item-detail-heading-2 text-white">
                                {gridGames.length} {t("common.games")}
                              </h2>
                            </div>
                          )}
                          <div className="library-item-detail-games-list">
                            <GamesList
                              scrollContainerRef={scrollContainerRef}
                              enableVirtualization={contextRailLayout}
                              forceSingleColumnVirtualized={contextRailLayout}
                              fixedFocalSelection={contextRailLayout}
                              onFocalSelectionChange={onFocalGameSelectionChange}
                              games={gridGames}
                              onGameClick={(game) => {
                                const g = game as GameItem & { isCatalogOnly?: boolean };
                                if (g.isCatalogOnly && onCatalogGameClick) {
                                  onCatalogGameClick(Number(game.id));
                                } else {
                                  onGameClick(game);
                                }
                              }}
                              onPlay={onPlay}
                              onGameUpdate={onGameUpdate}
                              onGameDelete={onGameDelete}
                              buildCoverUrl={buildCoverUrl}
                              coverSize={coverSize}
                              itemRefs={itemRefs}
                              draggable={collectionDragEnabled && !contextRailLayout}
                              onDragEnd={
                                collectionDragEnabled && !contextRailLayout
                                  ? handleDragEnd
                                  : undefined
                              }
                              allCollections={isCollection ? allCollections : undefined}
                              collectionId={collectionId}
                              onRemoveFromCollection={onRemoveFromCollection}
                              developerId={developerId}
                              publisherId={publisherId}
                              onRemoveFromDeveloper={onRemoveFromDeveloper}
                              onRemoveFromPublisher={onRemoveFromPublisher}
                            />
                          </div>
                        </>
                      )}
                      {!compactDetail && parentCollectionLikesWithGamesForDisplay.length > 0 && (
                        <div className="game-detail-collections-section">
                          <h3 className="game-detail-section-title">
                            {resourceType === "collections"
                              ? t("libraries.collections", "Collections")
                              : t("catalogInfo.acquiredBy", "Acquired by")}
                          </h3>
                          <div className="game-detail-collections-list">
                            {parentCollectionLikesWithGamesForDisplay.map((block) =>
                              renderCollectionLikeSlideSectionBlock(block, "parent"),
                            )}
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
