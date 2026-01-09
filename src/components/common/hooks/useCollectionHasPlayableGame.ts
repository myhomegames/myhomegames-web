import { useState, useEffect } from "react";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl } from "../../../utils/api";

type UseCollectionHasPlayableGameReturn = {
  hasPlayableGame: boolean | null;
  isLoading: boolean;
};

/**
 * Hook to check if any game in a collection has a command field.
 * Returns null while loading, true if at least one game has command, false otherwise.
 */
export function useCollectionHasPlayableGame(
  collectionId: string | undefined,
  enabled: boolean = true
): UseCollectionHasPlayableGameReturn {
  const [hasPlayableGame, setHasPlayableGame] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !collectionId) {
      setHasPlayableGame(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const fetchGames = async () => {
      try {
        const url = buildApiUrl(API_BASE, `/collections/${collectionId}/games`);
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "X-Auth-Token": getApiToken(),
          },
        });
        if (res.ok) {
          const json = await res.json();
          const games = json.games || [];
          // Check if any game has a command
          const hasCommand = games.some((g: any) => !!g.command);
          setHasPlayableGame(hasCommand);
        } else {
          setHasPlayableGame(false);
        }
      } catch (err) {
        setHasPlayableGame(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGames();
  }, [collectionId, enabled]);

  return {
    hasPlayableGame,
    isLoading,
  };
}

