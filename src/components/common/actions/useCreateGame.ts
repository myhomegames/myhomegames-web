import { useState } from "react";
import { API_BASE } from "../../../config";
import { buildApiUrl, buildApiHeaders } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";
import type { GameItem } from "../../../types";

type UseCreateGameParams = {
  onGameAdded?: (game: GameItem) => void;
  onError?: (error: string) => void;
};

type UseCreateGameReturn = {
  isCreating: boolean;
  createError: string | null;
  createGame: (title: string) => Promise<GameItem | null>;
};

export function useCreateGame({
  onGameAdded,
  onError,
}: UseCreateGameParams = {}): UseCreateGameReturn {
  const { setLoading } = useLoading();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createGame = async (title: string): Promise<GameItem | null> => {
    const name = typeof title === "string" ? title.trim() : "";
    if (!name) {
      const errorMsg = "Title is required";
      setCreateError(errorMsg);
      if (onError) onError(errorMsg);
      return null;
    }

    setIsCreating(true);
    setCreateError(null);
    setLoading(true);

    try {
      const url = buildApiUrl(API_BASE, "/games/create");
      const res = await fetch(url, {
        method: "POST",
        headers: buildApiHeaders({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({ title: name }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${res.status}`;
        setCreateError(errorMsg);
        if (onError) onError(errorMsg);
        return null;
      }

      const json = await res.json();
      const gameId = json.gameId ?? json.game?.id;
      const g = json.game || {};

      const addedGame: GameItem = {
        id: String(gameId),
        title: g.title ?? name,
        summary: g.summary ?? "",
        cover: g.cover ?? null,
        background: g.background ?? undefined,
        day: g.day ?? null,
        month: g.month ?? null,
        year: g.year ?? null,
        stars: g.stars ?? null,
        genre: g.genre ?? null,
        criticratings: g.criticratings ?? null,
        userratings: g.userratings ?? null,
        executables: g.executables ?? null,
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
        series: g.series ?? g.collection ?? null,
        screenshots: g.screenshots ?? null,
        videos: g.videos ?? null,
        gameEngines: g.gameEngines ?? null,
        keywords: g.keywords ?? null,
        alternativeNames: g.alternativeNames ?? null,
        similarGames: g.similarGames ?? null,
      };

      window.dispatchEvent(new CustomEvent("gameAdded", { detail: { game: addedGame } }));
      if (onGameAdded) onGameAdded(addedGame);
      return addedGame;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Failed to create game";
      console.error("Error creating game:", error);
      setCreateError(errorMsg);
      if (onError) onError(errorMsg);
      return null;
    } finally {
      setIsCreating(false);
      setLoading(false);
    }
  };

  return {
    isCreating,
    createError,
    createGame,
  };
}
