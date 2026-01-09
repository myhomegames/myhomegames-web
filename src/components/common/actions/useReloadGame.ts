import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";
import type { GameItem } from "../../../types";
import type { CollectionInfo } from "../../../types";

type UseReloadGameParams = {
  gameId?: string;
  collectionId?: string;
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
  handleConfirmReload: () => Promise<void>;
  handleCancelReload: () => void;
};

export function useReloadGame({
  gameId,
  collectionId,
  onGameUpdate,
  onCollectionUpdate,
  onReload,
  onModalClose,
}: UseReloadGameParams): UseReloadGameReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [isReloading, setIsReloading] = useState(false);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const [showReloadConfirmModal, setShowReloadConfirmModal] = useState(false);

  const executeReload = async () => {
    const apiToken = getApiToken();
    if (!apiToken) return;

    setIsReloading(true);
    setReloadError(null);
    setLoading(true);

    try {
      let url: string;

      if (gameId) {
        url = buildApiUrl(API_BASE, `/games/${gameId}/reload`);
      } else if (collectionId) {
        url = buildApiUrl(API_BASE, `/collections/${collectionId}/reload`);
      } else {
        url = buildApiUrl(API_BASE, `/reload-games`);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Auth-Token": apiToken,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (gameId) {
          if (onGameUpdate && data.game) {
            const updatedGame: GameItem = {
              id: data.game.id,
              title: data.game.title,
              summary: data.game.summary || "",
              cover: data.game.cover,
              background: data.game.background,
              day: data.game.day || null,
              month: data.game.month || null,
              year: data.game.year || null,
              stars: data.game.stars || null,
              genre: data.game.genre || null,
              command: data.game.command || null,
              criticratings: data.game.criticratings || null,
              userratings: data.game.userratings || null,
              themes: data.game.themes || null,
              platforms: data.game.platforms || null,
              gameModes: data.game.gameModes || null,
              playerPerspectives: data.game.playerPerspectives || null,
              websites: data.game.websites || null,
              ageRatings: data.game.ageRatings || null,
              developers: data.game.developers || null,
              publishers: data.game.publishers || null,
              franchise: data.game.franchise || null,
              collection: data.game.collection || null,
              screenshots: data.game.screenshots || null,
              videos: data.game.videos || null,
              gameEngines: data.game.gameEngines || null,
              keywords: data.game.keywords || null,
              alternativeNames: data.game.alternativeNames || null,
              similarGames: data.game.similarGames || null,
            };
            onGameUpdate(updatedGame);
            setIsReloading(false);
            setLoading(false);
            return;
          } else {
            setIsReloading(false);
            setLoading(false);
            return;
          }
        } else if (collectionId) {
          if (onCollectionUpdate && data.collection) {
            const updatedCollection: CollectionInfo = {
              id: data.collection.id,
              title: data.collection.title,
              summary: data.collection.summary || "",
              cover: data.collection.cover,
              background: data.collection.background,
            };
            onCollectionUpdate(updatedCollection);
            setIsReloading(false);
            setLoading(false);
            return;
          } else {
            setIsReloading(false);
            setLoading(false);
            return;
          }
        } else {
          // For global reload, use onReload callback if provided, otherwise reload page
          if (onReload) {
            await onReload();
            setIsReloading(false);
            setLoading(false);
          } else {
            // Fallback: reload the page maintaining the current path
            // This ensures the base path (e.g., /app/) is preserved
            const currentPath = window.location.pathname;
            window.location.href = currentPath;
          }
        }
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
    // If there's a custom callback, use it after confirmation
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

