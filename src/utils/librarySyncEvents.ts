export type DeferredLibraryRefreshOptions = {
  /** Collection ids whose membership may have changed on the server. */
  collectionIds?: Array<string | number>;
  refreshDevelopers?: boolean;
  refreshPublishers?: boolean;
  refreshTags?: boolean;
  refreshRecommended?: boolean;
  /** Delays (ms) before dispatching refresh events; default [100, 500] for async server cleanup. */
  delaysMs?: number[];
};

function dispatchDeferredLibraryRefresh(options: DeferredLibraryRefreshOptions = {}) {
  const {
    collectionIds = [],
    refreshDevelopers = false,
    refreshPublishers = false,
    refreshTags = false,
    refreshRecommended = false,
  } = options;

  for (const collectionId of collectionIds) {
    window.dispatchEvent(
      new CustomEvent("collectionUpdated", {
        detail: { collectionId: String(collectionId) },
      }),
    );
  }

  if (refreshDevelopers) {
    window.dispatchEvent(new CustomEvent("developerUpdated", { detail: {} }));
  }
  if (refreshPublishers) {
    window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: {} }));
  }
  if (refreshTags) {
    window.dispatchEvent(new CustomEvent("tagListUpdated"));
  }
  if (refreshRecommended) {
    window.dispatchEvent(new CustomEvent("recommendedUpdated"));
  }
}

/**
 * Notify UI contexts after server-side background work (orphan prune, recommended rebuild, etc.).
 * Dispatches twice by default so slow disk cleanup is still reflected without a page reload.
 */
export function scheduleDeferredLibraryRefresh(options: DeferredLibraryRefreshOptions = {}) {
  const delays = options.delaysMs ?? [100, 500];
  for (const delayMs of delays) {
    window.setTimeout(() => dispatchDeferredLibraryRefresh(options), delayMs);
  }
}

/** After DELETE /games/:id — refresh collections, tags, companies, recommended. */
export function schedulePostGameDeleteLibraryRefresh(collectionIds: Array<string | number> = []) {
  scheduleDeferredLibraryRefresh({
    collectionIds,
    refreshDevelopers: true,
    refreshPublishers: true,
    refreshTags: true,
    refreshRecommended: true,
  });
}

/** After POST /catalog/import-game or /games/create — recommended sections may rebuild async. */
export function schedulePostGameImportLibraryRefresh() {
  scheduleDeferredLibraryRefresh({
    refreshRecommended: true,
    refreshTags: true,
    refreshDevelopers: true,
    refreshPublishers: true,
    delaysMs: [150, 600, 1200],
  });
}

/** After async company profile merge from IGDB. */
export function schedulePostCompanyProfileSyncRefresh() {
  scheduleDeferredLibraryRefresh({
    refreshDevelopers: true,
    refreshPublishers: true,
    delaysMs: [50, 300],
  });
}
