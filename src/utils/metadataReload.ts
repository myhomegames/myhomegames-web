import { API_BASE } from "../config";
import { buildApiUrl, buildApiHeaders } from "./api";
import { buildCatalogApiUrl } from "./catalogApi";
import { refreshRemoteCompanyProfileViaApi } from "./catalogCompanyApi";

/** Pause between bulk IGDB-backed reloads to stay under Twitch/IGDB rate limits. */
const BULK_IGDB_ITEM_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function forEachWithDelay<T>(
  items: readonly T[],
  delayMs: number,
  fn: (item: T) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < items.length; i += 1) {
    await fn(items[i]);
    if (delayMs > 0 && i < items.length - 1) {
      await sleep(delayMs);
    }
  }
}

async function postReload(path: string): Promise<Response> {
  return fetch(buildApiUrl(API_BASE, path), {
    method: "POST",
    headers: buildApiHeaders(),
  });
}

async function resolveCompanyTitle(
  resourceType: "developers" | "publishers",
  itemId: string,
  title?: string,
): Promise<string> {
  if (title?.trim()) return title.trim();
  const detailRes = await fetch(buildApiUrl(API_BASE, `/${resourceType}/${itemId}`), {
    headers: buildApiHeaders(),
  });
  if (!detailRes.ok) return "";
  const detail = (await detailRes.json()) as { title?: string };
  return typeof detail.title === "string" ? detail.title : "";
}

/** Fetch IGDB game payload and merge into local library storage. */
export async function refreshCatalogGameMetadataViaApi(gameId: string): Promise<void> {
  const catalogRes = await fetch(buildCatalogApiUrl(`/igdb/game/${gameId}`), {
    headers: buildApiHeaders(),
  });
  if (!catalogRes.ok) return;

  const catalogData = await catalogRes.json();

  await fetch(buildApiUrl(API_BASE, `/games/${gameId}/merge-catalog-metadata`), {
    method: "POST",
    headers: {
      ...buildApiHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(catalogData),
  });
}

/** Same steps as “Aggiorna metadati” on a single game. */
export async function reloadGameMetadataItem(
  gameId: string,
  catalogSearchEnabled: boolean,
): Promise<Response> {
  if (catalogSearchEnabled) {
    try {
      await refreshCatalogGameMetadataViaApi(gameId);
    } catch (err) {
      console.warn(`IGDB game metadata refresh skipped for ${gameId}:`, err);
    }
  }
  return postReload(`/games/${gameId}/reload`);
}

/** Same steps as “Aggiorna metadati” on a single developer. */
export async function reloadDeveloperMetadataItem(
  developerId: string,
  title: string | undefined,
  catalogSearchEnabled: boolean,
): Promise<Response> {
  if (catalogSearchEnabled) {
    try {
      const resolvedTitle = await resolveCompanyTitle("developers", developerId, title);
      await refreshRemoteCompanyProfileViaApi("developers", developerId, resolvedTitle);
    } catch (err) {
      console.warn(`IGDB developer metadata refresh skipped for ${developerId}:`, err);
    }
  }
  return postReload(`/developers/${developerId}/reload`);
}

/** Same steps as “Aggiorna metadati” on a single publisher. */
export async function reloadPublisherMetadataItem(
  publisherId: string,
  title: string | undefined,
  catalogSearchEnabled: boolean,
): Promise<Response> {
  if (catalogSearchEnabled) {
    try {
      const resolvedTitle = await resolveCompanyTitle("publishers", publisherId, title);
      await refreshRemoteCompanyProfileViaApi("publishers", publisherId, resolvedTitle);
    } catch (err) {
      console.warn(`IGDB publisher metadata refresh skipped for ${publisherId}:`, err);
    }
  }
  return postReload(`/publishers/${publisherId}/reload`);
}

export async function reloadCollectionMetadataItem(collectionId: string): Promise<Response> {
  return postReload(`/collections/${collectionId}/reload`);
}

export type ReloadAllMetadataInput = {
  catalogSearchEnabled: boolean;
  gameIds: string[];
  developers: Array<{ id: string; title?: string }>;
  publishers: Array<{ id: string; title?: string }>;
  collectionIds?: string[];
};

/**
 * Runs the single-item reload pipeline for every library entity, then refreshes server caches.
 * IGDB-backed steps run one at a time with a short pause to avoid Twitch rate limits (429).
 * Order: developers → publishers → games → collections → POST /reload-games (tags, themes, …).
 */
export async function reloadAllMetadataItems(input: ReloadAllMetadataInput): Promise<boolean> {
  const {
    catalogSearchEnabled,
    gameIds,
    developers,
    publishers,
    collectionIds = [],
  } = input;

  await forEachWithDelay(developers, BULK_IGDB_ITEM_DELAY_MS, (item) =>
    reloadDeveloperMetadataItem(item.id, item.title, catalogSearchEnabled),
  );
  await forEachWithDelay(publishers, BULK_IGDB_ITEM_DELAY_MS, (item) =>
    reloadPublisherMetadataItem(item.id, item.title, catalogSearchEnabled),
  );
  await forEachWithDelay(gameIds, BULK_IGDB_ITEM_DELAY_MS, (id) =>
    reloadGameMetadataItem(id, catalogSearchEnabled),
  );
  await Promise.all(collectionIds.map((id) => reloadCollectionMetadataItem(id)));

  const res = await postReload("/reload-games");
  return res.ok;
}
