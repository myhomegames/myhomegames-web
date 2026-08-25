import type { CatalogGame, GameItem } from "../types";

/** Seed catalog detail from list/search row so localized summary shows before full IGDB fetch. */
export function gameItemToCatalogSeed(game: GameItem): CatalogGame {
  const id = Number(game.id);
  const genres = Array.isArray(game.genre)
    ? game.genre.map((g) => (typeof g === "string" ? g : g.title)).filter(Boolean)
    : undefined;

  return {
    id: Number.isFinite(id) ? id : 0,
    name: game.title,
    summary: game.summary || "",
    cover: game.cover || null,
    background: game.background || null,
    logo: game.logo || null,
    releaseDate: game.year ?? null,
    releaseDateFull:
      game.year != null
        ? {
            year: game.year,
            month: game.month ?? 1,
            day: game.day ?? 1,
            timestamp: 0,
          }
        : null,
    genres,
    criticRating: game.criticratings ?? null,
    userRating: game.userratings ?? null,
    type: game.type ?? null,
  };
}
