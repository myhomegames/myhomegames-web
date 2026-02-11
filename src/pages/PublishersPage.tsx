import { useState, useRef, useMemo, useLayoutEffect, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { usePublishers } from "../contexts/PublishersContext";
import CollectionsList from "../components/lists/CollectionsList";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import { compareTitles } from "../utils/stringUtils";
import type { CollectionItem } from "../types";
import { buildCoverUrl } from "../utils/api";

type PublishersPageProps = {
  coverSize: number;
};

export default function PublishersPage({ coverSize }: PublishersPageProps) {
  const { setLoading } = useLoading();
  const { publishers, isLoading: publishersLoading, updatePublisher } = usePublishers();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [sortAscending] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    setLoading(publishersLoading || !isReady);
  }, [publishersLoading, isReady, setLoading]);

  useScrollRestoration(scrollContainerRef);

  function handlePublisherClick(publisher: CollectionItem) {
    navigate(`/publishers/${publisher.id}`);
  }

  const sortedPublishers = useMemo(() => {
    const unique = publishers.filter((p, i, self) =>
      i === self.findIndex((x) => String(x.id) === String(p.id))
    );
    return [...unique].sort((a, b) =>
      sortAscending ? compareTitles(a.title || "", b.title || "") : -compareTitles(a.title || "", b.title || "")
    );
  }, [publishers, sortAscending]);

  useLayoutEffect(() => {
    if (publishersLoading) setIsReady(false);
    else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsReady(true));
      });
    }
  }, [publishersLoading, sortedPublishers.length]);

  return (
    <main className="flex-1 home-page-content">
      <div className="home-page-layout">
        <div
          className="home-page-content-wrapper"
          style={{ opacity: isReady ? 1 : 0, transition: "opacity 0.2s ease-in-out" }}
        >
          <div ref={scrollContainerRef} className="home-page-scroll-container">
            {!publishersLoading && (
              <CollectionsList
                collections={sortedPublishers}
                onCollectionClick={handlePublisherClick}
                showEdit={true}
                gamesPath="publishers"
                onCollectionUpdate={(updated) => updatePublisher({ ...updated, gameCount: publishers.find((p) => String(p.id) === String(updated.id))?.gameCount })}
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
            games={sortedPublishers as any}
            scrollContainerRef={scrollContainerRef}
            itemRefs={itemRefs}
            ascending={sortAscending}
            virtualizedGridRef={(scrollContainerRef.current as any)?.__virtualizedGridRef}
            viewMode="grid"
            coverSize={coverSize}
          />
        )}
      </div>
    </main>
  );
}
