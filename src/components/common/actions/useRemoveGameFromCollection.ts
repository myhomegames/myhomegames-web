import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";
import { useCollections } from "../../../contexts/CollectionsContext";

type UseRemoveGameFromCollectionParams = {
  onSuccess?: () => void;
  onError?: (error: string) => void;
};

type UseRemoveGameFromCollectionReturn = {
  isRemoving: boolean;
  removeGameFromCollection: (gameId: string, collectionId: string) => Promise<void>;
};

export function useRemoveGameFromCollection({
  onSuccess,
  onError,
}: UseRemoveGameFromCollectionParams = {}): UseRemoveGameFromCollectionReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const { removeGameFromCollectionCache } = useCollections();
  const [isRemoving, setIsRemoving] = useState(false);

  const removeGameFromCollection = async (gameId: string, collectionId: string) => {
    const apiToken = getApiToken();
    if (!apiToken) {
      onError?.(t("common.unauthorized", "Unauthorized"));
      return;
    }

    setIsRemoving(true);
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

      // Remove the game ID from the array
      const updatedGameIds = currentGameIds.filter((id: string) => id !== String(gameId));

      // Update collection games order (without the removed game)
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
        throw new Error(errorData.error || `Failed to remove game from collection: ${response.status}`);
      }

      // Update cache immediately so the filter works right away
      removeGameFromCollectionCache(collectionId, String(gameId));

      // Emit event to notify that collection was updated (gameCount changed)
      window.dispatchEvent(new CustomEvent("collectionUpdated", { 
        detail: { collectionId } 
      }));

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = String(error.message || error);
      console.error("Error removing game from collection:", errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsRemoving(false);
      setLoading(false);
    }
  };

  return {
    isRemoving,
    removeGameFromCollection,
  };
}

