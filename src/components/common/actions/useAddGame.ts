import { useState } from "react";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";
import type { IGDBGame, GameItem } from "../../../types";

type UseAddGameParams = {
  onGameAdded?: (game: any) => void;
  onError?: (error: string) => void;
};

type UseAddGameReturn = {
  isAdding: boolean;
  addError: string | null;
  addGame: (igdbGame: IGDBGame) => Promise<any | null>;
};

export function useAddGame({
  onGameAdded,
  onError,
}: UseAddGameParams = {}): UseAddGameReturn {
  const { setLoading } = useLoading();
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const addGame = async (igdbGame: IGDBGame): Promise<any | null> => {
    const apiToken = getApiToken();
    if (!apiToken) {
      const errorMsg = "Authentication required";
      setAddError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
      return null;
    }

    setIsAdding(true);
    setAddError(null);
    setLoading(true);

    try {
      const url = buildApiUrl(API_BASE, "/games/add-from-igdb");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Auth-Token": apiToken,
        },
        body: JSON.stringify({
          igdbId: igdbGame.id,
          name: igdbGame.name,
          summary: igdbGame.summary,
          cover: igdbGame.cover,
          background: igdbGame.background,
          releaseDate: igdbGame.releaseDateFull?.timestamp || igdbGame.releaseDate,
          genres: igdbGame.genres,
          criticRating: igdbGame.criticRating,
          userRating: igdbGame.userRating,
          themes: igdbGame.themes,
          platforms: igdbGame.platforms,
          gameModes: igdbGame.gameModes,
          playerPerspectives: igdbGame.playerPerspectives,
          websites: igdbGame.websites,
          ageRatings: igdbGame.ageRatings,
          developers: igdbGame.developers,
          publishers: igdbGame.publishers,
          franchise: igdbGame.franchise,
          collection: igdbGame.collection,
          screenshots: igdbGame.screenshots,
          videos: igdbGame.videos,
          gameEngines: igdbGame.gameEngines,
          keywords: igdbGame.keywords,
          alternativeNames: igdbGame.alternativeNames,
          similarGames: igdbGame.similarGames,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${res.status}`;
        setAddError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
        return null;
      }

      const json = await res.json();
      
      // Convert server response to GameItem format (matching the format used in App.tsx when loading games)
      const gameId = json.gameId || json.game?.id;
      const addedGame: GameItem = {
        id: String(gameId), // Convert to string to match format used in allGames
        title: json.game?.title || igdbGame.name,
        summary: json.game?.summary || igdbGame.summary || "",
        cover: json.game?.cover || igdbGame.cover || "", // Server returns `/covers/${id}` format
        background: json.game?.background || igdbGame.background || undefined,
        day: json.game?.day || igdbGame.releaseDateFull?.day || null,
        month: json.game?.month || igdbGame.releaseDateFull?.month || null,
        year: json.game?.year || igdbGame.releaseDateFull?.year || igdbGame.releaseDate || null,
        stars: json.game?.stars || null,
        genre: json.game?.genre || igdbGame.genres || null,
        criticratings: json.game?.criticratings || (igdbGame.criticRating ? igdbGame.criticRating / 10 : null),
        userratings: json.game?.userratings || (igdbGame.userRating ? igdbGame.userRating / 10 : null),
        executables: json.game?.executables || null,
        themes: json.game?.themes || igdbGame.themes || null,
        platforms: json.game?.platforms || igdbGame.platforms || null,
        gameModes: json.game?.gameModes || igdbGame.gameModes || null,
        playerPerspectives: json.game?.playerPerspectives || igdbGame.playerPerspectives || null,
        websites: json.game?.websites || igdbGame.websites || null,
        ageRatings: json.game?.ageRatings || igdbGame.ageRatings || null,
        developers: json.game?.developers || igdbGame.developers || null,
        publishers: json.game?.publishers || igdbGame.publishers || null,
        franchise: json.game?.franchise || igdbGame.franchise || null,
        collection: json.game?.collection || igdbGame.collection || null,
        screenshots: json.game?.screenshots || igdbGame.screenshots || null,
        videos: json.game?.videos || igdbGame.videos || null,
        gameEngines: json.game?.gameEngines || igdbGame.gameEngines || null,
        keywords: json.game?.keywords || igdbGame.keywords || null,
        alternativeNames: json.game?.alternativeNames || igdbGame.alternativeNames || null,
        similarGames: json.game?.similarGames || igdbGame.similarGames || null,
      };

      // Emit custom event to notify App.tsx and other components
      window.dispatchEvent(new CustomEvent("gameAdded", { detail: { game: addedGame } }));

      if (onGameAdded) {
        onGameAdded(addedGame);
      }

      return addedGame;
    } catch (error: any) {
      const errorMsg = error.message || "Failed to add game";
      console.error("Error adding game:", error);
      setAddError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
      return null;
    } finally {
      setIsAdding(false);
      setLoading(false);
    }
  };

  return {
    isAdding,
    addError,
    addGame,
  };
}

