import { useState, useRef, useMemo, useLayoutEffect, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useCollections } from "../contexts/CollectionsContext";
import { useTitleFilterQuery } from "../contexts/TitleFilterContext";
import { useSkin } from "../contexts/SkinContext";
import CollectionsList from "../components/lists/CollectionsList";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import { compareTitles, filterRootCollectionLikes } from "../utils/stringUtils";
import { titleMatchesFilter } from "../utils/titleFilter";
import type { CollectionItem } from "../types";
import { buildCoverUrl } from "../utils/api";
import FocalSelectionBackgroundShell, {
  type FocalSelectionMedia,
} from "../components/common/FocalSelectionBackgroundShell";
import {
  buildCollectionIndexPeekSnapshot,
  captureIndexListLayoutAnchor,
  clearContextRailReturnSession,
  navigateWithContextRailPeek,
  resolveContextRailReturnPeek,
  resolveSnapshotSelectedIndex,
} from "../utils/contextRailIndexPeek";
import { useActivationLockUntilPointerMove } from "../hooks/useActivationLockUntilPointerMove";
import { isContextRailActivationLocked } from "../utils/contextRailActivationLock";

type CollectionsPageProps = {
  onPlay?: (game: any) => void;
  coverSize: number;
};

export default function CollectionsPage({
  onPlay,
  coverSize,
}: CollectionsPageProps) {
  const { setLoading } = useLoading();
  const { collections, isLoading: collectionsLoading, updateCollection, removeCollection } = useCollections();
  const titleFilterQuery = useTitleFilterQuery();
  const { activeSkinWeb } = useSkin();
  const navigate = useNavigate();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  const [sortAscending] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  // Sync collections loading state and rendering state with global loading context
  useEffect(() => {
    setLoading(collectionsLoading || !isReady);
  }, [collectionsLoading, isReady, setLoading]);
  
  // Restore scroll position
  const fixedFocalCollections = activeSkinWeb.verticalCoverAlignment;
  const focalBackgroundEnabled =
    activeSkinWeb.autoShowBackgroundOnSelection && fixedFocalCollections;
  const [focalSelection, setFocalSelection] = useState<FocalSelectionMedia | null>(null);
  const handleFocalSelectionChange = useCallback((collection: CollectionItem | null) => {
    if (!collection) {
      setFocalSelection(null);
      return;
    }
    setFocalSelection({
      id: String(collection.id),
      background: collection.background,
    });
  }, []);
  useScrollRestoration(scrollContainerRef, "collections", !fixedFocalCollections);

  const handleCollectionUpdate = (updatedCollection: CollectionItem) => {
    // Update via context (which will also dispatch the event)
    updateCollection(updatedCollection);
  };

  const handleCollectionDelete = (deletedCollection: CollectionItem) => {
    // Remove via context
    removeCollection(deletedCollection.id);
  };

  // Sort collections and remove duplicates by ID; show only root items (no sub-collections)
  const sortedCollections = useMemo(() => {
    const uniqueCollections = collections.filter((collection, index, self) =>
      index === self.findIndex((c) => String(c.id) === String(collection.id))
    );
    const rootOnly = filterRootCollectionLikes(uniqueCollections);
    const sorted = [...rootOnly];
    sorted.sort((a, b) => {
      const compareResult = compareTitles(a.title || "", b.title || "");
      return sortAscending ? compareResult : -compareResult;
    });
    return sorted.filter((c) => titleMatchesFilter(c.title, titleFilterQuery));
  }, [collections, sortAscending, titleFilterQuery]);

  const contextRailPeekEnabled =
    fixedFocalCollections && activeSkinWeb.compactCollectionLikeDetail;

  const handleCollectionActivate = useCallback(
    (collection: CollectionItem, index: number) => {
      if (isContextRailActivationLocked()) return;
      const path = `/collections/${collection.id}`;
      if (contextRailPeekEnabled) {
        navigateWithContextRailPeek(
          navigate,
          path,
          buildCollectionIndexPeekSnapshot(
            sortedCollections,
            index,
            coverSize,
            "collections",
            captureIndexListLayoutAnchor(scrollContainerRef.current),
          ),
          "collections",
        );
        return;
      }
      navigate(path);
    },
    [contextRailPeekEnabled, sortedCollections, navigate, coverSize],
  );

  const contextRailReturnPeek = useMemo(() => {
    if (!contextRailPeekEnabled) return null;
    return resolveContextRailReturnPeek("collections", location.state);
  }, [contextRailPeekEnabled, location.state]);

  const contextRailMotionReturn = contextRailReturnPeek != null;
  const activationLocked = useActivationLockUntilPointerMove(contextRailMotionReturn);

  const restoreSelectedIndex = useMemo(() => {
    if (!contextRailReturnPeek || sortedCollections.length === 0) return undefined;
    return resolveSnapshotSelectedIndex(sortedCollections, contextRailReturnPeek);
  }, [contextRailReturnPeek, sortedCollections]);

  useEffect(() => {
    if (contextRailReturnPeek) {
      clearContextRailReturnSession();
    }
  }, [contextRailReturnPeek]);

  function handleCollectionClick(collection: CollectionItem) {
    const index = sortedCollections.findIndex(
      (entry) => String(entry.id) === String(collection.id),
    );
    handleCollectionActivate(collection, index >= 0 ? index : 0);
  }

  const allCollectionsForCount = useMemo(() => {
    return collections.filter((collection, index, self) =>
      index === self.findIndex((c) => String(c.id) === String(collection.id))
    );
  }, [collections]);

  // Hide content until fully rendered
  useLayoutEffect(() => {
    if (!collectionsLoading) {
      // Wait for next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    } else if (collectionsLoading && sortedCollections.length === 0) {
      setIsReady(false);
    }
  }, [collectionsLoading, sortedCollections.length]);

  useEffect(() => {
    if (!fixedFocalCollections) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const pinOuterScroll = () => {
      if (el.scrollTop !== 0) el.scrollTop = 0;
    };
    pinOuterScroll();
    el.addEventListener("scroll", pinOuterScroll, { passive: true });
    return () => el.removeEventListener("scroll", pinOuterScroll);
  }, [fixedFocalCollections, isReady, sortedCollections.length]);

  return (
    <FocalSelectionBackgroundShell
      enabled={focalBackgroundEnabled}
      selection={focalSelection}
    >
    <main className="flex-1 home-page-content">
      <div className="home-page-layout">
      <div
        className={`home-page-content-wrapper home-page-fade-in${isReady ? " home-page-fade-in--ready" : ""}${contextRailMotionReturn ? " mhg-context-rail-motion-return" : ""}`}
      >
        <div
          ref={scrollContainerRef}
          className="home-page-scroll-container"
        >
          <CollectionsList
            collections={sortedCollections}
            allItemsForCount={allCollectionsForCount}
            onCollectionClick={handleCollectionClick}
            onCollectionActivate={contextRailPeekEnabled ? handleCollectionActivate : undefined}
            onPlay={onPlay as any}
            isLoading={collectionsLoading}
            onCollectionUpdate={handleCollectionUpdate}
            onCollectionDelete={handleCollectionDelete}
            buildCoverUrl={buildCoverUrl}
            coverSize={coverSize}
            itemRefs={itemRefs}
            scrollContainerRef={scrollContainerRef}
            onFocalSelectionChange={
              focalBackgroundEnabled ? handleFocalSelectionChange : undefined
            }
            restoreSelectedIndex={restoreSelectedIndex}
            activationLocked={activationLocked}
          />
        </div>
      </div>

      {isReady && !activeSkinWeb.disableAlphabetNavigator && !activeSkinWeb.verticalCoverAlignment && (
        <AlphabetNavigator
          games={sortedCollections as any}
          scrollContainerRef={scrollContainerRef}
          itemRefs={itemRefs}
          ascending={sortAscending}
          virtualizedGridRef={
            scrollContainerRef.current
              ? (scrollContainerRef.current as any).__virtualizedGridRef
              : undefined
          }
          viewMode="grid"
          coverSize={coverSize}
        />
      )}
      </div>
    </main>
    </FocalSelectionBackgroundShell>
  );
}

