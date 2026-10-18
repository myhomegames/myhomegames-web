import { useState, useEffect, useMemo } from "react";
import { buildApiHeaders } from "../utils/api";
import { buildCatalogApiUrl } from "../utils/catalogApi";

export type SimilarGameDetails = { name: string; cover?: string; releaseDate?: number | null };

/** IGDB returns 10 rows unless the query sets limit. Chunk so an older server still fills every tile. */
const IGDB_DETAILS_CHUNK = 10;

const similarDetailsCache = new Map<string, SimilarGameDetails>();

/** Keep cover and title from a catalog detail visit so Back can paint the similar-games tile. */
export function rememberSimilarGameDetails(
  id: number | string,
  details: SimilarGameDetails,
): void {
  const name = details.name?.trim();
  if (!name) return;
  const cover = details.cover?.trim();
  similarDetailsCache.set(String(id), {
    name,
    cover: cover || undefined,
    releaseDate: details.releaseDate ?? null,
  });
}

function cachedDetailsFor(ids: string[]): Record<string, SimilarGameDetails> {
  const result: Record<string, SimilarGameDetails> = {};
  for (const id of ids) {
    const hit = similarDetailsCache.get(id);
    if (hit) result[id] = hit;
  }
  return result;
}

type NamesByIdsResponse = {
  names?: Record<string, string>;
  covers?: Record<string, string>;
  releaseDates?: Record<string, number>;
};

async function fetchDetailsChunk(ids: string[]): Promise<Record<string, SimilarGameDetails>> {
  const url = buildCatalogApiUrl("/igdb/game-names-by-ids", { ids: ids.join(",") });
  const res = await fetch(url, {
    method: "GET",
    headers: buildApiHeaders(),
  });
  if (!res.ok) return {};
  const data = (await res.json()) as NamesByIdsResponse;
  const names = data.names ?? {};
  const covers = data.covers ?? {};
  const releaseDates = data.releaseDates ?? {};
  const result: Record<string, SimilarGameDetails> = {};
  for (const id of Object.keys(names)) {
    const name = names[id]?.trim();
    if (!name) continue;
    const details: SimilarGameDetails = {
      name,
      cover: covers[id]?.trim() || undefined,
      releaseDate: releaseDates[id] ?? null,
    };
    rememberSimilarGameDetails(id, details);
    result[id] = details;
  }
  return result;
}

export async function fetchSimilarGameDetailsByIds(
  ids: Array<number | string>,
): Promise<Record<string, SimilarGameDetails>> {
  const unique = [...new Set(ids.map((id) => String(id)).filter((id) => id && id !== "NaN"))];
  if (unique.length === 0) return {};
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += IGDB_DETAILS_CHUNK) {
    chunks.push(unique.slice(i, i + IGDB_DETAILS_CHUNK));
  }
  const parts = await Promise.all(chunks.map((chunk) => fetchDetailsChunk(chunk)));
  return Object.assign({}, ...parts);
}

/**
 * Fetches game names, covers and release year from IGDB for the given ids.
 * Returns a map id -> { name, cover?, releaseDate? }.
 */
export function useSimilarGamesDetails(
  ids: number[]
): { detailsById: Record<string, SimilarGameDetails>; isLoading: boolean } {
  const idsKey = useMemo(() => [...new Set(ids)].sort((a, b) => a - b).join(","), [ids]);
  const [detailsById, setDetailsById] = useState<Record<string, SimilarGameDetails>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const idList = idsKey ? idsKey.split(",") : [];
    if (idList.length === 0) {
      setDetailsById({});
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setDetailsById(cachedDetailsFor(idList));
    setIsLoading(true);

    fetchSimilarGameDetailsByIds(idList)
      .then((fetched) => {
        if (cancelled) return;
        setDetailsById({ ...cachedDetailsFor(idList), ...fetched });
      })
      .catch(() => {
        if (!cancelled) setDetailsById(cachedDetailsFor(idList));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return { detailsById, isLoading };
}
