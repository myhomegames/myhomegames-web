import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import type { GameItem } from "../types";
import { API_BASE, getApiToken } from "../config";
import { buildApiUrl, buildApiHeaders } from "../utils/api";
import { useAuth } from "./AuthContext";

interface LibraryGamesContextType {
  games: GameItem[];
  isLoading: boolean;
  error: string | null;
  refreshGames: () => Promise<void>;
  addGame: (game: GameItem) => void;
  updateGame: (game: GameItem) => void;
  removeGame: (gameId: string | number) => void;
}

const LibraryGamesContext = createContext<LibraryGamesContextType | undefined>(undefined);

export function LibraryGamesProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<GameItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: authLoading, token: authToken } = useAuth();

  const fetchGames = useCallback(async () => {
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
    try {
      const url = buildApiUrl(API_BASE, "/libraries/library/games", {
        sort: "title",
      });
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.games || []) as any[];
      const parsed = items.map((v) => ({
        id: String(v.id),
        title: v.title,
        summary: v.summary,
        cover: v.cover,
        background: v.background,
        day: v.day,
        month: v.month,
        year: v.year,
        stars: v.stars,
        genre: v.genre,
        criticratings: v.criticratings,
        userratings: v.userratings,
        command: v.command || null,
        themes: v.themes || null,
        platforms: v.platforms || null,
        gameModes: v.gameModes || null,
        playerPerspectives: v.playerPerspectives || null,
        websites: v.websites || null,
        ageRatings: v.ageRatings || null,
        developers: v.developers || null,
        publishers: v.publishers || null,
        franchise: v.franchise || null,
        collection: v.collection || null,
        screenshots: v.screenshots || null,
        videos: v.videos || null,
        gameEngines: v.gameEngines || null,
        keywords: v.keywords || null,
        alternativeNames: v.alternativeNames || null,
        similarGames: v.similarGames || null,
      }));
      setGames(parsed);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      console.error("Error fetching library games:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, authToken]);

  // Load games on mount and when auth is ready
  useEffect(() => {
    if (!authLoading) {
      fetchGames();
    }
  }, [authLoading, fetchGames]);

  // Listen for game update events
  useEffect(() => {
    const handleGameUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ game: GameItem }>;
      const updatedGame = customEvent.detail?.game;
      if (updatedGame) {
        setGames((prev) =>
          prev.map((g) =>
            String(g.id) === String(updatedGame.id) ? updatedGame : g
          )
        );
      }
    };

    const handleGameDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId: string | number }>;
      const deletedGameId = customEvent.detail?.gameId;
      if (deletedGameId) {
        setGames((prev) =>
          prev.filter((g) => String(g.id) !== String(deletedGameId))
        );
      }
    };

    const handleGameAdded = (event: Event) => {
      const customEvent = event as CustomEvent<{ game: GameItem }>;
      const addedGame = customEvent.detail?.game;
      if (addedGame) {
        setGames((prev) => {
          // Check if game already exists
          if (prev.some((g) => String(g.id) === String(addedGame.id))) {
            return prev.map((g) =>
              String(g.id) === String(addedGame.id) ? addedGame : g
            );
          }
          return [...prev, addedGame].sort((a, b) => 
            (a.title || "").localeCompare(b.title || "")
          );
        });
      }
    };

    const handleMetadataReloaded = () => {
      fetchGames();
    };

    window.addEventListener("gameUpdated", handleGameUpdated as EventListener);
    window.addEventListener("gameDeleted", handleGameDeleted as EventListener);
    window.addEventListener("gameAdded", handleGameAdded as EventListener);
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    return () => {
      window.removeEventListener("gameUpdated", handleGameUpdated as EventListener);
      window.removeEventListener("gameDeleted", handleGameDeleted as EventListener);
      window.removeEventListener("gameAdded", handleGameAdded as EventListener);
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
    };
  }, [fetchGames]);

  const refreshGames = useCallback(async () => {
    await fetchGames();
  }, [fetchGames]);

  const addGame = useCallback((game: GameItem) => {
    setGames((prev) => {
      // Check if game already exists
      if (prev.some((g) => String(g.id) === String(game.id))) {
        return prev.map((g) =>
          String(g.id) === String(game.id) ? game : g
        );
      }
      return [...prev, game].sort((a, b) => 
        (a.title || "").localeCompare(b.title || "")
      );
    });
  }, []);

  const updateGame = useCallback((game: GameItem) => {
    setGames((prev) =>
      prev.map((g) =>
        String(g.id) === String(game.id) ? game : g
      )
    );
  }, []);

  const removeGame = useCallback((gameId: string | number) => {
    setGames((prev) =>
      prev.filter((g) => String(g.id) !== String(gameId))
    );
  }, []);

  const value: LibraryGamesContextType = useMemo(
    () => ({
      games,
      isLoading,
      error,
      refreshGames,
      addGame,
      updateGame,
      removeGame,
    }),
    [games, isLoading, error, refreshGames, addGame, updateGame, removeGame]
  );

  return <LibraryGamesContext.Provider value={value}>{children}</LibraryGamesContext.Provider>;
}

export function useLibraryGames() {
  const context = useContext(LibraryGamesContext);
  if (context === undefined) {
    throw new Error("useLibraryGames must be used within a LibraryGamesProvider");
  }
  return context;
}
