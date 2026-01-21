import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../../utils/api";
import { API_BASE, getApiToken } from "../../../config";
import { useLoading } from "../../../contexts/LoadingContext";
import { useCollections } from "../../../contexts/CollectionsContext";

type UseAddGameToCollectionParams = {
  onSuccess?: () => void;
  onError?: (error: string) => void;
};

type UseAddGameToCollectionReturn = {
  isAdding: boolean;
  addGameToCollection: (gameId: string, collectionId: string) => Promise<void>;
};

export function useAddGameToCollection({
  onSuccess,
  onError,
}: UseAddGameToCollectionParams = {}): UseAddGameToCollectionReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const { addGameToCollectionCache } = useCollections();
  const [isAdding, setIsAdding] = useState(false);

  const addGameToCollection = async (gameId: string, collectionId: string) => {
    const apiToken = getApiToken();
    if (!apiToken) {
      onError?.(t("common.unauthorized", "Unauthorized"));
      return;
    }

    setIsAdding(true);
    setLoading(true);

    try {
      // First, get current games in the collection
      const gamesUrl = buildApiUrl(API_BASE, `/collections/${collectionId}/games`);
      const gamesResponse = await fetch(gamesUrl, {
        headers: {
          Accept: "application/json",
          "X-Auth-Token": apiToken,
        },
      });

      if (!gamesResponse.ok) {
        throw new Error(`Failed to fetch collection games: ${gamesResponse.status}`);
      }

      const gamesData = await gamesResponse.json();
      const currentGameIds = (gamesData.games || []).map((g: any) => String(g.id));

      // Check if game is already in collection
      if (currentGameIds.includes(String(gameId))) {
        onError?.(t("collections.gameAlreadyInCollection", "Game is already in this collection"));
        return;
      }

      // Add the new game ID to the array
      const updatedGameIds = [...currentGameIds, String(gameId)];

      // Update collection games order
      const orderUrl = buildApiUrl(API_BASE, `/collections/${collectionId}/games/order`);
      const response = await fetch(orderUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": apiToken,
        },
        body: JSON.stringify({ gameIds: updatedGameIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to add game to collection: ${response.status}`);
      }

      // Update cache immediately so the filter works right away
      addGameToCollectionCache(collectionId, String(gameId));

      // Emit event to notify that collection was updated (gameCount changed)
      window.dispatchEvent(new CustomEvent("collectionUpdated", { 
        detail: { collectionId } 
      }));

      // Save to recent collections
      const recentCollections = JSON.parse(
        localStorage.getItem("recentCollections") || "[]"
      ) as string[];
      if (!recentCollections.includes(collectionId)) {
        recentCollections.unshift(collectionId);
        // Keep only last 10
        const updatedRecent = recentCollections.slice(0, 10);
        localStorage.setItem("recentCollections", JSON.stringify(updatedRecent));
      }

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = String(error.message || error);
      console.error("Error adding game to collection:", errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsAdding(false);
      setLoading(false);
    }
  };

  return {
    isAdding,
    addGameToCollection,
  };
}

