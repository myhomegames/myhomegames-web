import { API_BASE } from "../config";
import { buildApiUrl, buildApiHeaders } from "./api";
import { buildCatalogApiUrl } from "./catalogApi";
import { refreshRemoteCompanyProfileViaApi } from "./catalogCompanyApi";
import type { ActivityProgressPhase } from "../contexts/LoadingContext";
import {
  clearBulkMetadataReloadProgress,
  isBulkMetadataReloadCancelRequested,
  setBulkMetadataReloadProgress,
} from "./bulkMetadataReloadContext";

export type MetadataReloadProgress = {
  phase: ActivityProgressPhase;
  percent: number;
};

/** Pause between bulk IGDB-backed reloads to stay under Twitch/IGDB rate limits. */
const BULK_IGDB_ITEM_DELAY_MS = 500;

function syncBulkMetadataReloadProgress(
  phase: ActivityProgressPhase,
  completedSteps: number,
  totalSteps: number,
) {
  if (totalSteps <= 0) return;
  const percent = Math.min(100, Math.round((completedSteps / totalSteps) * 100));
  setBulkMetadataReloadProgress({ phase, completedSteps, totalSteps, percent });
}

function reportProgress(
  onProgress: ReloadAllMetadataInput["onProgress"],
  phase: ActivityProgressPhase,
  completed: number,
  total: number,
) {
  syncBulkMetadataReloadProgress(phase, completed, total);
  if (!onProgress || total <= 0) return;
  const percent = Math.min(100, Math.round((completed / total) * 100));
  onProgress({ phase, percent });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export type MetadataReloadCheckpoint = {
  completedSteps: number;
  totalSteps: number;
  phase: ActivityProgressPhase;
  percent: number;
};

export type BulkMetadataReloadOutcome = "completed" | "cancelled" | "failed";

export type ReloadAllMetadataInput = {
  catalogSearchEnabled: boolean;
  gameIds: string[];
  developers: Array<{ id: string; title?: string }>;
  publishers: Array<{ id: string; title?: string }>;
  collectionIds?: string[];
  startAtCompletedSteps?: number;
  onProgress?: (progress: MetadataReloadProgress) => void;
  onCheckpoint?: (checkpoint: MetadataReloadCheckpoint) => void;
};

function currentPhaseForStep(
  completedSteps: number,
  developers: readonly unknown[],
  publishers: readonly unknown[],
  gameIds: readonly unknown[],
  collectionIds: readonly unknown[],
): ActivityProgressPhase {
  if (completedSteps < developers.length) return "developers";
  if (completedSteps < developers.length + publishers.length) return "publishers";
  if (completedSteps < developers.length + publishers.length + gameIds.length) return "games";
  if (completedSteps < developers.length + publishers.length + gameIds.length + collectionIds.length) {
    return "collections";
  }
  return "cache";
}

/**
 * Runs the single-item reload pipeline for every library entity, then refreshes server caches.
 * IGDB-backed steps run one at a time with a short pause to avoid Twitch rate limits (429).
 * Order: developers → publishers → games → collections → POST /reload-games (tags, themes, …).
 */
function emitCheckpoint(
  onCheckpoint: ReloadAllMetadataInput["onCheckpoint"],
  phase: ActivityProgressPhase,
  completedSteps: number,
  totalSteps: number,
) {
  if (!onCheckpoint || totalSteps <= 0) return;
  const percent = Math.min(100, Math.round((completedSteps / totalSteps) * 100));
  onCheckpoint({ completedSteps, totalSteps, phase, percent });
}

async function processMetadataPhase<T>(
  phase: ActivityProgressPhase,
  items: readonly T[],
  phaseStartStep: number,
  delayMs: number,
  completedStepsRef: { value: number },
  totalSteps: number,
  onProgress: ReloadAllMetadataInput["onProgress"],
  onCheckpoint: ReloadAllMetadataInput["onCheckpoint"],
  fn: (item: T) => Promise<unknown>,
): Promise<boolean> {
  const skip = Math.max(0, completedStepsRef.value - phaseStartStep);
  const remaining = items.slice(skip);

  for (let i = 0; i < remaining.length; i += 1) {
    if (isBulkMetadataReloadCancelRequested()) {
      return false;
    }
    reportProgress(onProgress, phase, completedStepsRef.value, totalSteps);
    await fn(remaining[i]);
    completedStepsRef.value += 1;
    reportProgress(onProgress, phase, completedStepsRef.value, totalSteps);
    emitCheckpoint(onCheckpoint, phase, completedStepsRef.value, totalSteps);
    if (delayMs > 0 && i < remaining.length - 1) {
      await sleep(delayMs);
    }
  }

  return true;
}

export async function reloadAllMetadataItems(
  input: ReloadAllMetadataInput,
): Promise<BulkMetadataReloadOutcome> {
  const {
    catalogSearchEnabled,
    gameIds,
    developers,
    publishers,
    collectionIds = [],
    startAtCompletedSteps = 0,
    onProgress,
    onCheckpoint,
  } = input;

  const totalSteps =
    developers.length + publishers.length + gameIds.length + collectionIds.length + 1;
  const completedStepsRef = { value: Math.min(startAtCompletedSteps, totalSteps) };

  try {
    if (isBulkMetadataReloadCancelRequested()) {
      return "cancelled";
    }

    if (completedStepsRef.value >= totalSteps) {
      return "completed";
    }

    syncBulkMetadataReloadProgress("developers", completedStepsRef.value, totalSteps);
    onProgress?.({
      phase: currentPhaseForStep(
        completedStepsRef.value,
        developers,
        publishers,
        gameIds,
        collectionIds,
      ),
      percent:
        totalSteps > 0
          ? Math.min(100, Math.round((completedStepsRef.value / totalSteps) * 100))
          : 0,
    });

    const developersEnd = developers.length;
    const publishersEnd = developersEnd + publishers.length;
    const gamesEnd = publishersEnd + gameIds.length;

    if (
      !(await processMetadataPhase(
        "developers",
        developers,
        0,
        BULK_IGDB_ITEM_DELAY_MS,
        completedStepsRef,
        totalSteps,
        onProgress,
        onCheckpoint,
        (item) => reloadDeveloperMetadataItem(item.id, item.title, catalogSearchEnabled),
      ))
    ) {
      return "cancelled";
    }
    if (
      !(await processMetadataPhase(
        "publishers",
        publishers,
        developersEnd,
        BULK_IGDB_ITEM_DELAY_MS,
        completedStepsRef,
        totalSteps,
        onProgress,
        onCheckpoint,
        (item) => reloadPublisherMetadataItem(item.id, item.title, catalogSearchEnabled),
      ))
    ) {
      return "cancelled";
    }
    if (
      !(await processMetadataPhase(
        "games",
        gameIds,
        publishersEnd,
        BULK_IGDB_ITEM_DELAY_MS,
        completedStepsRef,
        totalSteps,
        onProgress,
        onCheckpoint,
        (id) => reloadGameMetadataItem(id, catalogSearchEnabled),
      ))
    ) {
      return "cancelled";
    }
    if (
      !(await processMetadataPhase(
        "collections",
        collectionIds,
        gamesEnd,
        0,
        completedStepsRef,
        totalSteps,
        onProgress,
        onCheckpoint,
        (id) => reloadCollectionMetadataItem(id),
      ))
    ) {
      return "cancelled";
    }

    if (isBulkMetadataReloadCancelRequested()) {
      return "cancelled";
    }

    if (completedStepsRef.value >= totalSteps) {
      return "completed";
    }

    reportProgress(onProgress, "cache", completedStepsRef.value, totalSteps);
    const res = await postReload("/reload-games");
    completedStepsRef.value += 1;
    reportProgress(onProgress, "cache", completedStepsRef.value, totalSteps);
    emitCheckpoint(onCheckpoint, "cache", completedStepsRef.value, totalSteps);
    return res.ok ? "completed" : "failed";
  } finally {
    clearBulkMetadataReloadProgress();
  }
}
