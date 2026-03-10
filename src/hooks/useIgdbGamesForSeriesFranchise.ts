import { useState, useEffect, useCallback, useRef } from "react";
import { buildApiUrl } from "../utils/api";
import { API_BASE, getApiToken, getTwitchClientId, getTwitchClientSecret } from "../config";

export type IgdbGameForTag = {
  id: number;
  name: string;
  cover: string | null;
  releaseDate: number | null;
};

export function useIgdbGamesForSeriesFranchise(
  tagKey: "series" | "franchise" | null,
  tagId: string | null,
  libraryGameIds: number[],
  /** When true, fetch ALL IGDB games (no exclude) for merging with library games in one list */
  fetchAll = false
): {
  igdbGames: IgdbGameForTag[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [igdbGames, setIgdbGames] = useState<IgdbGameForTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const libraryGameIdsKey = fetchAll ? "" : libraryGameIds.join(",");
  const fetchGames = useCallback(async () => {
    if (tagKey && (tagKey === "series" || tagKey === "franchise") && tagId) {
      const id = parseInt(tagId || "", 10);
      if (Number.isNaN(id) || id < 1) {
        setIgdbGames([]);
        return;
      }

      const clientId = getTwitchClientId();
      const clientSecret = getTwitchClientSecret();
      if (!clientId || !clientSecret) {
        setIgdbGames([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const endpoint =
          tagKey === "franchise"
            ? `/igdb/games-by-franchise/${id}`
            : `/igdb/games-by-collection/${id}`;
        const url = buildApiUrl(API_BASE, endpoint);
        const excludeIds = fetchAll ? [] : libraryGameIds;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Token": getApiToken() || "",
            "X-Twitch-Client-Id": clientId,
            "X-Twitch-Client-Secret": clientSecret,
          },
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
      } catch (err: any) {
        setError(err?.message || "Failed to fetch");
        setIgdbGames([]);
      } finally {
        setLoading(false);
      }
    } else {
      setIgdbGames([]);
    }
  }, [tagKey, tagId, libraryGameIdsKey, fetchAll]);

  const lastFetchedRef = useRef<{ tagKey: string; tagId: string } | null>(null);
  useEffect(() => {
    if (!(tagKey && (tagKey === "series" || tagKey === "franchise") && tagId)) {
      lastFetchedRef.current = null;
      setIgdbGames([]);
      setError(null);
      return;
    }
    if (
      lastFetchedRef.current?.tagKey === tagKey &&
      lastFetchedRef.current?.tagId === tagId
    ) {
      return;
    }
    lastFetchedRef.current = { tagKey, tagId };
    fetchGames();
  }, [tagKey, tagId, fetchGames]);

  return { igdbGames, loading, error, refetch: fetchGames };
}
