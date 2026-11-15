import { useMemo, useEffect, useState } from "react";
import { useCollections } from "../../../contexts/CollectionsContext";
import { useDevelopers } from "../../../contexts/DevelopersContext";
import { usePublishers } from "../../../contexts/PublishersContext";
import { useLibraryGames } from "../../../contexts/LibraryGamesContext";
import {
  collectionLikeHasPlayableInContext,
  fetchCollectionLikeHasPlayableGame,
  type CollectionLikePlayPath,
} from "../../../utils/collectionLikePlay";

export type CollectionLikeGamesPath = CollectionLikePlayPath;

type UseCollectionHasPlayableGameReturn = {
  hasPlayableGame: boolean | null;
  isLoading: boolean;
};

/**
 * Whether this collection-like (or a descendant) has a launchable game.
 * Priority for play is handled at click time: direct games first, then childs.
 */
export function useCollectionHasPlayableGame(
  collectionId: string | undefined,
  enabled: boolean = true,
  gamesPath: CollectionLikeGamesPath = "collections"
): UseCollectionHasPlayableGameReturn {
  const {
    collections,
    collectionGameIds,
    isLoading: collectionsLoading,
    getCollectionGameIds,
  } = useCollections();
  const { developers, developerGameIds, isLoading: developersLoading } = useDevelopers();
  const { publishers, publisherGameIds, isLoading: publishersLoading } = usePublishers();
  const { games: allGames, isLoading: gamesLoading } = useLibraryGames();
  const [isLoadingGameIds, setIsLoadingGameIds] = useState(false);
  const [fetchedPlayable, setFetchedPlayable] = useState<boolean | null>(null);

  const idsMap =
    gamesPath === "developers"
      ? developerGameIds
      : gamesPath === "publishers"
        ? publisherGameIds
        : collectionGameIds;

  const items =
    gamesPath === "developers"
      ? developers
      : gamesPath === "publishers"
        ? publishers
        : collections;

  const itemsById = useMemo(() => {
    const map = new Map<string, { childs?: Array<string | number> }>();
    for (const item of items) {
      map.set(String(item.id), item);
    }
    return map;
  }, [items]);

  const libraryGamesById = useMemo(() => {
    const map = new Map<string, { executables?: string[] | null }>();
    for (const game of allGames) {
      map.set(String(game.id), game);
    }
    return map;
  }, [allGames]);

  // Collections: populate game-id map on demand for the root id.
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

  const contextResult = useMemo(() => {
    if (!enabled || !collectionId) return null;
    return collectionLikeHasPlayableInContext(
      collectionId,
      idsMap,
      itemsById,
      libraryGamesById
    );
  }, [enabled, collectionId, idsMap, itemsById, libraryGamesById]);

  // When context cannot decide (missing map entries / hydrated childs), walk the API.
  useEffect(() => {
    if (!enabled || !collectionId) {
      setFetchedPlayable(null);
      return;
    }
    if (contextResult !== null) {
      setFetchedPlayable(null);
      return;
    }
    if (gamesPath === "collections" && !collectionGameIds.has(String(collectionId))) {
      // Still waiting for getCollectionGameIds
      return;
    }

    let cancelled = false;
    setIsLoadingGameIds(true);
    setFetchedPlayable(null);

    fetchCollectionLikeHasPlayableGame(gamesPath, collectionId)
      .then((playable) => {
        if (cancelled) return;
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
  }, [collectionId, enabled, gamesPath, contextResult, collectionGameIds]);

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

    if (contextResult !== null) {
      return { hasPlayableGame: contextResult, isLoading: false };
    }

    if (fetchedPlayable != null) {
      return { hasPlayableGame: fetchedPlayable, isLoading: false };
    }

    return { hasPlayableGame: null, isLoading: true };
  }, [
    collectionId,
    enabled,
    gamesPath,
    contextResult,
    collectionsLoading,
    developersLoading,
    publishersLoading,
    gamesLoading,
    isLoadingGameIds,
    fetchedPlayable,
  ]);

  return result;
}
