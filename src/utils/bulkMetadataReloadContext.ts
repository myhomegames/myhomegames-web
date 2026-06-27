import type { ActivityProgressPhase } from "../contexts/LoadingContext";
import { clearPersistedActivity, readPersistedActivity } from "./activitySession";

export type BulkMetadataReloadProgress = {
  completedSteps: number;
  totalSteps: number;
  phase: ActivityProgressPhase;
  percent: number;
};

let activeProgress: BulkMetadataReloadProgress | null = null;
let bulkReloadRunning = false;
let bulkReloadCancelRequested = false;

export function isBulkMetadataReloadRunning(): boolean {
  return bulkReloadRunning;
}

/** True while bulk reload is active, including after refresh before resume. */
export function isBulkMetadataReloadInProgress(): boolean {
  if (bulkReloadCancelRequested) return false;
  if (bulkReloadRunning) return true;
  const persisted = readPersistedActivity();
  return persisted?.job?.kind === "bulk-metadata";
}

export function tryAcquireBulkMetadataReloadLock(): boolean {
  if (bulkReloadRunning) return false;
  bulkReloadRunning = true;
  return true;
}

export function releaseBulkMetadataReloadLock(): void {
  bulkReloadRunning = false;
}

export function isBulkMetadataReloadCancelRequested(): boolean {
  return bulkReloadCancelRequested;
}

export function clearBulkMetadataReloadCancel(): void {
  bulkReloadCancelRequested = false;
}

export function cancelBulkMetadataReload(): void {
  bulkReloadCancelRequested = true;
  clearPersistedActivity();
  clearBulkMetadataReloadProgress();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mhg:bulk-metadata-reload-cancelled"));
  }
}

export function setBulkMetadataReloadProgress(progress: BulkMetadataReloadProgress | null): void {
  activeProgress = progress;
}

export function clearBulkMetadataReloadProgress(): void {
  activeProgress = null;
}

export function getBulkMetadataReloadProgress(): BulkMetadataReloadProgress | null {
  return activeProgress;
}

export function bulkMetadataReloadRequestHeaders(): Record<string, string> {
  if (!activeProgress) return {};

  const { completedSteps, totalSteps, phase, percent } = activeProgress;
  return {
    "X-MHG-Bulk-Metadata-Step": String(completedSteps),
    "X-MHG-Bulk-Metadata-Total": String(totalSteps),
    "X-MHG-Bulk-Metadata-Phase": phase,
    "X-MHG-Bulk-Metadata-Percent": String(percent),
  };
}
