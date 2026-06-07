import { useState, useEffect, useMemo } from "react";
import { buildApiHeaders } from "../utils/api";
import { buildIgdbApiUrl } from "../utils/igdbApi";

export type SimilarGameDetails = { name: string; cover?: string; releaseDate?: number | null };

/**
 * Fetches game names, covers and release year from IGDB for the given ids.
 * Returns a map id -> { name, cover?, releaseDate? }.
 */
export function useSimilarGamesDetails(
  ids: number[]
): { detailsById: Record<string, SimilarGameDetails>; isLoading: boolean } {
  const [detailsById, setDetailsById] = useState<Record<string, SimilarGameDetails>>({});
  const [isLoading, setIsLoading] = useState(false);

  const idsKey = useMemo(() => [...new Set(ids)].sort((a, b) => a - b).join(","), [ids]);

  useEffect(() => {
    if (ids.length === 0) {
      setDetailsById({});
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    const url = buildIgdbApiUrl("/igdb/game-names-by-ids", { ids: idsKey });
    fetch(url, {
      method: "GET",
      headers: buildApiHeaders(),
    })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { names?: Record<string, string>; covers?: Record<string, string>; releaseDates?: Record<string, number> }) => {
        if (cancelled) return;
        const names = data.names ?? {};
        const covers = data.covers ?? {};
        const releaseDates = data.releaseDates ?? {};
        const result: Record<string, SimilarGameDetails> = {};
        for (const id of Object.keys(names)) {
          result[id] = {
            name: names[id],
            cover: covers[id],
            releaseDate: releaseDates[id] ?? null,
          };
        }
        setDetailsById(result);
      })
      .catch(() => {
        if (!cancelled) setDetailsById({});
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey, ids.length]);

  return { detailsById, isLoading };
}
