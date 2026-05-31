import { useState, useEffect, useCallback, useRef } from "react";
import { buildApiUrl } from "../utils/api";
import { API_BASE } from "../config";
import { buildApiHeaders } from "../utils/api";

export type IgdbGameForTag = {
  id: number;
  name: string;
  cover: string | null;
  releaseDate: number | null;
};

const ENDPOINT_MAP: Record<string, string> = {
  themes: "/igdb/games-by-theme",
  platforms: "/igdb/games-by-platform",
  gameModes: "/igdb/games-by-game-mode",
  playerPerspectives: "/igdb/games-by-player-perspective",
  gameEngines: "/igdb/games-by-game-engine",
  developers: "/igdb/games-by-developer",
  publishers: "/igdb/games-by-publisher",
  categories: "/igdb/games-by-genre",
};

const ENDPOINT_BY_NAME_MAP: Record<string, string> = {
  themes: "/igdb/games-by-theme-by-name",
  platforms: "/igdb/games-by-platform-by-name",
  gameModes: "/igdb/games-by-game-mode-by-name",
  playerPerspectives: "/igdb/games-by-player-perspective-by-name",
  gameEngines: "/igdb/games-by-game-engine-by-name",
  developers: "/igdb/games-by-developer-by-name",
  publishers: "/igdb/games-by-publisher-by-name",
  categories: "/igdb/games-by-genre-by-name",
};

const TAG_NAME_TYPE_MAP: Record<string, string> = {
  themes: "themes",
  platforms: "platforms",
  gameModes: "game-modes",
  playerPerspectives: "player-perspectives",
  gameEngines: "game-engines",
  developers: "companies",
  publishers: "companies",
  categories: "genres",
};

export type IgdbTagKey = "themes" | "platforms" | "gameModes" | "playerPerspectives" | "gameEngines" | "developers" | "publishers" | "categories";

export function useIgdbGamesForTag(
  tagKey: IgdbTagKey | null,
  tagId: string | null,
  libraryGameIds: number[],
  fetchAll = false,
  tagNameFromUrlOrLabels?: string | null
): {
  igdbGames: IgdbGameForTag[];
  tagName: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [igdbGames, setIgdbGames] = useState<IgdbGameForTag[]>([]);
  const [tagName, setTagName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = tagKey ? ENDPOINT_MAP[tagKey] : null;
  const endpointByName = tagKey ? ENDPOINT_BY_NAME_MAP[tagKey] : null;
  const libraryGameIdsKey = fetchAll ? "" : libraryGameIds.join(",");
  const useByName = Boolean(tagNameFromUrlOrLabels && tagNameFromUrlOrLabels.trim());

  const fetchGames = useCallback(async () => {
    if (!tagId) {
      setIgdbGames([]);
      setTagName(null);
      return;
    }

    if (useByName && endpointByName && tagNameFromUrlOrLabels?.trim()) {
      setLoading(true);
      setError(null);
      try {
        const name = tagNameFromUrlOrLabels.trim();
        const url = buildApiUrl(API_BASE, endpointByName);
        const excludeIds = fetchAll ? [] : libraryGameIds;
        const res = await fetch(url, {
          method: "POST",
          headers: buildApiHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ name, excludeIds }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Failed to fetch IGDB games");
        }
        const data = await res.json();
        const games = (data.games || []).map((g: any) => ({
          id: g.id,
          name: g.name || "",
          cover: g.cover || null,
          releaseDate: g.releaseDate ?? null,
        }));
        setIgdbGames(games);
        setTagName(name);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch");
        setIgdbGames([]);
        setTagName(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!endpoint) {
      setIgdbGames([]);
      setTagName(null);
      return;
    }

    const id = parseInt(tagId, 10);
    if (Number.isNaN(id) || id < 1) {
      setIgdbGames([]);
      setTagName(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nameType = tagKey ? TAG_NAME_TYPE_MAP[tagKey] : null;
      const namePromise =
        nameType
          ? fetch(buildApiUrl(API_BASE, `/igdb/tag-name/${nameType}/${id}`), {
              headers: buildApiHeaders({ Accept: "application/json" }),
            }).then((r) => (r.ok ? r.json() : { name: null })).then((d) => d.name ?? null)
          : Promise.resolve(null);

      const url = buildApiUrl(API_BASE, `${endpoint}/${id}`);
      const excludeIds = fetchAll ? [] : libraryGameIds;
      const res = await fetch(url, {
        method: "POST",
        headers: buildApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ excludeIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch IGDB games");
      }
      const data = await res.json();
      const games = (data.games || []).map((g: any) => ({
        id: g.id,
        name: g.name || "",
        cover: g.cover || null,
        releaseDate: g.releaseDate ?? null,
      }));
      setIgdbGames(games);
      const resolvedName = await namePromise;
      setTagName(resolvedName);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch");
      setIgdbGames([]);
      setTagName(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint, endpointByName, tagId, libraryGameIdsKey, fetchAll, useByName, tagNameFromUrlOrLabels, tagKey]);

  const lastFetchedRef = useRef<{ tagKey: string; tagId: string; tagName: string | undefined } | null>(null);
  useEffect(() => {
    if (!(tagKey && tagId)) {
      lastFetchedRef.current = null;
      setIgdbGames([]);
      setTagName(null);
      setError(null);
      return;
    }
    const nameKey = tagNameFromUrlOrLabels?.trim() ?? "";
    if (
      lastFetchedRef.current?.tagKey === tagKey &&
      lastFetchedRef.current?.tagId === tagId &&
      lastFetchedRef.current?.tagName === nameKey
    ) {
      return;
    }
    lastFetchedRef.current = { tagKey, tagId, tagName: nameKey || undefined };
    fetchGames();
  }, [tagKey, tagId, tagNameFromUrlOrLabels, fetchGames]);

  return { igdbGames, tagName, loading, error, refetch: fetchGames };
}
