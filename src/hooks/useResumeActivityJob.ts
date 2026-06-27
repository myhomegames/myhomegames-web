import { useEffect, useRef } from "react";

import type { ActivityProgress } from "../contexts/LoadingContext";
import {
  clearPersistedActivity,
  readPersistedActivity,
  updatePersistedBulkCheckpoint,
  updatePersistedProgress,
} from "../utils/activitySession";
import {
  clearBulkMetadataReloadCancel,
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

            const outcome = await reloadAllMetadataItems({
              catalogSearchEnabled: job.catalogSearchEnabled,
              gameIds: job.gameIds,
              developers: job.developers,
              publishers: job.publishers,
              collectionIds: job.collectionIds,
              startAtCompletedSteps: job.completedSteps,
              onProgress: (progress) => {
                if (isBulkMetadataReloadCancelRequested()) return;
                setActivityProgress(progress);
                updatePersistedProgress(progress);
              },
              onCheckpoint: ({ completedSteps, phase, percent }) => {
                if (isBulkMetadataReloadCancelRequested()) return;
                updatePersistedBulkCheckpoint(completedSteps, { phase, percent });
              },
            });

            if (outcome === "completed") {
              await Promise.all([
                refreshLibraryGames(),
                refreshCollections(),
                refreshDevelopers(),
                refreshPublishers(),
              ]);
              window.dispatchEvent(new CustomEvent("metadataReloaded"));
            }
          } finally {
            releaseBulkMetadataReloadLock();
          }
          return;
        }

        const phase = job.target;
        setActivityProgress({ phase, percent: 25 });
        updatePersistedProgress({ phase, percent: 25 });

        if (job.target === "game") {
          await reloadGameMetadataItem(job.id, job.catalogSearchEnabled);
          await refreshLibraryGames();
        } else if (job.target === "collection") {
          await reloadCollectionMetadataItem(job.id);
          await refreshCollections();
        } else if (job.target === "developer") {
          await reloadDeveloperMetadataItem(job.id, undefined, job.catalogSearchEnabled);
          await refreshDevelopers();
        } else if (job.target === "publisher") {
          await reloadPublisherMetadataItem(job.id, undefined, job.catalogSearchEnabled);
          await refreshPublishers();
        }

        setActivityProgress({ phase, percent: 100 });
      } catch (error) {
        console.error("Failed to resume activity job after reload:", error);
      } finally {
        clearPersistedActivity();
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
