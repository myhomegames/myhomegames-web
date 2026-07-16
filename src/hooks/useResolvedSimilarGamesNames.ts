import { useState, useEffect, useMemo } from "react";
import { buildApiHeaders } from "../utils/api";
import { buildCatalogApiUrl } from "../utils/catalogApi";

type SimilarGameEntry = { id: number; name: string };

/**
 * Returns true if the name is just the id (game not in library, server returned id as name).
 */
function isNumericName(sg: SimilarGameEntry): boolean {
  const idStr = String(sg.id);
  return sg.name === idStr || sg.name.trim() === idStr;
}

/**
 * Fetches game names from IGDB for the given ids and returns a map id -> name.
 */
async function fetchCatalogNamesByIds(ids: number[]): Promise<Record<string, string>> {
  const url = buildCatalogApiUrl("/igdb/game-names-by-ids", { ids: ids.join(",") });
  const res = await fetch(url, {
    method: "GET",
    headers: buildApiHeaders(),
  });
  if (!res.ok) return {};
  const data = (await res.json()) as { names?: Record<string, string> };
  return data.names ?? {};
}

/**
 * Resolves similar games that have numeric names (id as name) by fetching titles from IGDB.
 * Returns the same list with names replaced when available from IGDB.
 */
export function useResolvedSimilarGamesNames(
  similarGames: SimilarGameEntry[] | null | undefined
): { similarGames: SimilarGameEntry[]; isLoading: boolean } {
  const list = useMemo(
    () => (similarGames && Array.isArray(similarGames) ? similarGames : []),
    [similarGames]
  );

  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const idsToResolve = useMemo(() => {
    const ids: number[] = [];
    for (const sg of list) {
      if (isNumericName(sg)) ids.push(sg.id);
    }
    return ids;
  }, [list]);

  useEffect(() => {
    if (idsToResolve.length === 0) {
      setResolvedNames({});
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchCatalogNamesByIds(idsToResolve)
      .then((names) => {
        if (!cancelled) setResolvedNames(names);
      })
      .catch(() => {
        if (!cancelled) setResolvedNames({});
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idsToResolve.join(",")]);

  const resolved = useMemo(() => {
    return list.map((sg) => {
      const resolvedName = resolvedNames[String(sg.id)];
      return resolvedName != null ? { id: sg.id, name: resolvedName } : sg;
    });
  }, [list, resolvedNames]);

  return { similarGames: resolved, isLoading };
}
