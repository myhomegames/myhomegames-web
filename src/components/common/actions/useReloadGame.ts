import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../../config";
import { buildApiUrl, buildApiHeaders } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";
import type { GameItem, CollectionInfo, TagItem } from "../../../types";

type UseReloadGameParams = {
  gameId?: string;
  collectionId?: string;
  developerId?: string;
  publisherId?: string;
  tagId?: string;
  tagReloadRouteBase?: string;
  tagResponseKey?: string;
  onGameUpdate?: (game: GameItem) => void;
  onCollectionUpdate?: (collection: CollectionInfo) => void;
  onTagUpdate?: (tag: TagItem) => void;
  onReload?: () => void;
  onModalClose?: () => void;
};

type UseReloadGameReturn = {
  isReloading: boolean;
  reloadError: string | null;
  showReloadConfirmModal: boolean;
  handleReloadClick: () => void;
  handleConfirmReload: () => Promise<void>;
  handleCancelReload: () => void;
};

function mapReloadedCollection(raw: Record<string, unknown>): CollectionInfo {
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    summary: typeof raw.summary === "string" ? raw.summary : "",
    cover: typeof raw.cover === "string" ? raw.cover : undefined,
    background: typeof raw.background === "string" ? raw.background : undefined,
    externalCoverUrl:
      raw.externalCoverUrl === null || typeof raw.externalCoverUrl === "string"
        ? (raw.externalCoverUrl as string | null)
        : undefined,
    externalBackgroundUrl:
      raw.externalBackgroundUrl === null || typeof raw.externalBackgroundUrl === "string"
        ? (raw.externalBackgroundUrl as string | null)
        : undefined,
    showTitle: raw.showTitle !== false,
    childs: Array.isArray(raw.childs) ? raw.childs : [],
    igdbCompanyInfo:
      raw.igdbCompanyInfo && typeof raw.igdbCompanyInfo === "object"
        ? (raw.igdbCompanyInfo as CollectionInfo["igdbCompanyInfo"])
        : undefined,
  };
}

function mapReloadedGame(data: Record<string, unknown>): GameItem {
  const optional = <T,>(value: T | null | undefined): T | undefined =>
    value === null || value === undefined ? undefined : value;

  return {
    id: data.id as GameItem["id"],
    title: String(data.title ?? ""),
    summary: typeof data.summary === "string" ? data.summary : "",
    cover: optional(typeof data.cover === "string" ? data.cover : undefined),
    background: optional(typeof data.background === "string" ? data.background : undefined),
    day: optional(data.day as GameItem["day"]),
    month: optional(data.month as GameItem["month"]),
    year: optional(data.year as GameItem["year"]),
    stars: optional(data.stars as GameItem["stars"]),
    genre: optional(data.genre as GameItem["genre"]),
    executables: optional(data.executables as GameItem["executables"]),
    criticratings: optional(data.criticratings as GameItem["criticratings"]),
    userratings: optional(data.userratings as GameItem["userratings"]),
    themes: optional(data.themes as GameItem["themes"]),
    platforms: optional(data.platforms as GameItem["platforms"]),
    gameModes: optional(data.gameModes as GameItem["gameModes"]),
    playerPerspectives: optional(data.playerPerspectives as GameItem["playerPerspectives"]),
    websites: optional(data.websites as GameItem["websites"]),
    ageRatings: optional(data.ageRatings as GameItem["ageRatings"]),
    developers: optional(data.developers as GameItem["developers"]),
    publishers: optional(data.publishers as GameItem["publishers"]),
    franchise: optional(data.franchise as GameItem["franchise"]),
    collection: optional(data.collection as GameItem["collection"]),
    screenshots: optional(data.screenshots as GameItem["screenshots"]),
    videos: optional(data.videos as GameItem["videos"]),
    gameEngines: optional(data.gameEngines as GameItem["gameEngines"]),
    keywords: optional(data.keywords as GameItem["keywords"]),
    alternativeNames: optional(data.alternativeNames as GameItem["alternativeNames"]),
    similarGames: optional(data.similarGames as GameItem["similarGames"]),
    type: optional(data.type as GameItem["type"]),
  };
}

export function useReloadGame({
  gameId,
  collectionId,
  developerId,
  publisherId,
  tagId,
  tagReloadRouteBase,
  tagResponseKey,
  onGameUpdate,
  onCollectionUpdate,
  onTagUpdate,
  onReload,
  onModalClose,
}: UseReloadGameParams): UseReloadGameReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [isReloading, setIsReloading] = useState(false);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const [showReloadConfirmModal, setShowReloadConfirmModal] = useState(false);

  const executeReload = async () => {
    setIsReloading(true);
    setReloadError(null);
    setLoading(true);

    try {
      let url: string;

      if (gameId) {
        url = buildApiUrl(API_BASE, `/games/${gameId}/reload`);
      } else if (collectionId) {
        url = buildApiUrl(API_BASE, `/collections/${collectionId}/reload`);
      } else if (developerId) {
        url = buildApiUrl(API_BASE, `/developers/${developerId}/reload`);
      } else if (publisherId) {
        url = buildApiUrl(API_BASE, `/publishers/${publisherId}/reload`);
      } else if (tagId && tagReloadRouteBase) {
        url = buildApiUrl(API_BASE, `${tagReloadRouteBase}/${tagId}/reload`);
      } else {
        url = buildApiUrl(API_BASE, `/reload-games`);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: buildApiHeaders(),
      });

      if (response.ok) {
        const data = await response.json();

        if (gameId) {
          if (onGameUpdate && data.game) {
            onGameUpdate(mapReloadedGame(data.game));
          }
          setIsReloading(false);
          setLoading(false);
          return;
        }

        if (collectionId) {
          if (onCollectionUpdate && data.collection) {
            onCollectionUpdate(mapReloadedCollection(data.collection));
          }
          setIsReloading(false);
          setLoading(false);
          return;
        }

        if (developerId || publisherId) {
          const key = developerId ? "developer" : "publisher";
          if (onCollectionUpdate && data[key]) {
            onCollectionUpdate(mapReloadedCollection(data[key]));
          }
          setIsReloading(false);
          setLoading(false);
          return;
        }

        if (tagId && tagResponseKey) {
          if (onTagUpdate && data[tagResponseKey]) {
            const raw = data[tagResponseKey];
            onTagUpdate({
              id: String(raw.id),
              title: String(raw.title ?? ""),
              cover: typeof raw.cover === "string" ? raw.cover : undefined,
              showTitle: raw.showTitle,
              hasCover: raw.hasCover,
            });
          }
          setIsReloading(false);
          setLoading(false);
          return;
        }

        if (onReload) {
          await onReload();
        } else {
          const currentPath = window.location.pathname;
          window.location.href = currentPath;
        }
        setIsReloading(false);
        setLoading(false);
      } else {
        console.error("Failed to reload metadata");
        setReloadError(t("common.reloadError", "Failed to reload metadata"));
        setIsReloading(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error reloading metadata:", error);
      setReloadError(t("common.reloadError", "Failed to reload metadata"));
      setIsReloading(false);
      setLoading(false);
    }
  };

  const handleReloadClick = () => {
    setShowReloadConfirmModal(true);
  };

  const handleConfirmReload = async () => {
    if (onReload) {
      onReload();
    } else {
      await executeReload();
    }
    setShowReloadConfirmModal(false);
  };

  const handleCancelReload = () => {
    setShowReloadConfirmModal(false);
    setReloadError(null);
    if (onModalClose) {
      onModalClose();
    }
  };

  return {
    isReloading,
    reloadError,
    showReloadConfirmModal,
    handleReloadClick,
    handleConfirmReload,
    handleCancelReload,
  };
}
