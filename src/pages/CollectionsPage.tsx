import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useAuth } from "../contexts/AuthContext";
import CollectionsList from "../components/lists/CollectionsList";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import { compareTitles } from "../utils/stringUtils";
import type { CollectionItem } from "../types";
import { API_BASE, getApiToken } from "../config";
import { buildApiUrl, buildCoverUrl } from "../utils/api";

type CollectionsPageProps = {
  onPlay?: (game: any) => void;
  coverSize: number;
};

export default function CollectionsPage({
  onPlay,
  coverSize,
}: CollectionsPageProps) {
  const { setLoading, isLoading } = useLoading();
  const { isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [sortAscending] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  // Restore scroll position
  useScrollRestoration(scrollContainerRef);

  useEffect(() => {
    // Wait for authentication to complete before making API requests
    if (authLoading) {
      return;
    }
    fetchCollections();
  }, [authLoading]);

  // Listen for metadata reload event
  useEffect(() => {
    const handleMetadataReloaded = () => {
      fetchCollections();
    };
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    return () => {
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
    };
  }, []);

  // Hide content until fully rendered
  useLayoutEffect(() => {
    if (!isLoading && collections.length > 0) {
      // Wait for next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    } else if (isLoading) {
      setIsReady(false);
    }
  }, [isLoading, collections.length]);


  async function fetchCollections() {
    setLoading(true);
    try {
      const apiToken = getApiToken();
      const url = buildApiUrl(API_BASE, "/collections");
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Auth-Token": apiToken,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.collections || []) as any[];
      const parsed = items.map((v) => ({
        id: v.id,
        title: v.title,
        summary: v.summary,
        cover: v.cover,
        background: v.background,
        gameCount: v.gameCount,
      }));
      setCollections(parsed);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      console.error("Error fetching collections:", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleCollectionClick(collection: CollectionItem) {
    navigate(`/collections/${collection.id}`);
  }

  const handleCollectionUpdate = (updatedCollection: CollectionItem) => {
    setCollections((prevCollections) =>
      prevCollections.map((collection) =>
        String(collection.id) === String(updatedCollection.id) ? updatedCollection : collection
      )
    );
    // Dispatch event to notify other components (though EditCollectionModal should already dispatch it)
    window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collection: updatedCollection } }));
  };

  const handleCollectionDelete = (deletedCollection: CollectionItem) => {
    setCollections((prevCollections) =>
      prevCollections.filter((collection) =>
        collection.id !== deletedCollection.id
      )
    );
  };

  // Sort collections
  const sortedCollections = useMemo(() => {
    const sorted = [...collections];
    sorted.sort((a, b) => {
      const compareResult = compareTitles(a.title || "", b.title || "");
      return sortAscending ? compareResult : -compareResult;
    });
    return sorted;
  }, [collections, sortAscending]);


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
          {!isLoading && (
            <CollectionsList
              collections={sortedCollections}
              onCollectionClick={handleCollectionClick}
              onPlay={onPlay as any}
              onCollectionUpdate={handleCollectionUpdate}
              onCollectionDelete={handleCollectionDelete}
              buildCoverUrl={buildCoverUrl}
              coverSize={coverSize}
              itemRefs={itemRefs}
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
        />
      )}
      </div>
    </main>
  );
}

