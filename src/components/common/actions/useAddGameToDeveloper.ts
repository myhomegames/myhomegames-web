import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../../utils/api";
import { API_BASE, getApiToken } from "../../../config";
import { useLoading } from "../../../contexts/LoadingContext";
import type { GameItem } from "../../../types";

type UseAddGameToDeveloperParams = {
  onSuccess?: (updatedGame?: GameItem) => void;
  onError?: (error: string) => void;
};

type UseAddGameToDeveloperReturn = {
  isAdding: boolean;
  addGameToDeveloper: (gameId: string, developerId: string, developerTitle: string) => Promise<void>;
};

export function useAddGameToDeveloper({
  onSuccess,
  onError,
}: UseAddGameToDeveloperParams = {}): UseAddGameToDeveloperReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [isAdding, setIsAdding] = useState(false);

  const addGameToDeveloper = async (gameId: string, developerId: string, developerTitle: string) => {
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
      const currentDevelopers = game.developers || [];
      const devIds = new Set(currentDevelopers.map((d: any) => Number(typeof d === "object" ? d?.id : d)));

      if (devIds.has(Number(developerId))) {
        onError?.(t("collections.gameAlreadyInCollection", "Game is already in this collection"));
        return;
      }

      const newDevelopers = [
        ...currentDevelopers.map((d: any) => (typeof d === "object" ? { id: d.id, name: d.name } : { id: d, name: String(d) })),
        { id: Number(developerId), name: developerTitle.trim() },
      ];

      const putUrl = buildApiUrl(API_BASE, `/games/${gameId}`);
      const response = await fetch(putUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": apiToken,
        },
        body: JSON.stringify({ developers: newDevelopers }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to add game to developer: ${response.status}`);
      }

      const result = await response.json();
      const updatedGame = result.game;

      window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
      window.dispatchEvent(new CustomEvent("developerUpdated", { detail: { developerId } }));

      onSuccess?.(updatedGame);
    } catch (error: any) {
      const errorMessage = String(error.message || error);
      console.error("Error adding game to developer:", errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsAdding(false);
      setLoading(false);
    }
  };

  return {
    isAdding,
    addGameToDeveloper,
  };
}
