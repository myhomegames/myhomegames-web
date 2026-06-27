import type { ActivityProgress, ActivityProgressPhase } from "../contexts/LoadingContext";

export const ACTIVITY_SESSION_KEY = "mhg:activity";

export type PersistedBulkMetadataJob = {
  kind: "bulk-metadata";
  catalogSearchEnabled: boolean;
  games: Array<{ id: string; title?: string }>;
  developers: Array<{ id: string; title?: string }>;
  publishers: Array<{ id: string; title?: string }>;
  collections: Array<{ id: string; title?: string }>;
  completedSteps: number;
  totalSteps: number;
};

export type PersistedSingleMetadataJob = {
  kind: "single-metadata";
  target: Extract<
    ActivityProgressPhase,
    "game" | "collection" | "developer" | "publisher"
  >;
  id: string;
  title?: string;
  catalogSearchEnabled: boolean;
};

export type PersistedActivityJob = PersistedBulkMetadataJob | PersistedSingleMetadataJob;

export type PersistedActivityState = {
  progress: ActivityProgress | null;
  job: PersistedActivityJob;
};

function readRaw(): PersistedActivityState | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ACTIVITY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedActivityState;
    if (!parsed?.job?.kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRaw(state: PersistedActivityState | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!state) {
      sessionStorage.removeItem(ACTIVITY_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(ACTIVITY_SESSION_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function readPersistedActivity(): PersistedActivityState | null {
  return readRaw();
}

export function hasPersistedActivityJob(): boolean {
  return readRaw()?.job != null;
}

export function clearPersistedActivity(): void {
  writeRaw(null);
}

export function updatePersistedProgress(progress: ActivityProgress): void {
  const current = readRaw();
  if (!current) return;
  writeRaw({ ...current, progress });
}

export function updatePersistedBulkCheckpoint(
  completedSteps: number,
  progress: ActivityProgress,
): void {
  const current = readRaw();
  if (!current || current.job.kind !== "bulk-metadata") return;
  writeRaw({
    progress,
    job: { ...current.job, completedSteps },
  });
}

export function beginPersistedBulkJob(input: {
  catalogSearchEnabled: boolean;
  games: Array<{ id: string; title?: string }>;
  developers: Array<{ id: string; title?: string }>;
  publishers: Array<{ id: string; title?: string }>;
  collections: Array<{ id: string; title?: string }>;
}): number {
  const totalSteps =
    input.developers.length +
    input.publishers.length +
    input.games.length +
    input.collections.length +
    1;

  writeRaw({
    progress: { phase: "developers", percent: 0, step: 1, totalSteps },
    job: {
      kind: "bulk-metadata",
      ...input,
      completedSteps: 0,
      totalSteps,
    },
  });

  return totalSteps;
}

export function beginPersistedSingleJob(input: PersistedSingleMetadataJob): void {
  writeRaw({
    progress: buildSingleMetadataReloadProgress(input.target, 0, input.title, input.id),
    job: input,
  });
}

export function buildSingleMetadataReloadProgress(
  phase: PersistedSingleMetadataJob["target"],
  percent: number,
  title: string | undefined,
  id: string,
): ActivityProgress {
  const itemLabel = title?.trim() || `#${id}`;
  return {
    phase,
    percent,
    itemLabel,
    step: 1,
    totalSteps: 1,
    phaseIndex: 1,
    phaseTotal: 1,
  };
}

export type SingleMetadataReloadTarget = {
  target: PersistedSingleMetadataJob["target"];
  id: string;
};

export function resolveSingleMetadataReloadTarget(input: {
  gameId?: string;
  collectionId?: string;
  developerId?: string;
  publisherId?: string;
}): SingleMetadataReloadTarget | null {
  if (input.gameId) return { target: "game", id: input.gameId };
  if (input.collectionId) return { target: "collection", id: input.collectionId };
  if (input.developerId) return { target: "developer", id: input.developerId };
  if (input.publisherId) return { target: "publisher", id: input.publisherId };
  return null;
}

export function isPersistedSingleMetadataReloadFor(
  target: SingleMetadataReloadTarget | null,
): boolean {
  if (!target) return false;
  const persisted = readPersistedActivity();
  if (persisted?.job?.kind !== "single-metadata") return false;
  return persisted.job.target === target.target && persisted.job.id === target.id;
}

let singleReloadAbortController: AbortController | null = null;
let singleReloadCancelRequested = false;

export function beginSingleMetadataReloadRun(): AbortSignal {
  singleReloadCancelRequested = false;
  singleReloadAbortController?.abort();
  singleReloadAbortController = new AbortController();
  return singleReloadAbortController.signal;
}

export function endSingleMetadataReloadRun(): void {
  singleReloadAbortController = null;
  singleReloadCancelRequested = false;
}

export function getSingleMetadataReloadAbortSignal(): AbortSignal | undefined {
  return singleReloadAbortController?.signal;
}

export function isSingleMetadataReloadCancelRequested(): boolean {
  return singleReloadCancelRequested;
}

export function isSingleMetadataReloadInProgress(): boolean {
  if (singleReloadCancelRequested) return false;
  const persisted = readPersistedActivity();
  return persisted?.job?.kind === "single-metadata";
}

export function cancelSingleMetadataReload(): void {
  singleReloadCancelRequested = true;
  singleReloadAbortController?.abort();
  singleReloadAbortController = null;
  clearPersistedActivity();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mhg:single-metadata-reload-cancelled"));
  }
}
