import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../../utils/api";
import { API_BASE, getApiToken } from "../../../config";
import { useLoading } from "../../../contexts/LoadingContext";
import type { GameItem } from "../../../types";

type UseAddGameToPublisherParams = {
  onSuccess?: (updatedGame?: GameItem) => void;
  onError?: (error: string) => void;
};

type UseAddGameToPublisherReturn = {
  isAdding: boolean;
  addGameToPublisher: (gameId: string, publisherId: string, publisherTitle: string) => Promise<void>;
};

export function useAddGameToPublisher({
  onSuccess,
  onError,
}: UseAddGameToPublisherParams = {}): UseAddGameToPublisherReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [isAdding, setIsAdding] = useState(false);

  const addGameToPublisher = async (gameId: string, publisherId: string, publisherTitle: string) => {
    const apiToken = getApiToken();
    if (!apiToken) {
      onError?.(t("common.unauthorized", "Unauthorized"));
      return;
    }

    setIsAdding(true);
    setLoading(true);

    try {
      // Fetch current game
      const gameUrl = buildApiUrl(API_BASE, `/games/${gameId}`);
      const gameResponse = await fetch(gameUrl, {
        headers: { Accept: "application/json", "X-Auth-Token": apiToken },
      });

      if (!gameResponse.ok) {
        throw new Error(`Failed to fetch game: ${gameResponse.status}`);
      }

      const gameData = await gameResponse.json();
      const game = gameData.game || gameData;
      const currentPublishers = game.publishers || [];
      const pubIds = new Set(currentPublishers.map((p: any) => Number(typeof p === "object" ? p?.id : p)));

      if (pubIds.has(Number(publisherId))) {
        onError?.(t("collections.gameAlreadyInCollection", "Game is already in this collection"));
        return;
      }

      const newPublishers = [
        ...currentPublishers.map((p: any) => (typeof p === "object" ? { id: p.id, name: p.name } : { id: p, name: String(p) })),
        { id: Number(publisherId), name: publisherTitle.trim() },
      ];

      const putUrl = buildApiUrl(API_BASE, `/games/${gameId}`);
      const response = await fetch(putUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": apiToken,
        },
        body: JSON.stringify({ publishers: newPublishers }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to add game to publisher: ${response.status}`);
      }

      const result = await response.json();
      const updatedGame = result.game;

      window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
      window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: { publisherId } }));

      onSuccess?.(updatedGame);
    } catch (error: any) {
      const errorMessage = String(error.message || error);
      console.error("Error adding game to publisher:", errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsAdding(false);
      setLoading(false);
    }
  };

  return {
    isAdding,
    addGameToPublisher,
  };
}
