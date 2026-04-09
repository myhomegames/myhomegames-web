import { useState, useRef, useMemo, useLayoutEffect, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useCollections } from "../contexts/CollectionsContext";
import CollectionsList from "../components/lists/CollectionsList";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import { compareTitles, filterRootCollectionLikes } from "../utils/stringUtils";
import type { CollectionItem } from "../types";
import { buildCoverUrl } from "../utils/api";

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
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [sortAscending] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  // Sync collections loading state and rendering state with global loading context
  useEffect(() => {
    setLoading(collectionsLoading || !isReady);
  }, [collectionsLoading, isReady, setLoading]);
  
  // Restore scroll position
  useScrollRestoration(scrollContainerRef, "collections");

  function handleCollectionClick(collection: CollectionItem) {
    navigate(`/collections/${collection.id}`);
  }

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
    return sorted;
  }, [collections, sortAscending]);

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
    } else if (collectionsLoading) {
      setIsReady(false);
    }
  }, [collectionsLoading, sortedCollections.length]);


  return (
    <main className="flex-1 home-page-content">
      <div className="home-page-layout">
      <div 
        className="home-page-content-wrapper"
        style={{
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
        }}
      >
        <div
          ref={scrollContainerRef}
          className="home-page-scroll-container"
        >
          <CollectionsList
            collections={sortedCollections}
            allItemsForCount={allCollectionsForCount}
            onCollectionClick={handleCollectionClick}
            onPlay={onPlay as any}
            isLoading={collectionsLoading}
            onCollectionUpdate={handleCollectionUpdate}
            onCollectionDelete={handleCollectionDelete}
            buildCoverUrl={buildCoverUrl}
            coverSize={coverSize}
            itemRefs={itemRefs}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      </div>

      {isReady && (
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
  );
}

