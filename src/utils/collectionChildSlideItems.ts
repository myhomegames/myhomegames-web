import type { CollectionItem, GameItem } from "../types";
import { API_BASE } from "../config";
import { buildApiUrl } from "./api";
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

/**
 * Pseudo slide rows for first-level sub-collections of a collection (same id shape as LibraryItemDetail parent slider).
 */
export async function buildChildCollectionLikeSlideItems(
  collection: CollectionItem,
  allCollections: CollectionItem[],
  apiToken: string
): Promise<GameItem[]> {
  const byId = new Map(allCollections.map((c) => [String(c.id), c]));
  const parentChildIds = Array.isArray(collection.childs) ? collection.childs.map((id) => String(id)) : [];
  const childCollectionLikes = parentChildIds
    .map((childId) => byId.get(childId))
    .filter((c): c is CollectionItem => Boolean(c))
    .sort((a, b) => compareTitles(a.title || "", b.title || ""));

  if (childCollectionLikes.length === 0) return [];

  const childRangeCache = new Map<string, string>();

  return Promise.all(
    childCollectionLikes.map(async (child) => {
      const childId = String(child.id);
      let range =
        (child as { yearRange?: string }).yearRange ??
        (child as { dateRange?: string }).dateRange ??
        (child as { releaseRange?: string }).releaseRange ??
        "";
      if (typeof range !== "string") range = "";
      range = range.trim();

      if (!range) {
        const cached = childRangeCache.get(childId);
        if (cached !== undefined) {
          range = cached;
        } else {
          try {
            const childUrl = buildApiUrl(API_BASE, `/collections/${encodeURIComponent(childId)}/games`);
            const childRes = await fetch(childUrl, {
              headers: { Accept: "application/json", "X-Auth-Token": apiToken },
            });
            if (childRes.ok) {
              const childJson = await childRes.json();
              range = toYearRange(parseGamesFromJson(childJson));
            }
          } catch {
            // ignore
          }
          childRangeCache.set(childId, range);
        }
      }

      return {
        id: `collectionlike:collections:${childId}`,
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
    })
  );
}
