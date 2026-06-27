import type { ActivityProgress, ActivityProgressPhase } from "../contexts/LoadingContext";

export const ACTIVITY_SESSION_KEY = "mhg:activity";

export type PersistedBulkMetadataJob = {
  kind: "bulk-metadata";
  catalogSearchEnabled: boolean;
  gameIds: string[];
  developers: Array<{ id: string; title?: string }>;
  publishers: Array<{ id: string; title?: string }>;
  collectionIds: string[];
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
  gameIds: string[];
  developers: Array<{ id: string; title?: string }>;
  publishers: Array<{ id: string; title?: string }>;
  collectionIds: string[];
}): number {
  const totalSteps =
    input.developers.length +
    input.publishers.length +
    input.gameIds.length +
    input.collectionIds.length +
    1;

  writeRaw({
    progress: { phase: "developers", percent: 0 },
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
    progress: { phase: input.target, percent: 0 },
    job: input,
  });
}
