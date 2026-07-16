import type { CollectionItem, GameItem } from "../types";
import { compareTitles } from "./stringUtils";

export function parseGamesFromJson(json: { games?: any[] }): GameItem[] {
  const items = (json.games || []) as any[];
  return items.map((v) => ({
    id: v.id,
    title: v.title,
    summary: v.summary,
    cover: v.cover,
    background: v.background,
    day: v.day,
    month: v.month,
    year: v.year,
    stars: v.stars,
    executables: v.executables || null,
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
    series: v.series ?? v.collection ?? null,
    screenshots: v.screenshots || null,
    videos: v.videos || null,
    gameEngines: v.gameEngines || null,
    keywords: v.keywords || null,
    alternativeNames: v.alternativeNames || null,
    similarGames: v.similarGames || null,
    type: v.type ?? null,
  }));
}

function toYearRange(games: GameItem[]): string {
  const years = games.map((g) => g.year).filter((y): y is number => typeof y === "number" && y > 0);
  if (years.length === 0) return "";
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min} - ${max}`;
}

export type ChildSlideItemsLookup = {
  collectionGameIds?: Map<string, string[]>;
  libraryById?: Map<string, GameItem>;
};

function yearRangeForChildCollection(
  child: CollectionItem,
  lookup?: ChildSlideItemsLookup,
): string {
  let range =
    (child as { yearRange?: string }).yearRange ??
    (child as { dateRange?: string }).dateRange ??
    (child as { releaseRange?: string }).releaseRange ??
    "";
  if (typeof range !== "string") range = "";
  range = range.trim();
  if (range) return range;

  const childId = String(child.id);
  const gameIds = lookup?.collectionGameIds?.get(childId);
  if (!gameIds?.length || !lookup?.libraryById) return "";

  const games: GameItem[] = [];
  for (const gameId of gameIds) {
    const game = lookup.libraryById.get(gameId);
    if (game) games.push(game);
  }
  return toYearRange(games);
}

/**
 * Pseudo slide rows for first-level sub-collections of a collection (same id shape as LibraryItemDetail parent slider).
 */
export function buildChildCollectionLikeSlideItems(
  collection: CollectionItem,
  allCollections: CollectionItem[],
  lookup?: ChildSlideItemsLookup,
): GameItem[] {
  const byId = new Map(allCollections.map((c) => [String(c.id), c]));
  const parentChildIds = Array.isArray(collection.childs) ? collection.childs.map((id) => String(id)) : [];
  const childCollectionLikes = parentChildIds
    .map((childId) => byId.get(childId))
    .filter((c): c is CollectionItem => Boolean(c))
    .sort((a, b) => compareTitles(a.title || "", b.title || ""));

  return childCollectionLikes.map((child) => {
    const range = yearRangeForChildCollection(child, lookup);
    return {
      id: `collectionlike:collections:${String(child.id)}`,
      title: child.title,
      subtitle: range || null,
      summary: child.summary || "",
      cover: child.cover,
      year: null,
      month: null,
      day: null,
      executables: null,
      stars: null,
    } as GameItem;
  });
}
