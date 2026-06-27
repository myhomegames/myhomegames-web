import { API_BASE } from "../config";
import { buildApiUrl, buildApiHeaders } from "./api";
import { buildCatalogApiUrl } from "./catalogApi";
import { refreshRemoteCompanyProfileViaApi } from "./catalogCompanyApi";
import type { ActivityProgress, ActivityProgressPhase } from "../contexts/LoadingContext";
import {
  clearBulkMetadataReloadProgressIfRun,
  getBulkMetadataReloadAbortSignal,
  getBulkMetadataReloadRunId,
  isBulkMetadataReloadAbortedError,
  isBulkMetadataReloadCancelRequested,
  setBulkMetadataReloadProgress,
  throwIfMetadataReloadAborted,
} from "./bulkMetadataReloadContext";
import { getSingleMetadataReloadAbortSignal } from "./activitySession";

export type MetadataReloadProgress = ActivityProgress;

/** Pause between bulk IGDB-backed reloads to stay under Twitch/IGDB rate limits. */
const BULK_IGDB_ITEM_DELAY_MS = 500;

type MetadataEntity = { id: string; title?: string };

function formatItemLabel(title: string | undefined, id: string): string {
  const trimmed = title?.trim();
  return trimmed || `#${id}`;
}

function syncBulkMetadataReloadProgress(
  phase: ActivityProgressPhase,
  completedSteps: number,
  totalSteps: number,
) {
  if (totalSteps <= 0) return;
  const percent = Math.min(100, Math.round((completedSteps / totalSteps) * 100));
  setBulkMetadataReloadProgress({ phase, completedSteps, totalSteps, percent });
}

function buildProgressSnapshot(input: {
  phase: ActivityProgressPhase;
  completedSteps: number;
  totalSteps: number;
  itemLabel?: string;
  phaseIndex?: number;
  phaseTotal?: number;
}): ActivityProgress {
  const { phase, completedSteps, totalSteps, itemLabel, phaseIndex, phaseTotal } = input;
  const percent =
    totalSteps > 0 ? Math.min(100, Math.round((completedSteps / totalSteps) * 100)) : 0;

  return {
    phase,
    percent,
    itemLabel,
    step: Math.min(totalSteps, completedSteps + 1),
    totalSteps,
    phaseIndex,
    phaseTotal,
  };
}

function reportProgress(
  onProgress: ReloadAllMetadataInput["onProgress"],
  input: {
    phase: ActivityProgressPhase;
    completedSteps: number;
    totalSteps: number;
    itemLabel?: string;
    phaseIndex?: number;
    phaseTotal?: number;
  },
) {
  throwIfMetadataReloadAborted();
  syncBulkMetadataReloadProgress(input.phase, input.completedSteps, input.totalSteps);
  if (!onProgress || input.totalSteps <= 0) return;
  onProgress(buildProgressSnapshot(input));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function postReload(path: string, signal?: AbortSignal): Promise<Response> {
  return fetch(buildApiUrl(API_BASE, path), {
    method: "POST",
    headers: buildApiHeaders(),
    signal,
  });
}

async function resolveCompanyTitle(
  resourceType: "developers" | "publishers",
  itemId: string,
  title?: string,
  signal?: AbortSignal,
): Promise<string> {
  throwIfMetadataReloadAborted();
  if (title?.trim()) return title.trim();
  const detailRes = await fetch(buildApiUrl(API_BASE, `/${resourceType}/${itemId}`), {
    headers: buildApiHeaders(),
    signal,
  });
  if (!detailRes.ok) return "";
  const detail = (await detailRes.json()) as { title?: string };
  return typeof detail.title === "string" ? detail.title : "";
}

/** Fetch IGDB game payload and merge into local library storage. */
export async function refreshCatalogGameMetadataViaApi(
  gameId: string,
  signal?: AbortSignal,
): Promise<void> {
  throwIfMetadataReloadAborted();
  const catalogRes = await fetch(buildCatalogApiUrl(`/igdb/game/${gameId}`), {
    headers: buildApiHeaders(),
    signal,
  });
  if (!catalogRes.ok) return;

  const catalogData = await catalogRes.json();
  throwIfMetadataReloadAborted();

  await fetch(buildApiUrl(API_BASE, `/games/${gameId}/merge-catalog-metadata`), {
    method: "POST",
    headers: {
      ...buildApiHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(catalogData),
    signal,
  });
}

function metadataReloadSignal(): AbortSignal | undefined {
  return getBulkMetadataReloadAbortSignal() ?? getSingleMetadataReloadAbortSignal();
}

/** Same steps as “Aggiorna metadati” on a single game. */
export async function reloadGameMetadataItem(
  gameId: string,
  catalogSearchEnabled: boolean,
): Promise<Response> {
  const signal = metadataReloadSignal();
  throwIfMetadataReloadAborted();
  if (catalogSearchEnabled) {
    try {
      await refreshCatalogGameMetadataViaApi(gameId, signal);
    } catch (err) {
      if (isBulkMetadataReloadAbortedError(err)) throw err;
      console.warn(`IGDB game metadata refresh skipped for ${gameId}:`, err);
    }
  }
  throwIfMetadataReloadAborted();
  return postReload(`/games/${gameId}/reload`, signal);
}

/** Same steps as “Aggiorna metadati” on a single developer. */
export async function reloadDeveloperMetadataItem(
  developerId: string,
  title: string | undefined,
  catalogSearchEnabled: boolean,
): Promise<Response> {
  const signal = metadataReloadSignal();
  throwIfMetadataReloadAborted();
  if (catalogSearchEnabled) {
    try {
      const resolvedTitle = await resolveCompanyTitle("developers", developerId, title, signal);
      await refreshRemoteCompanyProfileViaApi("developers", developerId, resolvedTitle, {
        signal,
      });
    } catch (err) {
      if (isBulkMetadataReloadAbortedError(err)) throw err;
      console.warn(`IGDB developer metadata refresh skipped for ${developerId}:`, err);
    }
  }
  throwIfMetadataReloadAborted();
  return postReload(`/developers/${developerId}/reload`, signal);
}

/** Same steps as “Aggiorna metadati” on a single publisher. */
export async function reloadPublisherMetadataItem(
  publisherId: string,
  title: string | undefined,
  catalogSearchEnabled: boolean,
): Promise<Response> {
  const signal = metadataReloadSignal();
  throwIfMetadataReloadAborted();
  if (catalogSearchEnabled) {
    try {
      const resolvedTitle = await resolveCompanyTitle("publishers", publisherId, title, signal);
      await refreshRemoteCompanyProfileViaApi("publishers", publisherId, resolvedTitle, {
        signal,
      });
    } catch (err) {
      if (isBulkMetadataReloadAbortedError(err)) throw err;
      console.warn(`IGDB publisher metadata refresh skipped for ${publisherId}:`, err);
    }
  }
  throwIfMetadataReloadAborted();
  return postReload(`/publishers/${publisherId}/reload`, signal);
}

export async function reloadCollectionMetadataItem(collectionId: string): Promise<Response> {
  const signal = metadataReloadSignal();
  throwIfMetadataReloadAborted();
  return postReload(`/collections/${collectionId}/reload`, signal);
}

export type MetadataReloadCheckpoint = ActivityProgress & {
  completedSteps: number;
};

export type BulkMetadataReloadOutcome = "completed" | "cancelled" | "failed";

export type ReloadAllMetadataInput = {
  catalogSearchEnabled: boolean;
  games: MetadataEntity[];
  developers: MetadataEntity[];
  publishers: MetadataEntity[];
  collections?: MetadataEntity[];
  startAtCompletedSteps?: number;
  onProgress?: (progress: MetadataReloadProgress) => void;
  onCheckpoint?: (checkpoint: MetadataReloadCheckpoint) => void;
};

function currentPhaseForStep(
  completedSteps: number,
  developers: readonly unknown[],
  publishers: readonly unknown[],
  games: readonly unknown[],
  collections: readonly unknown[],
): ActivityProgressPhase {
  if (completedSteps < developers.length) return "developers";
  if (completedSteps < developers.length + publishers.length) return "publishers";
  if (completedSteps < developers.length + publishers.length + games.length) return "games";
  if (completedSteps < developers.length + publishers.length + games.length + collections.length) {
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
  progress: ActivityProgress,
  completedSteps: number,
  totalSteps: number,
) {
  if (!onCheckpoint || totalSteps <= 0) return;
  onCheckpoint({ ...progress, completedSteps, totalSteps });
}

async function processMetadataPhase<T extends MetadataEntity>(
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
  const signal = metadataReloadSignal();
  const skip = Math.max(0, completedStepsRef.value - phaseStartStep);
  const remaining = items.slice(skip);
  const phaseTotal = items.length;

  for (let i = 0; i < remaining.length; i += 1) {
    if (isBulkMetadataReloadCancelRequested()) {
      return false;
    }

    const item = remaining[i];
    const phaseIndex = skip + i + 1;
    const inProgressSnapshot = buildProgressSnapshot({
      phase,
      completedSteps: completedStepsRef.value,
      totalSteps,
      itemLabel: formatItemLabel(item.title, item.id),
      phaseIndex,
      phaseTotal,
    });

    reportProgress(onProgress, {
      phase,
      completedSteps: completedStepsRef.value,
      totalSteps,
      itemLabel: inProgressSnapshot.itemLabel,
      phaseIndex,
      phaseTotal,
    });

    try {
      await fn(item);
    } catch (err) {
      if (isBulkMetadataReloadAbortedError(err) || isBulkMetadataReloadCancelRequested()) {
        return false;
      }
      throw err;
    }

    completedStepsRef.value += 1;
    const completedSnapshot = buildProgressSnapshot({
      phase,
      completedSteps: completedStepsRef.value,
      totalSteps,
    });
    reportProgress(onProgress, {
      phase,
      completedSteps: completedStepsRef.value,
      totalSteps,
    });
    emitCheckpoint(onCheckpoint, completedSnapshot, completedStepsRef.value, totalSteps);

    if (delayMs > 0 && i < remaining.length - 1) {
      try {
        await sleep(delayMs, signal);
      } catch (err) {
        if (isBulkMetadataReloadAbortedError(err) || isBulkMetadataReloadCancelRequested()) {
          return false;
        }
        throw err;
      }
    }
  }

  return true;
}

export async function reloadAllMetadataItems(
  input: ReloadAllMetadataInput,
): Promise<BulkMetadataReloadOutcome> {
  const {
    catalogSearchEnabled,
    games,
    developers,
    publishers,
    collections = [],
    startAtCompletedSteps = 0,
    onProgress,
    onCheckpoint,
  } = input;

  const runId = getBulkMetadataReloadRunId();
  const signal = metadataReloadSignal();

  const totalSteps =
    developers.length + publishers.length + games.length + collections.length + 1;
  const completedStepsRef = { value: Math.min(startAtCompletedSteps, totalSteps) };

  try {
    if (isBulkMetadataReloadCancelRequested()) {
      return "cancelled";
    }

    if (completedStepsRef.value >= totalSteps) {
      return "completed";
    }

    syncBulkMetadataReloadProgress("developers", completedStepsRef.value, totalSteps);
    onProgress?.(
      buildProgressSnapshot({
        phase: currentPhaseForStep(
          completedStepsRef.value,
          developers,
          publishers,
          games,
          collections,
        ),
        completedSteps: completedStepsRef.value,
        totalSteps,
      }),
    );

    const developersEnd = developers.length;
    const publishersEnd = developersEnd + publishers.length;
    const gamesEnd = publishersEnd + games.length;

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
        games,
        publishersEnd,
        BULK_IGDB_ITEM_DELAY_MS,
        completedStepsRef,
        totalSteps,
        onProgress,
        onCheckpoint,
        (item) => reloadGameMetadataItem(item.id, catalogSearchEnabled),
      ))
    ) {
      return "cancelled";
    }
    if (
      !(await processMetadataPhase(
        "collections",
        collections,
        gamesEnd,
        0,
        completedStepsRef,
        totalSteps,
        onProgress,
        onCheckpoint,
        (item) => reloadCollectionMetadataItem(item.id),
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

    reportProgress(onProgress, {
      phase: "cache",
      completedSteps: completedStepsRef.value,
      totalSteps,
    });
    let res: Response;
    try {
      res = await postReload("/reload-games", signal);
    } catch (err) {
      if (isBulkMetadataReloadAbortedError(err) || isBulkMetadataReloadCancelRequested()) {
        return "cancelled";
      }
      throw err;
    }
    completedStepsRef.value += 1;
    const cacheSnapshot = buildProgressSnapshot({
      phase: "cache",
      completedSteps: completedStepsRef.value,
      totalSteps,
    });
    reportProgress(onProgress, {
      phase: "cache",
      completedSteps: completedStepsRef.value,
      totalSteps,
    });
    emitCheckpoint(onCheckpoint, cacheSnapshot, completedStepsRef.value, totalSteps);
    return res.ok ? "completed" : "failed";
  } finally {
    clearBulkMetadataReloadProgressIfRun(runId);
  }
}
