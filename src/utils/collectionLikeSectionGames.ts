import { buildApiUrl } from "./api";
import { API_BASE } from "../config";
import type { CollectionItem, GameItem } from "../types";
import type { CollectionLikeResourceType } from "../components/collections/EditCollectionLikeModal";
import { compareTitles } from "./stringUtils";

export type CollectionLikeSlideSection = {
  parent: CollectionItem;
  games: GameItem[];
  slideItems: GameItem[];
};

export function parseGamesListFromApiJson(json: { games?: unknown[] }): GameItem[] {
  const items = (json.games || []) as Record<string, unknown>[];
  return items.map((v) => ({
    id: v.id as GameItem["id"],
    title: v.title as string,
    summary: v.summary as string | undefined,
    cover: v.cover as string | undefined,
    background: v.background as string | undefined,
    day: (v.day as number | null | undefined) ?? null,
    month: (v.month as number | null | undefined) ?? null,
    year: (v.year as number | null | undefined) ?? null,
    stars: (v.stars as number | null | undefined) ?? null,
    executables: (v.executables as GameItem["executables"]) ?? null,
    themes: (v.themes as GameItem["themes"]) ?? undefined,
    platforms: (v.platforms as GameItem["platforms"]) ?? undefined,
    gameModes: (v.gameModes as GameItem["gameModes"]) ?? undefined,
    playerPerspectives: (v.playerPerspectives as GameItem["playerPerspectives"]) ?? undefined,
    websites: (v.websites as GameItem["websites"]) ?? undefined,
    ageRatings: (v.ageRatings as GameItem["ageRatings"]) ?? undefined,
    developers: (v.developers as GameItem["developers"]) ?? undefined,
    publishers: (v.publishers as GameItem["publishers"]) ?? undefined,
    franchise: (v.franchise as GameItem["franchise"]) ?? undefined,
    collection: (v.collection as GameItem["collection"]) ?? undefined,
    series: (v.series as GameItem["series"]) ?? (v.collection as GameItem["series"]) ?? undefined,
    screenshots: (v.screenshots as GameItem["screenshots"]) ?? undefined,
    videos: (v.videos as GameItem["videos"]) ?? undefined,
    gameEngines: (v.gameEngines as GameItem["gameEngines"]) ?? undefined,
    keywords: (v.keywords as GameItem["keywords"]) ?? undefined,
    alternativeNames: (v.alternativeNames as GameItem["alternativeNames"]) ?? undefined,
    similarGames: (v.similarGames as GameItem["similarGames"]) ?? undefined,
    type: (v.type as GameItem["type"]) ?? undefined,
  }));
}

function toYearRange(games: GameItem[]): string {
  const years = games
    .map((g) => g.year)
    .filter((y): y is number => typeof y === "number" && y > 0);
  if (years.length === 0) return "";
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min} - ${max}`;
}

export async function loadCollectionLikeSlideSections(
  entries: CollectionItem[],
  resourceType: CollectionLikeResourceType,
  completeCollectionLikes: CollectionItem[],
  token: string,
): Promise<CollectionLikeSlideSection[]> {
  const childRangeCache = new Map<string, string>();

  const loadChildCollectionLikeItems = async (parent: CollectionItem): Promise<GameItem[]> => {
    const parentChildIds = Array.isArray(parent.childs) ? parent.childs.map((id) => String(id)) : [];
    const childCollectionLikes = parentChildIds
      .map((childId) => completeCollectionLikes.find((c) => String(c.id) === childId))
      .filter((c): c is CollectionItem => Boolean(c))
      .sort((a, b) => compareTitles(a.title || "", b.title || ""));

    return Promise.all(
      childCollectionLikes.map(async (child) => {
        const childId = String(child.id);
        let range =
          (child as CollectionItem & { yearRange?: string }).yearRange ??
          (child as CollectionItem & { dateRange?: string }).dateRange ??
          (child as CollectionItem & { releaseRange?: string }).releaseRange ??
          "";
        if (typeof range !== "string") range = "";
        range = range.trim();

        if (!range) {
          const cached = childRangeCache.get(childId);
          if (cached !== undefined) {
            range = cached;
          } else {
            try {
              const childUrl = buildApiUrl(
                API_BASE,
                `/${resourceType}/${encodeURIComponent(childId)}/games`,
              );
              const childRes = await fetch(childUrl, {
                headers: { Accept: "application/json", "X-Auth-Token": token },
              });
              if (childRes.ok) {
                const childJson = await childRes.json();
                range = toYearRange(parseGamesListFromApiJson(childJson));
              }
            } catch {
              // ignore child range fetch errors
            }
            childRangeCache.set(childId, range);
          }
        }

        return {
          id: `collectionlike:${resourceType}:${childId}`,
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
      }),
    );
  };

  return Promise.all(
    entries.map(async (parent) => {
      try {
        const url = buildApiUrl(
          API_BASE,
          `/${resourceType}/${encodeURIComponent(String(parent.id))}/games`,
        );
        const res = await fetch(url, {
          headers: { Accept: "application/json", "X-Auth-Token": token },
        });
        const childCollectionLikeItems = await loadChildCollectionLikeItems(parent);

        if (!res.ok) {
          return {
            parent,
            games: [] as GameItem[],
            slideItems: childCollectionLikeItems,
          };
        }
        const json = await res.json();
        const games = parseGamesListFromApiJson(json);
        return {
          parent,
          games,
          slideItems: [...childCollectionLikeItems, ...games],
        };
      } catch {
        const childCollectionLikeItems = await loadChildCollectionLikeItems(parent);
        return {
          parent,
          games: [] as GameItem[],
          slideItems: childCollectionLikeItems,
        };
      }
    }),
  );
}
