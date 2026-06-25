import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { CollectionItem } from "../types";
import { buildApiHeaders, buildAppApiUrl } from "../utils/api";
import { compareTitles } from "../utils/stringUtils";
import { schedulePostGameDeleteLibraryRefresh } from "../utils/librarySyncEvents";
import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";

interface CollectionsContextType {
  collections: CollectionItem[];
  isLoading: boolean;
  error: string | null;
  refreshCollections: () => Promise<void>;
  addCollection: (collection: CollectionItem) => void;
  updateCollection: (collection: CollectionItem) => void;
  removeCollection: (collectionId: string | number) => void;
  getCollectionGameIds: (collectionId: string | number) => Promise<string[]>;
  collectionGameIds: Map<string, string[]>;
  addGameToCollectionCache: (collectionId: string | number, gameId: string) => void;
  removeGameFromCollectionCache: (collectionId: string | number, gameId: string) => void;
}

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectionGameIds, setCollectionGameIds] = useState<Map<string, string[]>>(new Map());
  const collectionGameIdsRef = useRef(collectionGameIds);
  collectionGameIdsRef.current = collectionGameIds;
  const collectionsRef = useRef(collections);
  collectionsRef.current = collections;
  const { isLoading: authLoading } = useAuth();
  const { settingsLoaded } = useSettings();

  const fetchCollections = useCallback(async () => {
    if (authLoading) {
      return;
    }
    if (!settingsLoaded) {
      return;
    }

    const showLoading = collectionsRef.current.length === 0;
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const url = buildAppApiUrl("/collections");
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.collections || []) as any[];
      const parsed = items.map((v) => ({
        id: String(v.id),
        title: v.title,
        summary: v.summary,
        cover: v.cover,
        background: v.background,
        gameCount: v.gameCount,
        showTitle: v.showTitle !== false,
        childs: Array.isArray(v.childs) ? v.childs : [],
      }));
      parsed.sort((a, b) => compareTitles(a.title || "", b.title || ""));
      setCollections(parsed);
      setCollectionGameIds((prev) => {
        const updated = new Map(prev);
        for (const v of items) {
          if (Array.isArray(v.gameIds)) {
            updated.set(
              String(v.id),
              v.gameIds.map((id: string | number) => String(id)),
            );
          }
        }
        return updated;
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      const errorMessage = String(err.message || err);
      console.error("Error fetching collections:", errorMessage);
      setError(errorMessage);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [authLoading, settingsLoaded]);

  // Load collections on mount and when auth is ready (stagger to avoid all fetches at once)
  useEffect(() => {
    if (authLoading) return;
    if (!settingsLoaded) return;
    const t = setTimeout(fetchCollections, 400);
    return () => clearTimeout(t);
  }, [authLoading, settingsLoaded, fetchCollections]);

  useEffect(() => {
    collectionGameIdsRef.current = collectionGameIds;
  }, [collectionGameIds]);

  // Listen for collection update events
  useEffect(() => {
    const handleCollectionUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ collection?: CollectionItem; collectionId?: string | number }>;
      const updatedCollection = customEvent.detail?.collection;
      const collectionId = customEvent.detail?.collectionId;
      
      if (updatedCollection) {
        // Merge with existing collection so we preserve fields not in the payload (e.g. gameCount)
        setCollections((prev) => {
          const updated = prev.map((col) =>
            String(col.id) === String(updatedCollection.id)
              ? { ...col, ...updatedCollection }
              : col
          );
          updated.sort((a, b) => compareTitles(a.title || "", b.title || ""));
          return updated;
        });
      } else if (collectionId) {
        // Collection was modified (e.g., game added/removed/deleted), refresh from server to get updated gameCount
        fetchCollections();
        // Reload game IDs for this collection immediately to keep cache up to date
        const reloadGameIds = async () => {
          try {
            const gamesUrl = buildAppApiUrl(`/collections/${collectionId}/games`);
            const gamesRes = await fetch(gamesUrl, {
              headers: buildApiHeaders({ Accept: "application/json" }),
              cache: "no-store",
            });
            if (gamesRes.ok) {
              const bodyText = await gamesRes.text();
              if (!bodyText.trim()) return;
              const gamesJson = JSON.parse(bodyText);
              const gameIds = (gamesJson.games || []).map((g: any) => String(g.id));
              setCollectionGameIds((prev) => {
                const updated = new Map(prev);
                updated.set(String(collectionId), gameIds);
                return updated;
              });
            }
          } catch (err: any) {
            console.error(`Error reloading games for collection ${collectionId}:`, err.message);
            // If reload fails, clear cache so it will be reloaded on next access
            setCollectionGameIds((prev) => {
              const updated = new Map(prev);
              updated.delete(String(collectionId));
              return updated;
            });
          }
        };
        reloadGameIds();
      }
    };

    const handleCollectionDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ collectionId: string | number }>;
      const deletedCollectionId = customEvent.detail?.collectionId;
      if (deletedCollectionId) {
        setCollections((prev) =>
          prev.filter((col) => String(col.id) !== String(deletedCollectionId))
        );
        setCollectionGameIds((prev) => {
          const updated = new Map(prev);
          updated.delete(String(deletedCollectionId));
          return updated;
        });
      }
    };

    const handleMetadataReloaded = () => {
      fetchCollections();
    };

    const handleGameDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: string | number }>;
      const deletedGameId = customEvent.detail?.gameId;
      if (deletedGameId == null) return;

      const gameIdStr = String(deletedGameId);
      const affectedCollectionIds: string[] = [];

      setCollectionGameIds((prev) => {
        const updated = new Map(prev);
        for (const [collectionId, gameIds] of prev) {
          if (!gameIds.includes(gameIdStr)) continue;
          affectedCollectionIds.push(collectionId);
          updated.set(
            collectionId,
            gameIds.filter((id) => id !== gameIdStr),
          );
        }
        return updated;
      });

      if (affectedCollectionIds.length > 0) {
        setCollections((prev) =>
          prev.map((col) => {
            if (!affectedCollectionIds.includes(String(col.id))) return col;
            const nextCount = Math.max(0, (col.gameCount ?? 1) - 1);
            return { ...col, gameCount: nextCount };
          }),
        );
      }

      schedulePostGameDeleteLibraryRefresh(affectedCollectionIds);
    };

    window.addEventListener("collectionUpdated", handleCollectionUpdated as EventListener);
    window.addEventListener("collectionDeleted", handleCollectionDeleted as EventListener);
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    window.addEventListener("gameDeleted", handleGameDeleted as EventListener);
    return () => {
      window.removeEventListener("collectionUpdated", handleCollectionUpdated as EventListener);
      window.removeEventListener("collectionDeleted", handleCollectionDeleted as EventListener);
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
      window.removeEventListener("gameDeleted", handleGameDeleted as EventListener);
    };
  }, [fetchCollections]);

  const refreshCollections = useCallback(async () => {
    await fetchCollections();
  }, [fetchCollections]);

  const addCollection = useCallback((collection: CollectionItem) => {
    setCollections((prev) => {
      // Check if collection already exists
      if (prev.some((c) => String(c.id) === String(collection.id))) {
        return prev;
      }
      const updated = [...prev, collection];
      updated.sort((a, b) => compareTitles(a.title || "", b.title || ""));
      return updated;
    });
  }, []);

  const updateCollection = useCallback((collection: CollectionItem) => {
    setCollections((prev) => {
      const updated = prev.map((col) =>
        String(col.id) === String(collection.id) ? collection : col
      );
      updated.sort((a, b) => compareTitles(a.title || "", b.title || ""));
      return updated;
    });
  }, []);

  const removeCollection = useCallback((collectionId: string | number) => {
    setCollections((prev) =>
      prev.filter((col) => String(col.id) !== String(collectionId))
    );
    setCollectionGameIds((prev) => {
      const updated = new Map(prev);
      updated.delete(String(collectionId));
      return updated;
    });
  }, []);

  const addGameToCollectionCache = useCallback((collectionId: string | number, gameId: string) => {
    setCollectionGameIds((prev) => {
      const updated = new Map(prev);
      const collectionKey = String(collectionId);
      const currentGameIds = updated.get(collectionKey) || [];
      if (!currentGameIds.includes(gameId)) {
        updated.set(collectionKey, [...currentGameIds, gameId]);
      }
      return updated;
    });
  }, []);

  const removeGameFromCollectionCache = useCallback((collectionId: string | number, gameId: string) => {
    setCollectionGameIds((prev) => {
      const updated = new Map(prev);
      const collectionKey = String(collectionId);
      const currentGameIds = updated.get(collectionKey) || [];
      updated.set(collectionKey, currentGameIds.filter(id => id !== gameId));
      return updated;
    });
  }, []);

  const getCollectionGameIds = useCallback(async (collectionId: string | number): Promise<string[]> => {
    const cached = collectionGameIdsRef.current.get(String(collectionId));
    if (cached) {
      return cached;
    }

    try {
      const gamesUrl = buildAppApiUrl(`/collections/${collectionId}/games`);
      const gamesRes = await fetch(gamesUrl, {
        headers: buildApiHeaders({ Accept: "application/json" }),
        cache: "no-store",
      });
      if (gamesRes.status === 304) {
        const cached = collectionGameIdsRef.current.get(String(collectionId));
        if (cached) return cached;
      }
      if (gamesRes.ok) {
        const bodyText = await gamesRes.text();
        if (!bodyText.trim()) {
          const cached = collectionGameIdsRef.current.get(String(collectionId));
          if (cached) return cached;
          return [];
        }
        const gamesJson = JSON.parse(bodyText);
        const gameIds = (gamesJson.games || []).map((g: any) => String(g.id));
        setCollectionGameIds((prev) => {
          const collectionKey = String(collectionId);
          const existing = prev.get(collectionKey) || [];
          if (existing.length === gameIds.length && existing.every((id, index) => id === gameIds[index])) {
            return prev;
          }
          const updated = new Map(prev);
          updated.set(collectionKey, gameIds);
          return updated;
        });
        return gameIds;
      }
    } catch (err: any) {
      console.error(`Error fetching games for collection ${collectionId}:`, err.message);
    }
    return [];
  }, []);

  const value: CollectionsContextType = useMemo(
    () => ({
      collections,
      isLoading,
      error,
      refreshCollections,
      addCollection,
      updateCollection,
      removeCollection,
      getCollectionGameIds,
      collectionGameIds,
      addGameToCollectionCache,
      removeGameFromCollectionCache,
    }),
    [collections, isLoading, error, refreshCollections, addCollection, updateCollection, removeCollection, getCollectionGameIds, collectionGameIds, addGameToCollectionCache, removeGameFromCollectionCache]
  );

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
}

export function useCollections() {
  const context = useContext(CollectionsContext);
  if (context === undefined) {
    throw new Error("useCollections must be used within a CollectionsProvider");
  }
  return context;
}
