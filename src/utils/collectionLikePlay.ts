import { API_BASE } from "../config";
import type { GameItem } from "../types";
import { buildApiUrl, buildApiHeaders } from "./api";
import { parseGamesListFromApiJson } from "./collectionLikeSectionGames";

export type CollectionLikePlayPath = "collections" | "developers" | "publishers";

function gameHasExecutables(game: { executables?: unknown } | null | undefined): boolean {
  return Array.isArray(game?.executables) && (game!.executables as unknown[]).length > 0;
}

/**
 * Sync check from context: direct linked games first, then child collection-likes.
 * Returns `null` when data is incomplete (missing game-id map entry) so the caller can fetch.
 */
export function collectionLikeHasPlayableInContext(
  id: string | number,
  idsMap: Map<string, string[]>,
  itemsById: Map<string, { childs?: Array<string | number> }>,
  libraryGamesById: Map<string, { executables?: string[] | null }>,
  visited: Set<string> = new Set()
): boolean | null {
  const key = String(id);
  if (visited.has(key)) return false;
  visited.add(key);

  if (!idsMap.has(key)) return null;

  const gameIds = idsMap.get(key) || [];
  for (const gameId of gameIds) {
    const game = libraryGamesById.get(String(gameId));
    if (gameHasExecutables(game)) return true;
  }

  const item = itemsById.get(key);
  const childs = Array.isArray(item?.childs) ? item!.childs! : [];
  let incomplete = false;
  for (const childId of childs) {
    const childResult = collectionLikeHasPlayableInContext(
      childId,
      idsMap,
      itemsById,
      libraryGamesById,
      visited
    );
    if (childResult === true) return true;
    if (childResult === null) incomplete = true;
  }
  if (incomplete) return null;
  return false;
}

async function fetchChildIds(
  resourceType: CollectionLikePlayPath,
  id: string
): Promise<Array<string | number>> {
  const url = buildApiUrl(API_BASE, `/${resourceType}/${encodeURIComponent(id)}`);
  const res = await fetch(url, {
    headers: buildApiHeaders({ Accept: "application/json" }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.childs) ? json.childs : [];
}

/**
 * First playable game: direct games on this item, then depth-first into childs.
 */
export async function fetchFirstPlayableGameInCollectionLike(
  resourceType: CollectionLikePlayPath,
  id: string | number,
  visited: Set<string> = new Set()
): Promise<GameItem | null> {
  const key = String(id);
  if (visited.has(key)) return null;
  visited.add(key);

  try {
    const gamesUrl = buildApiUrl(
      API_BASE,
      `/${resourceType}/${encodeURIComponent(key)}/games`
    );
    const gamesRes = await fetch(gamesUrl, {
      headers: buildApiHeaders({ Accept: "application/json" }),
      cache: "no-store",
    });
    if (gamesRes.ok) {
      const json = await gamesRes.json();
      const games = parseGamesListFromApiJson(json);
      const first = games.find((g) => gameHasExecutables(g));
      if (first) return first;
    }
  } catch {
    // continue to children
  }

  let childs: Array<string | number> = [];
  try {
    childs = await fetchChildIds(resourceType, key);
  } catch {
    return null;
  }

  for (const childId of childs) {
    const found = await fetchFirstPlayableGameInCollectionLike(
      resourceType,
      childId,
      visited
    );
    if (found) return found;
  }
  return null;
}

/** Whether any direct or descendant game has launch scripts (API walk). */
export async function fetchCollectionLikeHasPlayableGame(
  resourceType: CollectionLikePlayPath,
  id: string | number,
  visited: Set<string> = new Set()
): Promise<boolean> {
  const game = await fetchFirstPlayableGameInCollectionLike(resourceType, id, visited);
  return game != null;
}
