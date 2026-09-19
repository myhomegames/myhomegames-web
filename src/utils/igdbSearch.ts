import type { CatalogGame } from "../types";
import { buildApiHeaders } from "./api";
import { buildCatalogApiUrl } from "./catalogApi";

/** Same readiness rule as Add Game / AddGamePage (min 2 chars, or numeric IGDB id). */
export function isIgdbSearchQueryReady(query: string): boolean {
  const trimmed = String(query || "").trim();
  if (!trimmed) return false;
  const isNumericId = /^\d+$/.test(trimmed);
  return trimmed.length >= 2 || isNumericId;
}

/**
 * Search IGDB via the catalog API (`GET /igdb/search`).
 * Used by Add Game and the similar-games picker.
 */
export async function searchIgdbGames(
  query: string,
  signal?: AbortSignal,
): Promise<CatalogGame[]> {
  const trimmed = String(query || "").trim();
  if (!isIgdbSearchQueryReady(trimmed)) return [];

  const url = new URL(buildCatalogApiUrl("/igdb/search"));
  url.searchParams.set("q", trimmed);

  const res = await fetch(url.toString(), {
    headers: buildApiHeaders({ Accept: "application/json" }),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = typeof body?.error === "string" ? body.error : `HTTP ${res.status}`;
    throw new Error(message);
  }

  const json = await res.json();
  return Array.isArray(json.games) ? (json.games as CatalogGame[]) : [];
}
