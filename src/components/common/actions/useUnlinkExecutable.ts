import { useState } from "react";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";
import { getExecutablesExcludingPlatform, getPlatformIdFromExecutableFilename } from "../../../utils/gameExecutables";
import type { GameItem } from "../../../types";

type UseUnlinkExecutableParams = {
  gameId: string;
  onGameUpdate: (game: GameItem) => void;
  /** When set with fullGame: only unlink executables for this platform (keep others). */
  fullGame?: GameItem;
  platformIdForPlay?: string;
};

type UseUnlinkExecutableReturn = {
  isUnlinking: boolean;
  handleUnlinkExecutable: () => Promise<void>;
};

export function useUnlinkExecutable({
  gameId,
  onGameUpdate,
  fullGame,
  platformIdForPlay,
}: UseUnlinkExecutableParams): UseUnlinkExecutableReturn {
  const { setLoading } = useLoading();
  const [isUnlinking, setIsUnlinking] = useState(false);

  const handleUnlinkExecutable = async () => {
    if (!gameId) return;
    setIsUnlinking(true);
    setLoading(true);

    try {
      const url = buildApiUrl(API_BASE, `/games/${gameId}`);
      let body: { executables: string[] | null; executablePlatformIds?: string[]; executablePreviousFileNames?: string[] };
      if (fullGame && platformIdForPlay) {
        const kept = getExecutablesExcludingPlatform(fullGame, platformIdForPlay);
        if (kept.executables.length === 0) {
          body = { executables: null };
        } else {
          body = {
            executables: kept.executables,
            executablePlatformIds: kept.executableFileNames.map(getPlatformIdFromExecutableFilename),
            executablePreviousFileNames: kept.executableFileNames,
          };
        }
      } else {
        body = { executables: null };
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": getApiToken(),
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        const g = result.game;

        let updatedGame: GameItem;

        if (fullGame && platformIdForPlay) {
          // Unlink only for this platform: keep fullGame metadata and use our own "kept" list for
          // executables/executableFileNames, because the API may return filenames with platform suffix stripped
          const kept = getExecutablesExcludingPlatform(fullGame, platformIdForPlay);
          updatedGame = JSON.parse(JSON.stringify(fullGame)) as GameItem;
          updatedGame.executables = kept.executables.length > 0 ? kept.executables : null;
          updatedGame.executableFileNames = kept.executableFileNames.length > 0 ? kept.executableFileNames : null;
        } else {
          // Full unlink: use API response as usual
          updatedGame = {
            id: g.id,
            title: g.title ?? "",
            summary: g.summary ?? "",
            cover: g.cover,
            background: g.background,
            day: g.day ?? null,
            month: g.month ?? null,
            year: g.year ?? null,
            stars: g.stars ?? null,
            genre: g.genre ?? null,
            criticratings: g.criticratings ?? null,
            userratings: g.userratings ?? null,
            themes: g.themes ?? null,
            platforms: g.platforms ?? null,
            gameModes: g.gameModes ?? null,
            playerPerspectives: g.playerPerspectives ?? null,
            websites: g.websites ?? null,
            ageRatings: g.ageRatings ?? null,
            developers: g.developers ?? null,
            publishers: g.publishers ?? null,
            franchise: g.franchise ?? null,
            collection: g.collection ?? null,
            screenshots: g.screenshots ?? null,
            videos: g.videos ?? null,
            gameEngines: g.gameEngines ?? null,
            keywords: g.keywords ?? null,
            alternativeNames: g.alternativeNames ?? null,
            similarGames: g.similarGames ?? null,
          };
          updatedGame.executables = g.executables ?? null;
          updatedGame.executableFileNames = g.executableFileNames ?? null;
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

