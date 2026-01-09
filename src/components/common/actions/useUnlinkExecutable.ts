import { useState } from "react";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";
import type { GameItem } from "../../../types";

type UseUnlinkExecutableParams = {
  gameId: string;
  onGameUpdate: (game: GameItem) => void;
};

type UseUnlinkExecutableReturn = {
  isUnlinking: boolean;
  handleUnlinkExecutable: () => Promise<void>;
};

export function useUnlinkExecutable({
  gameId,
  onGameUpdate,
}: UseUnlinkExecutableParams): UseUnlinkExecutableReturn {
  const { setLoading } = useLoading();
  const [isUnlinking, setIsUnlinking] = useState(false);

  const handleUnlinkExecutable = async () => {
    setIsUnlinking(true);
    setLoading(true);

    try {
      const url = buildApiUrl(API_BASE, `/games/${gameId}`);
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": getApiToken(),
        },
        body: JSON.stringify({ command: null }),
      });

      if (response.ok) {
        const result = await response.json();
        // Get the current game from allGames cache or use result.game as base
        // We need to preserve all fields except command
        const updatedGame: GameItem = {
          id: result.game.id,
          title: result.game.title,
          summary: result.game.summary || "",
          cover: result.game.cover,
          background: result.game.background,
          day: result.game.day ?? null,
          month: result.game.month ?? null,
          year: result.game.year ?? null,
          stars: result.game.stars ?? null,
          genre: result.game.genre ?? null,
          criticratings: result.game.criticratings ?? null,
          userratings: result.game.userratings ?? null,
          // command field is removed, not set to null
          themes: result.game.themes ?? null,
          platforms: result.game.platforms ?? null,
          gameModes: result.game.gameModes ?? null,
          playerPerspectives: result.game.playerPerspectives ?? null,
          websites: result.game.websites ?? null,
          ageRatings: result.game.ageRatings ?? null,
          developers: result.game.developers ?? null,
          publishers: result.game.publishers ?? null,
          franchise: result.game.franchise ?? null,
          collection: result.game.collection ?? null,
          screenshots: result.game.screenshots ?? null,
          videos: result.game.videos ?? null,
          gameEngines: result.game.gameEngines ?? null,
          keywords: result.game.keywords ?? null,
          alternativeNames: result.game.alternativeNames ?? null,
          similarGames: result.game.similarGames ?? null,
        };
        // Explicitly remove command if it exists
        if ('command' in updatedGame) {
          delete (updatedGame as any).command;
        }
        onGameUpdate(updatedGame);
      } else {
        console.error("Failed to unlink executable");
      }
    } catch (error) {
      console.error("Error unlinking executable:", error);
    } finally {
      setIsUnlinking(false);
      setLoading(false);
    }
  };

  return {
    isUnlinking,
    handleUnlinkExecutable,
  };
}

