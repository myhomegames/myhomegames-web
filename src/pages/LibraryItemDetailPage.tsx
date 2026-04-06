import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useGameEvents } from "../hooks/useGameEvents";
import { useLoading } from "../contexts/LoadingContext";
import { useSettings } from "../contexts/SettingsContext";
import { useCollections } from "../contexts/CollectionsContext";
import { useDevelopers } from "../contexts/DevelopersContext";
import { usePublishers } from "../contexts/PublishersContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import { useIgdbGamesForTag, type IgdbTagKey } from "../hooks/useIgdbGamesForTag";
import GamesList from "../components/games/GamesList";
import Cover from "../components/games/Cover";
import LibrariesBar from "../components/layout/LibrariesBar";
import StarRating from "../components/common/StarRating";
import Summary from "../components/common/Summary";
import EditCollectionLikeModal from "../components/collections/EditCollectionLikeModal";
import DropdownMenu from "../components/common/DropdownMenu";
import Tooltip from "../components/common/Tooltip";
import BackgroundManager, { useBackground } from "../components/common/BackgroundManager";
import { compareTitles, filterRootCollectionLikes } from "../utils/stringUtils";
import { isMainGameType } from "../utils/igdbGameType";
import { buildApiUrl, buildCoverUrl, buildBackgroundUrl } from "../utils/api";
import { API_BASE, getApiToken } from "../config";
import type { GameItem, CollectionInfo, CollectionItem } from "../types";
import type { CollectionLikeResourceType } from "../components/collections/EditCollectionLikeModal";
import "./LibraryItemDetail.css";

type LibraryItemDetailPageProps = {
  onGameClick: (game: GameItem) => void;
  onIgdbGameClick?: (igdbId: number) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  allCollections?: CollectionItem[];
};

function parseGamesFromJson(json: { games?: any[] }) {
  const items = (json.games || []) as any[];
  return items.map((v) => ({
    id: v.id,
    title: v.title,
    summary: v.summary,
    cover: v.cover,
    background: v.background,
    day: v.day,
    month: v.month,
    year: v.year,
    stars: v.stars,
    executables: v.executables || null,
    themes: v.themes || null,
    platforms: v.platforms || null,
    gameModes: v.gameModes || null,
    playerPerspectives: v.playerPerspectives || null,
    websites: v.websites || null,
    ageRatings: v.ageRatings || null,
    developers: v.developers || null,
    publishers: v.publishers || null,
    franchise: v.franchise || null,
    collection: v.collection || null,
    series: v.series ?? v.collection ?? null,
    screenshots: v.screenshots || null,
    videos: v.videos || null,
    gameEngines: v.gameEngines || null,
    keywords: v.keywords || null,
    alternativeNames: v.alternativeNames || null,
    similarGames: v.similarGames || null,
    type: v.type ?? null,
  }));
}

export default function LibraryItemDetailPage({
  onGameClick,
  onIgdbGameClick,
  onGamesLoaded,
  onPlay,
  allCollections = [],
}: LibraryItemDetailPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setLoading, isLoading } = useLoading();
  const { collections: allCollectionsFromContext } = useCollections();
  const { developers: allDevelopers, updateDeveloper } = useDevelopers();
  const { publishers: allPublishers, updatePublisher } = usePublishers();
  const { twitchLoginEnabled } = useSettings();
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
  const [listLoadTimestamp, setListLoadTimestamp] = useState(() => Date.now());
  const [scrollRestoreTrigger, setScrollRestoreTrigger] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const fetchingGamesRef = useRef<boolean>(false);
  const lastIdRef = useRef<string | undefined>(undefined);
  const scrollPositionToRestoreRef = useRef<number | null>(null);
  /** Snapshot taken when user clicks Edit; only we write it, so nothing can overwrite it before restore */
  const scrollSnapshotForModalRef = useRef<number | null>(null);

  const scrollStorageKey = `${location.pathname}:modalScroll`;

  const libraryGameIds = useMemo(
    () =>
      libraryGames
        .map((g) => (typeof g.id === "number" ? g.id : parseInt(String(g.id), 10)))
        .filter((n) => !Number.isNaN(n)),
    [libraryGames]
  );

  const igdbTagKey: IgdbTagKey | null =
    resourceType === "developers" ? "developers" : resourceType === "publishers" ? "publishers" : null;
  const { igdbGames: igdbTagGames, loading: _igdbTagLoading } = useIgdbGamesForTag(
    twitchLoginEnabled && igdbTagKey && id ? igdbTagKey : null,
    id ?? null,
    libraryGameIds,
    true,
    undefined
  );

  const canShowNewGamesToggle = (resourceType === "developers" || resourceType === "publishers") && !!twitchLoginEnabled;
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

  const [mainGamesOnly, setMainGamesOnly] = useState(false);
  useEffect(() => {
    if (!id) return;
    const key = `mainGamesOnly_${resourceType}_${id}`;
    const saved = localStorage.getItem(key);
    setMainGamesOnly(saved === "true");
  }, [id, resourceType]);
  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`mainGamesOnly_${resourceType}_${id}`, String(mainGamesOnly));
  }, [id, resourceType, mainGamesOnly]);

  useScrollRestoration(scrollContainerRef);

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
  };

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
        });
      } else {
        fetchCollectionInfo(collectionId);
      }
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
        });
      } else {
        fetchDeveloperInfo(developerId);
      }
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
        });
      } else {
        fetchPublisherInfo(publisherId);
      }
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
        });
      }
    }
  }, [allPublishers, publisherId, resourceType, item]);

  useGameEvents({ setGames, enabledEvents: ["gameUpdated", "gameDeleted"] });

  useLayoutEffect(() => {
    if (!isLoading && item) {
      requestAnimationFrame(() => requestAnimationFrame(() => setIsReady(true)));
    } else if (isLoading) setIsReady(false);
  }, [isLoading, item, games.length]);

  async function fetchCollectionInfo(cid: string) {
    try {
      const singleUrl = buildApiUrl(API_BASE, `/collections/${cid}`);
      const singleRes = await fetch(singleUrl, {
        headers: { Accept: "application/json", "X-Auth-Token": getApiToken() },
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
        headers: { Accept: "application/json", "X-Auth-Token": getApiToken() },
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
      setListLoadTimestamp(Date.now());
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
        headers: { Accept: "application/json", "X-Auth-Token": getApiToken() || "" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setItem({
        id: String(data.id),
        title: data.title,
        summary: data.summary,
        cover: data.cover,
        background: data.background,
        showTitle: data.showTitle !== false,
      });
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
        headers: { Accept: "application/json", "X-Auth-Token": getApiToken() || "" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const parsed = parseGamesFromJson(json);
      setGames(parsed);
      setListLoadTimestamp(Date.now());
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
        headers: { Accept: "application/json", "X-Auth-Token": getApiToken() || "" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setItem({
        id: String(data.id),
        title: data.title,
        summary: data.summary,
        cover: data.cover,
        background: data.background,
        showTitle: data.showTitle !== false,
      });
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
        headers: { Accept: "application/json", "X-Auth-Token": getApiToken() || "" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const parsed = parseGamesFromJson(json);
      setGames(parsed);
      setListLoadTimestamp(Date.now());
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
    if (!apiToken) return;
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
      navigate(-1);
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
    if (!apiToken) return;
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
    if (!apiToken) return;
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
    for (const ig of igdbTagGames) {
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
          isIgdbOnly: true,
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
  }, [canShowNewGamesToggle, id, igdbTagGames, games]);

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
    if (!mainGamesOnly) return sortedGames;
    return sortedGames.filter((g) => isMainGameType(g));
  }, [sortedGames, mainGamesOnly]);

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
        ? t("tags.noItemsFound", { type: t("igdbInfo.developers", "Developers") })
        : t("tags.noItemsFound", { type: t("igdbInfo.publishers", "Publishers") });

  if (!id) {
    return (
      <div className="bg-[#1a1a1a] text-white flex items-center justify-center" style={{ width: "100%", height: "100%" }}>
        <div className="text-center">
          <div className="text-gray-400">{notFoundMessage}</div>
        </div>
      </div>
    );
  }

  const itemCoverUrl = item?.cover ? buildCoverUrl(API_BASE, item.cover, true) : "";
  const coverWidth = 240;
  const coverHeight = 360;
  const backgroundUrl = buildBackgroundUrl(API_BASE, item?.background);
  const hasBackground = Boolean(backgroundUrl && backgroundUrl.trim() !== "");

  return (
    <BackgroundManager backgroundUrl={backgroundUrl} hasBackground={hasBackground} elementId={id}>
      <LibraryItemDetailContent
        item={item}
        itemCoverUrl={itemCoverUrl}
        coverWidth={coverWidth}
        coverHeight={coverHeight}
        yearRange={yearRange}
        averageRating={averageRating}
        onPlay={onPlay}
        sortedGames={sortedGames}
        onGameClick={onGameClick}
        onIgdbGameClick={onIgdbGameClick}
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
          setItem(updated);
          if (resourceType === "developers") updateDeveloper({ ...updated, gameCount: sortedGames.length });
          if (resourceType === "publishers") updatePublisher({ ...updated, gameCount: sortedGames.length });
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
          navigate(`/${base}/${cid}`);
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
              headers: { Accept: "application/json", "X-Auth-Token": getApiToken() || "" },
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
        listLoadTimestamp={listLoadTimestamp}
        gridGames={gridGames}
        mainGamesOnly={mainGamesOnly}
        onMainGamesOnlyChange={setMainGamesOnly}
      />
    </BackgroundManager>
  );
}

type LibraryItemDetailContentProps = {
  item: CollectionInfo | null;
  itemCoverUrl: string;
  coverWidth: number;
  coverHeight: number;
  yearRange: string | null;
  averageRating: number | null;
  onPlay?: (game: GameItem) => void;
  sortedGames: GameItem[];
  onGameClick: (game: GameItem) => void;
  onIgdbGameClick?: (igdbId: number) => void;
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
  listLoadTimestamp?: number;
  gridGames: GameItem[];
  mainGamesOnly: boolean;
  onMainGamesOnlyChange: (value: boolean) => void;
};

function LibraryItemDetailContent({
  item,
  itemCoverUrl,
  coverWidth,
  coverHeight,
  yearRange,
  averageRating,
  onPlay,
  sortedGames,
  onGameClick,
  onIgdbGameClick,
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
  listLoadTimestamp,
  gridGames,
  mainGamesOnly,
  onMainGamesOnlyChange,
}: LibraryItemDetailContentProps) {
  const { hasBackground, isBackgroundVisible } = useBackground();
  const { isLoading } = useLoading();

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

  const SUBTITLE_SEPARATORS = [":", "-", ";", "_", "/", "\\", "@", "#"];

  const isSubCollectionTitle = (parentTitle: string, childTitle: string): boolean => {
    const parent = parentTitle.trim();
    const child = childTitle.trim();
    if (!parent || !child || child.length <= parent.length) return false;
    if (!child.startsWith(parent)) return false;
    const rest = child.slice(parent.length);
    const restTrimmed = rest.replace(/^\s+/, "");
    if (!restTrimmed) return false;
    const first = restTrimmed[0];
    return SUBTITLE_SEPARATORS.includes(first);
  };

  const getSubCollectionLabel = (parentTitle: string, childTitle: string): string => {
    const parent = parentTitle.trim();
    const child = childTitle.trim();
    if (!parent || !child || child.length <= parent.length) return childTitle;
    if (!child.startsWith(parent)) return childTitle;
    const rest = child.slice(parent.length).replace(/^\s+/, "");
    if (!rest) return childTitle;
    const first = rest[0];
    if (!SUBTITLE_SEPARATORS.includes(first)) return childTitle;
    const label = rest.slice(1).trim();
    return label || childTitle;
  };

  const subCollectionLikes = useMemo(() => {
    const currentId = collectionId ?? developerId ?? publisherId;
    if (!item || !currentId) return [];
    const parentTitle = (item.title || "").trim();
    if (!parentTitle) return [];

    const children = allCollectionLikes.filter((c) => {
      const title = (c.title || "").trim();
      if (!title || String(c.id) === String(currentId)) return false;
      return isSubCollectionTitle(parentTitle, title);
    });

    // Show only direct children (root within this list), not grandchildren
    const rootChildren = filterRootCollectionLikes(children);

    rootChildren.sort((a, b) => {
      const aLabel = getSubCollectionLabel(parentTitle, a.title || "");
      const bLabel = getSubCollectionLabel(parentTitle, b.title || "");
      return compareTitles(aLabel || a.title || "", bLabel || b.title || "");
    });

    return rootChildren;
  }, [collectionId, developerId, publisherId, item, allCollectionLikes]);

  // Display count for each sub-collection card: games assigned directly + first-level sub-collections only (aligned with CollectionsList).
  const subCollectionDisplayCountById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const col of subCollectionLikes) {
      const parentTitle = (col.title || "").trim();
      const children = allCollectionLikes.filter((c) => {
        if (String(c.id) === String(col.id)) return false;
        const title = (c.title || "").trim();
        return isSubCollectionTitle(parentTitle, title);
      });
      const directOnly = filterRootCollectionLikes(children);
      map[String(col.id)] = (col.gameCount ?? 0) + directOnly.length;
    }
    return map;
  }, [subCollectionLikes, allCollectionLikes]);

  const [editingChild, setEditingChild] = useState<CollectionInfo | null>(null);
  const [isEditChildModalOpen, setIsEditChildModalOpen] = useState(false);

  const dispatchCollectionLikeUpdated = (updatedItem: CollectionInfo) => {
    if (resourceType === "collections") {
      window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collection: updatedItem } }));
    } else if (resourceType === "developers") {
      window.dispatchEvent(new CustomEvent("developerUpdated", { detail: { developer: updatedItem } }));
    } else if (resourceType === "publishers") {
      window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: { publisher: updatedItem } }));
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

  return (
    <>
      <div
        className={hasBackground && isBackgroundVisible ? "game-detail-libraries-bar-transparent" : ""}
        style={{ position: "relative", zIndex: 1000, pointerEvents: "auto" }}
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
          showMainGamesToggle={(viewMode === "grid" || viewMode === "detail") && sortedGames.length > 0}
          mainGamesOnly={mainGamesOnly}
          onMainGamesOnlyChange={onMainGamesOnlyChange}
        />
      </div>
      <div style={{ position: "relative", zIndex: 2, height: "100vh", display: "flex", flexDirection: "column" }}>
        <div
          className="home-page-main-container"
          style={{
            backgroundColor: "transparent",
            position: "relative",
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <main className="flex-1 home-page-content" style={{ minHeight: 0 }}>
            <div className="home-page-layout" style={{ minHeight: 0 }}>
              <div
                className="home-page-content-wrapper"
                style={{
                  opacity: isReady ? 1 : 0,
                  transition: "opacity 0.2s ease-in-out",
                  minHeight: 0,
                }}
              >
                <div
                  ref={scrollContainerRef}
                  className="home-page-scroll-container"
                  tabIndex={-1}
                  style={{ paddingLeft: "64px", paddingRight: "64px", paddingTop: "5px", paddingBottom: "16px" }}
                >
                  {item && (
                    <div
                      className="pt-8"
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        gap: "48px",
                        alignItems: "flex-start",
                        width: "100%",
                        boxSizing: "border-box",
                        marginBottom: "16px",
                      }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        <Cover
                          title={item.title}
                          coverUrl={itemCoverUrl}
                          width={coverWidth}
                          height={coverHeight}
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
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-start",
                          gap: "16px",
                          minHeight: `${coverHeight}px`,
                          minWidth: 0,
                          visibility: "visible",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", visibility: "visible" }}>
                          <h1
                            className="text-white"
                            style={{
                              fontFamily: "var(--font-heading-1-font-family)",
                              fontSize: "var(--font-heading-1-font-size)",
                              lineHeight: "var(--font-heading-1-line-height)",
                            }}
                          >
                            {item.title}
                          </h1>
                          {yearRange && (
                            <div
                              className="text-white"
                              style={{
                                opacity: 0.8,
                                fontFamily: "var(--font-body-2-font-family)",
                                fontSize: "var(--font-body-2-font-size)",
                                lineHeight: "var(--font-body-2-line-height)",
                              }}
                            >
                              {yearRange}
                            </div>
                          )}
                          {averageRating !== null && <StarRating rating={averageRating} />}
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
                            {onPlay && sortedGames.some((g) => g.executables?.length) && (
                              <button
                                onClick={() => {
                                  const g = sortedGames.find((x) => x.executables?.length);
                                  if (g) onPlay(g);
                                }}
                                style={{
                                  backgroundColor: "#E5A00D",
                                  color: "#000000",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "6px 12px 6px 8px",
                                  fontSize: "1.25rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5B041")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E5A00D")}
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
                                  if (item.id === deletedId) window.history.back();
                                }}
                                onCollectionUpdate={onItemUpdate}
                                onDelete={showDeleteInMenu ? onDeleteClick : undefined}
                                horizontal={true}
                                className="library-item-detail-dropdown-menu"
                                toolTipDelay={200}
                              />
                            )}
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
                          {item?.summary && <Summary summary={item.summary} maxLines={summaryMaxLines} />}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isLoading && (
                    <div style={{ width: "100%" }}>
                      <style>{`
                        .library-item-detail-games-list .games-list-container {
                          justify-content: flex-start !important;
                        }
                      `}</style>
                      {subCollectionLikes.length > 0 && (
                        <div style={{ marginBottom: "32px", marginTop: "0" }}>
                          <h2
                            className="text-white"
                            style={{
                              fontFamily: "var(--font-heading-2-font-family)",
                              fontSize: "var(--font-heading-2-font-size)",
                              fontWeight: 600,
                            }}
                          >
                            {(() => {
                              const label =
                                resourceType === "collections"
                                  ? t("collections.subcollections", { count: subCollectionLikes.length })
                                  : resourceType === "developers"
                                    ? t("igdbInfo.subDevelopers", { count: subCollectionLikes.length })
                                    : t("igdbInfo.subPublishers", { count: subCollectionLikes.length });
                              return label.replace(/(\p{L})/u, (_, c) => c.toUpperCase());
                            })()}
                          </h2>
                          <div
                            className="library-item-detail-collections-list"
                            style={{ marginTop: "24px" }}
                          >
                            <div
                              className="collections-list-container"
                              style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(auto-fill, ${coverSize}px)`,
                                gap: 40,
                                justifyContent: "flex-start",
                                maxWidth: "100%",
                              }}
                            >
                              {subCollectionLikes.map((col) => {
                                const displayTitle = getSubCollectionLabel(item?.title || "", col.title || "");
                                const colCoverUrl = col.cover
                                  ? buildCoverUrl(API_BASE, col.cover, true)
                                  : "";
                                const handleClick = () => {
                                  if (onCollectionClick) {
                                    onCollectionClick(String(col.id));
                                  }
                                };
                                return (
                                  <div
                                    key={String(col.id)}
                                    className="group cursor-pointer collections-list-item"
                                    style={{ width: `${coverSize}px`, minWidth: `${coverSize}px` }}
                                  >
                                    <Cover
                                      title={displayTitle || col.title}
                                      coverUrl={colCoverUrl}
                                      width={coverSize}
                                      height={coverSize * 1.5}
                                      onClick={handleClick}
                                      subtitle={
                                        (subCollectionDisplayCountById[String(col.id)] ?? col.gameCount) != null
                                          ? t("common.elements", { count: subCollectionDisplayCountById[String(col.id)] ?? col.gameCount })
                                          : undefined
                                      }
                                      onPlay={
                                        onPlayFirstInCollectionLike
                                          ? () => onPlayFirstInCollectionLike(resourceType, String(col.id))
                                          : undefined
                                      }
                                      onEdit={() => openChildEditModal(col)}
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
                                      play={!!onPlayFirstInCollectionLike}
                                      showBorder={true}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
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
                      {sortedGames.length > 0 && (
                        <>
                          <div style={{ paddingLeft: "0", marginBottom: "32px", marginTop: "0" }}>
                            <h2
                              className="text-white"
                              style={{
                                fontFamily: "var(--font-heading-2-font-family)",
                                fontSize: "var(--font-heading-2-font-size)",
                                fontWeight: 600,
                              }}
                            >
                              {gridGames.length} {t("common.games")}
                            </h2>
                          </div>
                          <style>{`
                            .library-item-detail-games-list .games-list-container {
                              justify-content: flex-start !important;
                            }
                          `}</style>
                          <div className="library-item-detail-games-list">
                            <GamesList
                              games={gridGames}
                              onGameClick={(game) => {
                                const g = game as GameItem & { isIgdbOnly?: boolean };
                                if (g.isIgdbOnly && onIgdbGameClick) {
                                  onIgdbGameClick(Number(game.id));
                                } else {
                                  onGameClick(game);
                                }
                              }}
                              onPlay={onPlay}
                              onGameUpdate={onGameUpdate}
                              onGameDelete={onGameDelete}
                              buildCoverUrl={buildCoverUrl}
                              coverCacheBustTimestamp={listLoadTimestamp}
                              coverSize={coverSize}
                              itemRefs={itemRefs}
                              draggable={isCollection && !mainGamesOnly}
                              onDragEnd={isCollection && !mainGamesOnly ? handleDragEnd : undefined}
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
