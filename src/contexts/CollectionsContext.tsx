import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { CollectionItem } from "../types";
import { API_BASE, getApiToken } from "../config";
import { buildApiUrl, buildApiHeaders } from "../utils/api";
import { useAuth } from "./AuthContext";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectionGameIds, setCollectionGameIds] = useState<Map<string, string[]>>(new Map());
  const collectionGameIdsRef = useRef(collectionGameIds);
  const { isLoading: authLoading, token: authToken } = useAuth();

  const fetchCollections = useCallback(async () => {
    // Wait for authentication to complete before making API requests
    if (authLoading) {
      return;
    }
    
    const apiToken = getApiToken() || authToken;
    if (!apiToken) {
      return;
    }

    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const url = buildApiUrl(API_BASE, "/collections");
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
      }));
      setCollections(parsed);
      
      // Don't pre-fetch game IDs for all collections - load them on demand via getCollectionGameIds
      // This avoids unnecessary API calls when user is on library page or other pages that don't need this data
    } catch (err: any) {
      clearTimeout(timeoutId);
      const errorMessage = String(err.message || err);
      console.error("Error fetching collections:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, authToken]);

  // Load collections on mount and when auth is ready
  useEffect(() => {
    if (!authLoading) {
      fetchCollections();
    }
  }, [authLoading, fetchCollections]);

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
        // Direct collection update with full object
        setCollections((prev) =>
          prev.map((col) =>
            String(col.id) === String(updatedCollection.id) ? updatedCollection : col
          )
        );
      } else if (collectionId) {
        // Collection was modified (e.g., game added/removed/deleted), refresh from server to get updated gameCount
        fetchCollections();
        // Reload game IDs for this collection immediately to keep cache up to date
        const reloadGameIds = async () => {
          try {
            const gamesUrl = buildApiUrl(API_BASE, `/collections/${collectionId}/games`);
            const gamesRes = await fetch(gamesUrl, {
              headers: buildApiHeaders({ Accept: "application/json" }),
            });
            if (gamesRes.ok) {
              const gamesJson = await gamesRes.json();
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

    window.addEventListener("collectionUpdated", handleCollectionUpdated as EventListener);
    window.addEventListener("collectionDeleted", handleCollectionDeleted as EventListener);
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    return () => {
      window.removeEventListener("collectionUpdated", handleCollectionUpdated as EventListener);
      window.removeEventListener("collectionDeleted", handleCollectionDeleted as EventListener);
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
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
      updated.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      return updated;
    });
  }, []);

  const updateCollection = useCallback((collection: CollectionItem) => {
    setCollections((prev) =>
      prev.map((col) =>
        String(col.id) === String(collection.id) ? collection : col
      )
    );
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
      const gamesUrl = buildApiUrl(API_BASE, `/collections/${collectionId}/games`);
      const gamesRes = await fetch(gamesUrl, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (gamesRes.ok) {
        const gamesJson = await gamesRes.json();
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
