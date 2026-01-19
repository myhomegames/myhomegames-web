import { useMemo, useEffect, useState } from "react";
import { useCollections } from "../../../contexts/CollectionsContext";
import { useLibraryGames } from "../../../contexts/LibraryGamesContext";

type UseCollectionHasPlayableGameReturn = {
  hasPlayableGame: boolean | null;
  isLoading: boolean;
};

/**
 * Hook to check if any game in a collection has executables.
 * Uses data from CollectionsContext and LibraryGamesContext to avoid API calls.
 * Loads game IDs on-demand if not already in context.
 * Returns null while loading, true if at least one game has executables, false otherwise.
 */
export function useCollectionHasPlayableGame(
  collectionId: string | undefined,
  enabled: boolean = true
): UseCollectionHasPlayableGameReturn {
  const { collectionGameIds, isLoading: collectionsLoading, getCollectionGameIds } = useCollections();
  const { games: allGames, isLoading: gamesLoading } = useLibraryGames();
  const [isLoadingGameIds, setIsLoadingGameIds] = useState(false);

  // Load game IDs on-demand if not in context
  useEffect(() => {
    if (!enabled || !collectionId || collectionsLoading || gamesLoading) {
      return;
    }

    const cached = collectionGameIds.get(String(collectionId));
    if (cached) {
      // Already loaded, no need to fetch
      return;
    }

    // Load game IDs on-demand
    setIsLoadingGameIds(true);
    getCollectionGameIds(collectionId)
      .then(() => {
        setIsLoadingGameIds(false);
      })
      .catch(() => {
        setIsLoadingGameIds(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, enabled, collectionsLoading, gamesLoading]);

  const result = useMemo(() => {
    if (!enabled || !collectionId) {
      return { hasPlayableGame: null, isLoading: false };
    }

    // If contexts are still loading, return loading state
    if (collectionsLoading || gamesLoading || isLoadingGameIds) {
      return { hasPlayableGame: null, isLoading: true };
    }

    // Get game IDs for this collection from CollectionsContext
    const gameIds = collectionGameIds.get(String(collectionId));
    
    if (!gameIds || gameIds.length === 0) {
      // Collection has no games or game IDs not yet loaded
      return { hasPlayableGame: false, isLoading: false };
    }

    // Check if any of these games have executables using LibraryGamesContext
    const hasExecutables = gameIds.some((gameId) => {
      const game = allGames.find((g) => String(g.id) === String(gameId));
      return game && game.executables && game.executables.length > 0;
    });

    return { hasPlayableGame: hasExecutables, isLoading: false };
  }, [collectionId, enabled, collectionGameIds, allGames, collectionsLoading, gamesLoading, isLoadingGameIds]);

  return result;
}

