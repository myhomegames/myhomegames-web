import type { ActivityProgressPhase } from "../contexts/LoadingContext";
import {
  clearPersistedActivity,
  getSingleMetadataReloadAbortSignal,
  isSingleMetadataReloadCancelRequested,
  readPersistedActivity,
} from "./activitySession";

export type BulkMetadataReloadProgress = {
  completedSteps: number;
  totalSteps: number;
  phase: ActivityProgressPhase;
  percent: number;
};

export class BulkMetadataReloadAbortedError extends Error {
  constructor() {
    super("Bulk metadata reload cancelled");
    this.name = "BulkMetadataReloadAbortedError";
  }
}

let activeProgress: BulkMetadataReloadProgress | null = null;
let bulkReloadRunning = false;
let bulkReloadCancelRequested = false;
let bulkReloadAbortController: AbortController | null = null;
let bulkReloadRunId = 0;

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

export function getBulkMetadataReloadRunId(): number {
  return bulkReloadRunId;
}

export function getBulkMetadataReloadAbortSignal(): AbortSignal | undefined {
  return bulkReloadAbortController?.signal;
}

export function throwIfBulkMetadataReloadAborted(): void {
  if (bulkReloadCancelRequested || bulkReloadAbortController?.signal.aborted) {
    throw new BulkMetadataReloadAbortedError();
  }
}

export function throwIfMetadataReloadAborted(): void {
  throwIfBulkMetadataReloadAborted();
  if (isSingleMetadataReloadCancelRequested() || getSingleMetadataReloadAbortSignal()?.aborted) {
    throw new BulkMetadataReloadAbortedError();
  }
}

export function isBulkMetadataReloadAbortedError(error: unknown): boolean {
  if (error instanceof BulkMetadataReloadAbortedError) return true;
  if (!(error instanceof DOMException && error.name === "AbortError")) return false;
  return (
    isBulkMetadataReloadCancelRequested() ||
    getBulkMetadataReloadAbortSignal()?.aborted === true ||
    isSingleMetadataReloadCancelRequested() ||
    getSingleMetadataReloadAbortSignal()?.aborted === true
  );
}

export function tryAcquireBulkMetadataReloadLock(): boolean {
  if (bulkReloadRunning) return false;
  bulkReloadRunning = true;
  bulkReloadCancelRequested = false;
  bulkReloadAbortController = new AbortController();
  bulkReloadRunId += 1;
  return true;
}

export function releaseBulkMetadataReloadLock(): void {
  bulkReloadRunning = false;
  bulkReloadAbortController = null;
}

export function isBulkMetadataReloadCancelRequested(): boolean {
  return bulkReloadCancelRequested;
}

export function clearBulkMetadataReloadCancel(): void {
  bulkReloadCancelRequested = false;
}

export function cancelBulkMetadataReload(): void {
  bulkReloadCancelRequested = true;
  bulkReloadAbortController?.abort();
  bulkReloadAbortController = null;
  releaseBulkMetadataReloadLock();
  clearPersistedActivity();
  clearBulkMetadataReloadProgress();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mhg:bulk-metadata-reload-cancelled"));
  }
}

export function setBulkMetadataReloadProgress(progress: BulkMetadataReloadProgress | null): void {
  activeProgress = progress;
}

export function clearBulkMetadataReloadProgressIfRun(runId: number): void {
  if (bulkReloadRunId === runId) {
    activeProgress = null;
  }
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
