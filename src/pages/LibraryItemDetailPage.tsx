import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useGameEvents } from "../hooks/useGameEvents";
import { useLoading } from "../contexts/LoadingContext";
import { useCollections } from "../contexts/CollectionsContext";
import { useDevelopers } from "../contexts/DevelopersContext";
import { usePublishers } from "../contexts/PublishersContext";
import GamesList from "../components/games/GamesList";
import Cover from "../components/games/Cover";
import LibrariesBar from "../components/layout/LibrariesBar";
import StarRating from "../components/common/StarRating";
import Summary from "../components/common/Summary";
import EditCollectionLikeModal from "../components/collections/EditCollectionLikeModal";
import DropdownMenu from "../components/common/DropdownMenu";
import Tooltip from "../components/common/Tooltip";
import BackgroundManager, { useBackground } from "../components/common/BackgroundManager";
import { compareTitles } from "../utils/stringUtils";
import { buildApiUrl, buildCoverUrl, buildBackgroundUrl } from "../utils/api";
import { API_BASE, getApiToken } from "../config";
import type { GameItem, CollectionInfo, CollectionItem } from "../types";
import type { CollectionLikeResourceType } from "../components/collections/EditCollectionLikeModal";
import "./LibraryItemDetail.css";

type LibraryItemDetailPageProps = {
  onGameClick: (game: GameItem) => void;
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
  }));
}

export default function LibraryItemDetailPage({
  onGameClick,
  onGamesLoaded,
  onPlay,
  allCollections = [],
}: LibraryItemDetailPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setLoading, isLoading } = useLoading();
  const { collections: allCollectionsFromContext } = useCollections();
  const { developers: allDevelopers, updateDeveloper } = useDevelopers();
  const { publishers: allPublishers, updatePublisher } = usePublishers();
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const fetchingGamesRef = useRef<boolean>(false);
  const lastIdRef = useRef<string | undefined>(undefined);

  useScrollRestoration(scrollContainerRef);

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
      const items = (json.games || []).map((v: any) => ({
        id: String(v.id),
        title: v.title,
        summary: v.summary,
        cover: v.cover,
        day: v.day,
        month: v.month,
        year: v.year,
        stars: v.stars,
        developers: v.developers,
        publishers: v.publishers,
        executables: v.executables,
      }));
      setGames(items);
      onGamesLoaded(items);
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
      const items = (json.games || []).map((v: any) => ({
        id: String(v.id),
        title: v.title,
        summary: v.summary,
        cover: v.cover,
        day: v.day,
        month: v.month,
        year: v.year,
        stars: v.stars,
        developers: v.developers,
        publishers: v.publishers,
        executables: v.executables,
      }));
      setGames(items);
      onGamesLoaded(items);
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
    const base = resourceType === "developers" ? "developers" : "publishers";
    setIsDeleting(true);
    setDeleteError(null);
    setLoading(true);
    try {
      const url = buildApiUrl(API_BASE, `/${base}/${id}`);
      const res = await fetch(url, { method: "DELETE", headers: { "X-Auth-Token": apiToken } });
      if (!res.ok) throw new Error("Delete failed");
      const eventName = resourceType === "developers" ? "developerDeleted" : "publisherDeleted";
      const detailKey = resourceType === "developers" ? "developerId" : "publisherId";
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
      setGames((prev) => prev.filter((g) => String(g.id) !== String(gameId)));
    } catch (err) {
      console.error("Error removing game from publisher:", err);
    }
  };

  const sortedGames = useMemo(() => {
    if (resourceType === "collections" && customOrder && customOrder.length === games.length) {
      const gameMap = new Map(games.map((g) => [g.id, g]));
      return customOrder.map((id) => gameMap.get(id)).filter(Boolean) as GameItem[];
    }
    const sorted = [...games];
    sorted.sort((a, b) => {
      const yearA = a.year ?? 0;
      const yearB = b.year ?? 0;
      if (yearA !== 0 && yearB !== 0) return yearA - yearB;
      if (yearA !== 0 && yearB === 0) return -1;
      if (yearA === 0 && yearB !== 0) return 1;
      return compareTitles(a.title || "", b.title || "");
    });
    return sorted;
  }, [games, customOrder, resourceType]);

  const handleGameUpdate = (updatedGame: GameItem) => {
    setGames((prev) => prev.map((g) => (String(g.id) === String(updatedGame.id) ? updatedGame : g)));
    window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
    if (collectionId) fetchCollectionGames(collectionId);
  };

  const handleGameDelete = (deletedGame: GameItem) => {
    setGames((prev) => prev.filter((g) => String(g.id) !== String(deletedGame.id)));
  };

  const handleRemoveFromCollection = (gameId: string) => {
    setGames((prev) => prev.filter((g) => String(g.id) !== String(gameId)));
  };

  const handleDragEnd = async (sourceIndex: number, destinationIndex: number) => {
    if (sourceIndex === destinationIndex || resourceType !== "collections") return;
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
    const years = games.map((g) => g.year).filter((y): y is number => y != null);
    if (years.length === 0) return null;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? min.toString() : `${min} - ${max}`;
  }, [games]);

  const averageRating = useMemo(() => {
    const ratings = games.map((g) => g.stars).filter((s): s is number => s != null);
    if (ratings.length === 0) return null;
    const sum = ratings.reduce((a, b) => a + b, 0);
    return (sum / ratings.length / 10) * 5;
  }, [games]);

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
        onGameUpdate={handleGameUpdate}
        onGameDelete={handleGameDelete}
        buildCoverUrl={(apiBase, cover, addTimestamp) => buildCoverUrl(apiBase, cover, addTimestamp ?? false)}
        coverSize={coverSize}
        handleCoverSizeChange={handleCoverSizeChange}
        viewMode={viewMode}
        itemRefs={itemRefs}
        handleDragEnd={handleDragEnd}
        scrollContainerRef={scrollContainerRef}
        isReady={isReady}
        isEditModalOpen={isEditModalOpen}
        onEditModalOpen={() => setIsEditModalOpen(true)}
        onEditModalClose={() => setIsEditModalOpen(false)}
        onItemUpdate={(updated) => {
          setItem(updated);
          if (resourceType === "developers") updateDeveloper({ ...updated, gameCount: sortedGames.length });
          if (resourceType === "publishers") updatePublisher({ ...updated, gameCount: sortedGames.length });
        }}
        t={t}
        allCollections={allCollections}
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
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
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
                  style={{ paddingLeft: "64px", paddingRight: "64px", paddingTop: "5px", paddingBottom: "32px" }}
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
                        marginBottom: "32px",
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
                            {isCollection && item && (
                              <DropdownMenu
                                collectionId={item.id}
                                collectionTitle={item.title}
                                onCollectionDelete={(deletedId: string) => {
                                  if (item.id === deletedId) window.history.back();
                                }}
                                onCollectionUpdate={onItemUpdate}
                                horizontal={true}
                                className="library-item-detail-dropdown-menu"
                                toolTipDelay={200}
                              />
                            )}
                            {showDeleteInMenu && item && (
                              <DropdownMenu
                                onDelete={onDeleteClick}
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
                      <div style={{ paddingLeft: "0", marginBottom: "32px", marginTop: "8px" }}>
                        <h2
                          className="text-white"
                          style={{
                            fontFamily: "var(--font-heading-2-font-family)",
                            fontSize: "var(--font-heading-2-font-size)",
                            fontWeight: 600,
                          }}
                        >
                          {sortedGames.length} {t("common.games")}
                        </h2>
                      </div>
                      <style>{`
                        .library-item-detail-games-list .games-list-container {
                          justify-content: flex-start !important;
                        }
                      `}</style>
                      <div className="library-item-detail-games-list">
                        <GamesList
                          games={sortedGames}
                          onGameClick={onGameClick}
                          onPlay={onPlay}
                          onGameUpdate={onGameUpdate}
                          onGameDelete={onGameDelete}
                          buildCoverUrl={buildCoverUrl}
                          coverSize={coverSize}
                          itemRefs={itemRefs}
                          draggable={isCollection}
                          onDragEnd={isCollection ? handleDragEnd : undefined}
                          allCollections={isCollection ? allCollections : undefined}
                          collectionId={collectionId}
                          onRemoveFromCollection={onRemoveFromCollection}
                          developerId={developerId}
                          publisherId={publisherId}
                          onRemoveFromDeveloper={onRemoveFromDeveloper}
                          onRemoveFromPublisher={onRemoveFromPublisher}
                        />
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
