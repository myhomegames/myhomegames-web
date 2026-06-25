import { useState } from "react";
import { buildApiHeaders } from "../../../utils/api";
import { buildCatalogApiUrl, isCatalogSearchEnabled } from "../../../utils/catalogApi";
import { syncCompanyProfilesAfterGameImport } from "../../../utils/catalogCompanyApi";
import { schedulePostGameImportLibraryRefresh, schedulePostCompanyProfileSyncRefresh } from "../../../utils/librarySyncEvents";
import { useSettings } from "../../../contexts/SettingsContext";
import { useLoading } from "../../../contexts/LoadingContext";
import type { CatalogGame, GameItem } from "../../../types";
import { toGameTypeId } from "../../../utils/gameType";

type UseAddGameParams = {
  onGameAdded?: (game: any) => void;
  onError?: (error: string) => void;
};

type UseAddGameReturn = {
  isAdding: boolean;
  addError: string | null;
  addGame: (catalogGame: CatalogGame) => Promise<any | null>;
};

export function useAddGame({
  onGameAdded,
  onError,
}: UseAddGameParams = {}): UseAddGameReturn {
  const { twitchApiEnabled } = useSettings();
  const { setLoading } = useLoading();
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const addGame = async (catalogGame: CatalogGame): Promise<any | null> => {
    setIsAdding(true);
    setAddError(null);
    setLoading(true);

    try {
      const url = buildCatalogApiUrl("/catalog/import-game");
      const res = await fetch(url, {
        method: "POST",
        headers: buildApiHeaders({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({
          gameId: catalogGame.id,
          name: catalogGame.name,
          summary: catalogGame.summary,
          cover: catalogGame.cover,
          background: catalogGame.background,
          releaseDate: catalogGame.releaseDateFull?.timestamp || catalogGame.releaseDate,
          genres: catalogGame.genres,
          criticRating: catalogGame.criticRating,
          userRating: catalogGame.userRating,
          themes: catalogGame.themes,
          platforms: catalogGame.platforms,
          gameModes: catalogGame.gameModes,
          playerPerspectives: catalogGame.playerPerspectives,
          websites: catalogGame.websites,
          ageRatings: catalogGame.ageRatings,
          developers: catalogGame.developers,
          publishers: catalogGame.publishers,
          franchise: catalogGame.franchise,
          collection: catalogGame.series ?? catalogGame.collection,
          screenshots: catalogGame.screenshots,
          videos: catalogGame.videos,
          gameEngines: catalogGame.gameEngines,
          keywords: catalogGame.keywords,
          alternativeNames: catalogGame.alternativeNames,
          similarGames: catalogGame.similarGames,
          type: toGameTypeId(catalogGame.type),
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

      const st = json.game?.type;
      const resolvedGameType: number | null =
        typeof st === "number"
          ? st
          : st === null
            ? null
            : (toGameTypeId(st as number | { id: number } | undefined) ?? toGameTypeId(catalogGame.type) ?? null);

      // Convert server response to GameItem format (matching the format used in App.tsx when loading games)
      const gameId = json.gameId || json.game?.id;
      const addedGame: GameItem = {
        id: String(gameId), // Convert to string to match format used in allGames
        title: json.game?.title || catalogGame.name,
        summary: json.game?.summary || catalogGame.summary || "",
        cover: json.game?.cover || catalogGame.cover || "", // Server returns `/covers/${id}` format
        background: json.game?.background || catalogGame.background || undefined,
        day: json.game?.day || catalogGame.releaseDateFull?.day || null,
        month: json.game?.month || catalogGame.releaseDateFull?.month || null,
        year: json.game?.year || catalogGame.releaseDateFull?.year || catalogGame.releaseDate || null,
        stars: json.game?.stars || null,
        genre: json.game?.genre || catalogGame.genres || null,
        criticratings: json.game?.criticratings || (catalogGame.criticRating ? catalogGame.criticRating / 10 : null),
        userratings: json.game?.userratings || (catalogGame.userRating ? catalogGame.userRating / 10 : null),
        executables: json.game?.executables || null,
        themes: json.game?.themes || catalogGame.themes || null,
        platforms: json.game?.platforms || catalogGame.platforms || null,
        gameModes: json.game?.gameModes || catalogGame.gameModes || null,
        playerPerspectives: json.game?.playerPerspectives || catalogGame.playerPerspectives || null,
        websites: json.game?.websites || catalogGame.websites || null,
        ageRatings: json.game?.ageRatings || catalogGame.ageRatings || null,
        developers: json.game?.developers || catalogGame.developers || null,
        publishers: json.game?.publishers || catalogGame.publishers || null,
        franchise: json.game?.franchise ?? catalogGame.franchise ?? null,
        collection: json.game?.collection ?? catalogGame.series ?? catalogGame.collection ?? null,
        series: json.game?.series ?? json.game?.collection ?? catalogGame.series ?? catalogGame.collection ?? null,
        screenshots: json.game?.screenshots || catalogGame.screenshots || null,
        videos: json.game?.videos || catalogGame.videos || null,
        gameEngines: json.game?.gameEngines || catalogGame.gameEngines || null,
        keywords: json.game?.keywords || catalogGame.keywords || null,
        alternativeNames: json.game?.alternativeNames || catalogGame.alternativeNames || null,
        similarGames: json.game?.similarGames || catalogGame.similarGames || null,
        type: resolvedGameType,
      };

      // Emit custom event to notify App.tsx and other components
      window.dispatchEvent(new CustomEvent("gameAdded", { detail: { game: addedGame } }));

      if (onGameAdded) {
        onGameAdded(addedGame);
      }

      schedulePostGameImportLibraryRefresh();

      if (isCatalogSearchEnabled(twitchApiEnabled)) {
        void syncCompanyProfilesAfterGameImport(
          catalogGame.developers as Array<{ id: number; name?: string }> | undefined,
          catalogGame.publishers as Array<{ id: number; name?: string }> | undefined,
        )
          .then(() => {
            schedulePostCompanyProfileSyncRefresh();
          })
          .catch((err) => {
            console.warn("Company profile sync skipped after game import:", err);
          });
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

