import i18n from "../i18n/config";
import type { GameItem } from "../types";

function summaryFromApi(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const map = value as Record<string, unknown>;
  const lang = String(i18n.language || "en").split(/[-_]/)[0] || "en";
  for (const key of [lang, "en"]) {
    const text = map[key];
    if (typeof text === "string" && text.trim()) return text;
  }
  for (const text of Object.values(map)) {
    if (typeof text === "string" && text.trim()) return text;
  }
  return "";
}

function nullable<T>(value: T | null | undefined): T | null {
  return value == null || value === "" ? null : value;
}

/** Same shape as GET /games/:id, so a metadata reload can replace the detail view in place. */
export function gameItemFromApi(data: Record<string, unknown>): GameItem {
  const collection = (data.collection as GameItem["collection"]) ?? null;
  return {
    id: String(data.id ?? ""),
    title: typeof data.title === "string" ? data.title : "",
    subtitle: data.subtitle as GameItem["subtitle"],
    summary: summaryFromApi(data.summary),
    cover: data.cover as GameItem["cover"],
    background: data.background as GameItem["background"],
    logo: data.logo as GameItem["logo"],
    externalCoverUrl: (data.externalCoverUrl as GameItem["externalCoverUrl"]) ?? null,
    externalBackgroundUrl: (data.externalBackgroundUrl as GameItem["externalBackgroundUrl"]) ?? null,
    externalLogoUrl: (data.externalLogoUrl as GameItem["externalLogoUrl"]) ?? null,
    showTitle: data.showTitle as GameItem["showTitle"],
    day: data.day as GameItem["day"],
    month: data.month as GameItem["month"],
    year: data.year as GameItem["year"],
    dateAdded: nullable(data.dateAdded as GameItem["dateAdded"]),
    dateInstalled: nullable(data.dateInstalled as GameItem["dateInstalled"]),
    datePlayed: nullable(data.datePlayed as GameItem["datePlayed"]),
    stars: data.stars as GameItem["stars"],
    genre: data.genre as GameItem["genre"],
    criticratings: data.criticratings as GameItem["criticratings"],
    userratings: data.userratings as GameItem["userratings"],
    executables: nullable(data.executables as GameItem["executables"]),
    executableFileNames: nullable(data.executableFileNames as GameItem["executableFileNames"]),
    themes: nullable(data.themes as GameItem["themes"]),
    platforms: nullable(data.platforms as GameItem["platforms"]),
    gameModes: nullable(data.gameModes as GameItem["gameModes"]),
    playerPerspectives: nullable(data.playerPerspectives as GameItem["playerPerspectives"]),
    websites: nullable(data.websites as GameItem["websites"]),
    ageRatings: nullable(data.ageRatings as GameItem["ageRatings"]),
    developers: nullable(data.developers as GameItem["developers"]),
    publishers: nullable(data.publishers as GameItem["publishers"]),
    franchise: nullable(data.franchise as GameItem["franchise"]),
    collection,
    series: (data.series as GameItem["series"]) ?? collection,
    screenshots: nullable(data.screenshots as GameItem["screenshots"]),
    videos: nullable(data.videos as GameItem["videos"]),
    gameEngines: nullable(data.gameEngines as GameItem["gameEngines"]),
    keywords: nullable(data.keywords as GameItem["keywords"]),
    alternativeNames: nullable(data.alternativeNames as GameItem["alternativeNames"]),
    similarGames: nullable(data.similarGames as GameItem["similarGames"]),
    type: (data.type as GameItem["type"]) ?? null,
  };
}
