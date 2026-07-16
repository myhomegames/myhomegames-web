import { useEffect, useRef } from "react";

import type { ActivityProgress } from "../contexts/LoadingContext";
import {
  readPersistedActivity,
  updatePersistedBulkCheckpoint,
  updatePersistedProgress,
  beginSingleMetadataReloadRun,
  buildSingleMetadataReloadProgress,
  endSingleMetadataReloadRun,
} from "../utils/activitySession";
import type { PersistedBulkMetadataJob } from "../utils/activitySession";
import {
  clearBulkMetadataReloadCancel,
  isBulkMetadataReloadAbortedError,
  isBulkMetadataReloadCancelRequested,
  releaseBulkMetadataReloadLock,
  tryAcquireBulkMetadataReloadLock,
} from "../utils/bulkMetadataReloadContext";
import {
  reloadAllMetadataItems,
  reloadCollectionMetadataItem,
  reloadDeveloperMetadataItem,
  reloadGameMetadataItem,
  reloadPublisherMetadataItem,
} from "../utils/metadataReload";

type UseResumeActivityJobOptions = {
  authLoading: boolean;
  setActivityBusy: (busy: boolean) => void;
  setActivityProgress: (progress: ActivityProgress | null) => void;
  refreshLibraryGames: () => Promise<void>;
  refreshCollections: () => Promise<void>;
  refreshDevelopers: () => Promise<void>;
  refreshPublishers: () => Promise<void>;
};

export function useResumeActivityJob({
  authLoading,
  setActivityBusy,
  setActivityProgress,
  refreshLibraryGames,
  refreshCollections,
  refreshDevelopers,
  refreshPublishers,
}: UseResumeActivityJobOptions): void {
  const startedRef = useRef(false);

  useEffect(() => {
    if (authLoading || startedRef.current) return;

    const persisted = readPersistedActivity();
    if (!persisted?.job) return;

    startedRef.current = true;
    setActivityBusy(true);
    if (persisted.progress) {
      setActivityProgress(persisted.progress);
    }

    void (async () => {
      try {
        const { job } = persisted;

        if (job.kind === "bulk-metadata") {
          if (!tryAcquireBulkMetadataReloadLock()) {
            return;
          }

          try {
            if (job.completedSteps >= job.totalSteps) {
              await Promise.all([
                refreshLibraryGames(),
                refreshCollections(),
                refreshDevelopers(),
                refreshPublishers(),
              ]);
              window.dispatchEvent(new CustomEvent("metadataReloaded"));
              return;
            }

            const legacyJob = job as PersistedBulkMetadataJob & {
              gameIds?: string[];
              collectionIds?: string[];
            };
            const games =
              legacyJob.games ??
              (legacyJob.gameIds ?? []).map((id) => ({ id: String(id) }));
            const collections =
              legacyJob.collections ??
              (legacyJob.collectionIds ?? []).map((id) => ({ id: String(id) }));

            const outcome = await reloadAllMetadataItems({
              catalogSearchEnabled: job.catalogSearchEnabled,
              games,
              developers: job.developers,
              publishers: job.publishers,
              collections,
              startAtCompletedSteps: job.completedSteps,
              onProgress: (progress) => {
                if (isBulkMetadataReloadCancelRequested()) return;
                setActivityProgress(progress);
                updatePersistedProgress(progress);
              },
              onCheckpoint: (checkpoint) => {
                if (isBulkMetadataReloadCancelRequested()) return;
                const { completedSteps, ...progress } = checkpoint;
                updatePersistedBulkCheckpoint(completedSteps, progress);
              },
            });

            if (outcome === "completed" || outcome === "partial") {
              await Promise.all([
                refreshLibraryGames(),
                refreshCollections(),
                refreshDevelopers(),
                refreshPublishers(),
              ]);
              window.dispatchEvent(new CustomEvent("metadataReloaded"));
              if (outcome === "partial") {
                console.warn("Bulk metadata reload completed with skipped items (see console warnings).");
              }
            }
          } finally {
            releaseBulkMetadataReloadLock();
          }
          return;
        }

        const phase = job.target;
        const singleProgress = buildSingleMetadataReloadProgress(phase, 25, job.title, job.id);
        setActivityProgress(singleProgress);
        updatePersistedProgress(singleProgress);

        beginSingleMetadataReloadRun();
        try {
          if (job.target === "game") {
            await reloadGameMetadataItem(job.id, job.catalogSearchEnabled);
            await refreshLibraryGames();
          } else if (job.target === "collection") {
            await reloadCollectionMetadataItem(job.id);
            await refreshCollections();
          } else if (job.target === "developer") {
            await reloadDeveloperMetadataItem(job.id, job.title, job.catalogSearchEnabled);
            await refreshDevelopers();
          } else if (job.target === "publisher") {
            await reloadPublisherMetadataItem(job.id, job.title, job.catalogSearchEnabled);
            await refreshPublishers();
          }

          const completedProgress = buildSingleMetadataReloadProgress(phase, 100, job.title, job.id);
          setActivityProgress(completedProgress);
          updatePersistedProgress(completedProgress);
        } catch (error) {
          if (!isBulkMetadataReloadAbortedError(error)) {
            console.error("Failed to resume activity job after reload:", error);
          }
        } finally {
          endSingleMetadataReloadRun();
        }
      } catch (error) {
        console.error("Failed to resume activity job after reload:", error);
      } finally {
        setActivityBusy(false);
        setActivityProgress(null);
        clearBulkMetadataReloadCancel();
      }
    })();
  }, [
    authLoading,
    refreshCollections,
    refreshDevelopers,
    refreshLibraryGames,
    refreshPublishers,
    setActivityBusy,
    setActivityProgress,
  ]);
}
