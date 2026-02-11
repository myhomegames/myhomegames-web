import { useState, useRef, useMemo, useLayoutEffect, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useCollections } from "../contexts/CollectionsContext";
import CollectionsList from "../components/lists/CollectionsList";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import { compareTitles } from "../utils/stringUtils";
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
  useScrollRestoration(scrollContainerRef);

  function handleCollectionClick(collection: CollectionItem) {
    navigate(`/collections/${collection.id}`);
  }

  const handleCollectionUpdate = (updated: CollectionItem) => {
    // Preserve gameCount and spread all properties from updated (like DevelopersPage)
    updateCollection({ ...updated, gameCount: collections.find((c) => String(c.id) === String(updated.id))?.gameCount });
  };

  const handleCollectionDelete = (deletedCollection: CollectionItem) => {
    // Remove via context
    removeCollection(deletedCollection.id);
  };

  // Sort collections and remove duplicates by ID
  const sortedCollections = useMemo(() => {
    // Remove duplicates by ID (keep first occurrence)
    const uniqueCollections = collections.filter((collection, index, self) =>
      index === self.findIndex((c) => String(c.id) === String(collection.id))
    );
    
    const sorted = [...uniqueCollections];
    sorted.sort((a, b) => {
      const compareResult = compareTitles(a.title || "", b.title || "");
      return sortAscending ? compareResult : -compareResult;
    });
    return sorted;
  }, [collections, sortAscending]);

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
          {!collectionsLoading && (
            <CollectionsList
              collections={sortedCollections}
              onCollectionClick={handleCollectionClick}
              onPlay={onPlay as any}
              onCollectionUpdate={handleCollectionUpdate}
              onCollectionDelete={handleCollectionDelete}
              buildCoverUrl={buildCoverUrl}
              coverSize={coverSize}
              itemRefs={itemRefs}
              scrollContainerRef={scrollContainerRef}
            />
          )}
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

