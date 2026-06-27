import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../../config";
import { buildApiUrl, buildApiHeaders } from "../../../utils/api";
import { isCatalogSearchEnabled } from "../../../utils/catalogApi";
import {
  reloadCollectionMetadataItem,
  reloadDeveloperMetadataItem,
  reloadGameMetadataItem,
  reloadPublisherMetadataItem,
} from "../../../utils/metadataReload";
import {
  beginPersistedSingleJob,
  beginSingleMetadataReloadRun,
  buildSingleMetadataReloadProgress,
  endSingleMetadataReloadRun,
  type PersistedSingleMetadataJob,
} from "../../../utils/activitySession";
import { dispatchDeveloperOrPublisherUpdated } from "../../../utils/companyProfileSync";
import { collectionInfoFromApi } from "../../../utils/companyProfile";
import { useSettings } from "../../../contexts/SettingsContext";
import { useLoading } from "../../../contexts/LoadingContext";
import {
  isBulkMetadataReloadAbortedError,
  isBulkMetadataReloadInProgress,
} from "../../../utils/bulkMetadataReloadContext";
import type { GameItem, CollectionInfo } from "../../../types";

type UseReloadGameParams = {
  gameId?: string;
  collectionId?: string;
  developerId?: string;
  publisherId?: string;
  itemTitle?: string;
  onGameUpdate?: (game: GameItem) => void;
  onCollectionUpdate?: (collection: CollectionInfo) => void;
  onReload?: () => void;
  onModalClose?: () => void;
};

type UseReloadGameReturn = {
  isReloading: boolean;
  reloadError: string | null;
  showReloadConfirmModal: boolean;
  handleReloadClick: () => void;
  handleConfirmReload: () => void;
  handleCancelReload: () => void;
};

function mapReloadedCollection(raw: Record<string, unknown>): CollectionInfo {
  return collectionInfoFromApi(raw);
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
  itemTitle,
  onGameUpdate,
  onCollectionUpdate,
  onReload,
  onModalClose,
}: UseReloadGameParams): UseReloadGameReturn {
  const { t } = useTranslation();
  const { twitchApiEnabled } = useSettings();
  const { setActivityBusy, setActivityProgress } = useLoading();
  const [isReloading, setIsReloading] = useState(false);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const [showReloadConfirmModal, setShowReloadConfirmModal] = useState(false);

  const reloadPhase = (): PersistedSingleMetadataJob["target"] | null => {
    if (gameId) return "game";
    if (collectionId) return "collection";
    if (developerId) return "developer";
    if (publisherId) return "publisher";
    return null;
  };

  const executeReload = async () => {
    if (isBulkMetadataReloadInProgress()) {
      return;
    }

    setIsReloading(true);
    setReloadError(null);
    const catalogSearchEnabled = isCatalogSearchEnabled(twitchApiEnabled);
    const phase = reloadPhase();

    const itemId = String(gameId ?? collectionId ?? developerId ?? publisherId ?? "");

    if (phase) {
      beginPersistedSingleJob({
        kind: "single-metadata",
        target: phase,
        id: itemId,
        title: itemTitle,
        catalogSearchEnabled,
      });
    }

    setActivityBusy(true);
    if (phase) {
      setActivityProgress(buildSingleMetadataReloadProgress(phase, 0, itemTitle, itemId));
    }

    beginSingleMetadataReloadRun();

    try {
      let response: Response;

      if (phase) {
        setActivityProgress(buildSingleMetadataReloadProgress(phase, 25, itemTitle, itemId));
      }

      if (gameId) {
        response = await reloadGameMetadataItem(gameId, catalogSearchEnabled);
      } else if (collectionId) {
        response = await reloadCollectionMetadataItem(collectionId);
      } else if (developerId) {
        response = await reloadDeveloperMetadataItem(developerId, undefined, catalogSearchEnabled);
      } else if (publisherId) {
        response = await reloadPublisherMetadataItem(publisherId, undefined, catalogSearchEnabled);
      } else {
        response = await fetch(buildApiUrl(API_BASE, "/reload-games"), {
          method: "POST",
          headers: buildApiHeaders(),
        });
      }

      if (phase) {
        setActivityProgress(buildSingleMetadataReloadProgress(phase, 100, itemTitle, itemId));
      }

      if (response.ok) {
        const data = await response.json();

        if (gameId) {
          if (onGameUpdate && data.game) {
            onGameUpdate(mapReloadedGame(data.game));
          }
          setIsReloading(false);
          setActivityBusy(false);
          return;
        }

        if (collectionId) {
          if (onCollectionUpdate && data.collection) {
            onCollectionUpdate(mapReloadedCollection(data.collection));
          }
          setIsReloading(false);
          setActivityBusy(false);
          return;
        }

        if (developerId || publisherId) {
          const key = developerId ? "developer" : "publisher";
          const resourceType = developerId ? "developers" : "publishers";
          if (data[key]) {
            const updated = mapReloadedCollection(data[key] as Record<string, unknown>);
            if (onCollectionUpdate) {
              onCollectionUpdate(updated);
            }
            dispatchDeveloperOrPublisherUpdated(resourceType, updated);
          }
          setIsReloading(false);
          setActivityBusy(false);
          return;
        }

        if (onReload) {
          await onReload();
        } else {
          const currentPath = window.location.pathname;
          window.location.href = currentPath;
        }
        setIsReloading(false);
        setActivityBusy(false);
      } else {
        console.error("Failed to reload metadata");
        setReloadError(t("common.reloadError", "Failed to reload metadata"));
        setIsReloading(false);
        setActivityBusy(false);
      }
    } catch (error) {
      if (isBulkMetadataReloadAbortedError(error)) {
        setIsReloading(false);
        setActivityBusy(false);
        return;
      }
      console.error("Error reloading metadata:", error);
      setReloadError(t("common.reloadError", "Failed to reload metadata"));
      setIsReloading(false);
      setActivityBusy(false);
    } finally {
      endSingleMetadataReloadRun();
    }
  };

  const handleReloadClick = () => {
    if (isBulkMetadataReloadInProgress()) {
      return;
    }
    setShowReloadConfirmModal(true);
  };

  const handleConfirmReload = () => {
    setShowReloadConfirmModal(false);
    setReloadError(null);

    const isGlobalReload =
      Boolean(onReload) && !gameId && !collectionId && !developerId && !publisherId;

    if (isGlobalReload) {
      if (isBulkMetadataReloadInProgress()) {
        return;
      }
      void Promise.resolve(onReload!()).catch((error) => {
        console.error("Error reloading metadata:", error);
      });
      return;
    }

    void executeReload();
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
