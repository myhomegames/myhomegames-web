import { useMemo, useEffect, useState } from "react";
import { useCollections } from "../../../contexts/CollectionsContext";
import { useDevelopers } from "../../../contexts/DevelopersContext";
import { usePublishers } from "../../../contexts/PublishersContext";
import { useLibraryGames } from "../../../contexts/LibraryGamesContext";
import { API_BASE } from "../../../config";
import { buildApiUrl, buildApiHeaders } from "../../../utils/api";

export type CollectionLikeGamesPath = "collections" | "developers" | "publishers";

type UseCollectionHasPlayableGameReturn = {
  hasPlayableGame: boolean | null;
  isLoading: boolean;
};

function gameIdsMapForPath(
  gamesPath: CollectionLikeGamesPath,
  collectionGameIds: Map<string, string[]>,
  developerGameIds: Map<string, string[]>,
  publisherGameIds: Map<string, string[]>
): Map<string, string[]> {
  if (gamesPath === "developers") return developerGameIds;
  if (gamesPath === "publishers") return publisherGameIds;
  return collectionGameIds;
}

/**
 * Whether any game linked to a collection-like item has launch scripts.
 * Prefers context game-id maps + LibraryGamesContext; if the id is missing from
 * the map (e.g. hydrated sub-collection-likes), fetches `/:id/games` (disk-backed).
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
  const [fetchedPlayable, setFetchedPlayable] = useState<boolean | null>(null);

  const idsMap = gameIdsMapForPath(
    gamesPath,
    collectionGameIds,
    developerGameIds,
    publisherGameIds
  );
  const idKey = collectionId != null ? String(collectionId) : "";
  const hasCachedIds = Boolean(idKey && idsMap.has(idKey));

  // Collections: populate game-id map on demand (same as before).
  useEffect(() => {
    if (!enabled || !collectionId || gamesPath !== "collections") {
      return;
    }
    if (collectionsLoading || gamesLoading) {
      return;
    }
    if (collectionGameIds.has(String(collectionId))) {
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

  // Developers/publishers (and any path still missing from the map): fetch games list.
  useEffect(() => {
    if (!enabled || !collectionId) {
      setFetchedPlayable(null);
      return;
    }
    if (idsMap.has(String(collectionId))) {
      setFetchedPlayable(null);
      return;
    }
    // Collections still loading via getCollectionGameIds above.
    if (gamesPath === "collections") {
      return;
    }

    let cancelled = false;
    setIsLoadingGameIds(true);
    setFetchedPlayable(null);

    const url = buildApiUrl(
      API_BASE,
      `/${gamesPath}/${encodeURIComponent(String(collectionId))}/games`
    );
    fetch(url, {
      headers: buildApiHeaders({ Accept: "application/json" }),
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const games = Array.isArray(json?.games) ? json.games : [];
        const playable = games.some(
          (g: { executables?: unknown }) =>
            Array.isArray(g?.executables) && g.executables.length > 0
        );
        setFetchedPlayable(playable);
        setIsLoadingGameIds(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedPlayable(false);
        setIsLoadingGameIds(false);
      });

    return () => {
      cancelled = true;
    };
  }, [collectionId, enabled, gamesPath, idsMap, hasCachedIds]);

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

    if (idsMap.has(String(collectionId))) {
      const gameIds = idsMap.get(String(collectionId)) || [];
      if (gameIds.length === 0) {
        return { hasPlayableGame: false, isLoading: false };
      }
      const hasExecutables = gameIds.some((gameId) => {
        const game = allGames.find((g) => String(g.id) === String(gameId));
        return game && game.executables && game.executables.length > 0;
      });
      return { hasPlayableGame: hasExecutables, isLoading: false };
    }

    if (fetchedPlayable != null) {
      return { hasPlayableGame: fetchedPlayable, isLoading: false };
    }

    return { hasPlayableGame: null, isLoading: true };
  }, [
    collectionId,
    enabled,
    gamesPath,
    idsMap,
    allGames,
    collectionsLoading,
    developersLoading,
    publishersLoading,
    gamesLoading,
    isLoadingGameIds,
    fetchedPlayable,
  ]);

  return result;
}
