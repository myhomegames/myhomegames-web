import { useMemo, useEffect, useState } from "react";
import { useCollections } from "../../../contexts/CollectionsContext";
import { useDevelopers } from "../../../contexts/DevelopersContext";
import { usePublishers } from "../../../contexts/PublishersContext";
import { useLibraryGames } from "../../../contexts/LibraryGamesContext";

export type CollectionLikeGamesPath = "collections" | "developers" | "publishers";

type UseCollectionHasPlayableGameReturn = {
  hasPlayableGame: boolean | null;
  isLoading: boolean;
};

/**
 * Whether any game linked to a collection-like item has launch scripts.
 * Uses LibraryGamesContext executables (disk-backed via library list) plus the
 * resource's game-id map so list covers stay aligned after script deletes.
 */
export function useCollectionHasPlayableGame(
  collectionId: string | undefined,
  enabled: boolean = true,
  gamesPath: CollectionLikeGamesPath = "collections"
): UseCollectionHasPlayableGameReturn {
  const { collectionGameIds, isLoading: collectionsLoading, getCollectionGameIds } = useCollections();
  const { developerGameIds, isLoading: developersLoading } = useDevelopers();
  const { publisherGameIds, isLoading: publishersLoading } = usePublishers();
  const { games: allGames, isLoading: gamesLoading } = useLibraryGames();
  const [isLoadingGameIds, setIsLoadingGameIds] = useState(false);

  useEffect(() => {
    if (!enabled || !collectionId || gamesPath !== "collections") {
      return;
    }
    if (collectionsLoading || gamesLoading) {
      return;
    }

    const cached = collectionGameIds.get(String(collectionId));
    if (cached) {
      return;
    }

    setIsLoadingGameIds(true);
    getCollectionGameIds(collectionId)
      .then(() => {
        setIsLoadingGameIds(false);
      })
      .catch(() => {
        setIsLoadingGameIds(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, enabled, gamesPath, collectionsLoading, gamesLoading]);

  const result = useMemo(() => {
    if (!enabled || !collectionId) {
      return { hasPlayableGame: null, isLoading: false };
    }

    const resourceLoading =
      gamesPath === "collections"
        ? collectionsLoading
        : gamesPath === "developers"
          ? developersLoading
          : publishersLoading;

    if (resourceLoading || gamesLoading || isLoadingGameIds) {
      return { hasPlayableGame: null, isLoading: true };
    }

    const gameIds =
      gamesPath === "collections"
        ? collectionGameIds.get(String(collectionId))
        : gamesPath === "developers"
          ? developerGameIds.get(String(collectionId))
          : publisherGameIds.get(String(collectionId));

    if (!gameIds || gameIds.length === 0) {
      return { hasPlayableGame: false, isLoading: false };
    }

    const hasExecutables = gameIds.some((gameId) => {
      const game = allGames.find((g) => String(g.id) === String(gameId));
      return game && game.executables && game.executables.length > 0;
    });

    return { hasPlayableGame: hasExecutables, isLoading: false };
  }, [
    collectionId,
    enabled,
    gamesPath,
    collectionGameIds,
    developerGameIds,
    publisherGameIds,
    allGames,
    collectionsLoading,
    developersLoading,
    publishersLoading,
    gamesLoading,
    isLoadingGameIds,
  ]);

  return result;
}
