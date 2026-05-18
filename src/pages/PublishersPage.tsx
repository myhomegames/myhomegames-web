import { useState, useRef, useMemo, useLayoutEffect, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { usePublishers } from "../contexts/PublishersContext";
import { useTitleFilterQuery } from "../contexts/TitleFilterContext";
import { useSkin } from "../contexts/SkinContext";
import CollectionsList from "../components/lists/CollectionsList";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import { compareTitles, filterRootCollectionLikes } from "../utils/stringUtils";
import { titleMatchesFilter } from "../utils/titleFilter";
import type { CollectionItem } from "../types";
import { buildCoverUrl } from "../utils/api";

type PublishersPageProps = {
  onPlay?: (game: import("../types").GameItem) => void;
  coverSize: number;
};

export default function PublishersPage({ onPlay, coverSize }: PublishersPageProps) {
  const { setLoading } = useLoading();
  const { publishers, isLoading: publishersLoading, updatePublisher } = usePublishers();
  const titleFilterQuery = useTitleFilterQuery();
  const { activeSkinWeb } = useSkin();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [sortAscending] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    setLoading(publishersLoading || !isReady);
  }, [publishersLoading, isReady, setLoading]);

  const fixedFocalCollections = activeSkinWeb.verticalCoverAlignment;
  useScrollRestoration(scrollContainerRef, "publishers", !fixedFocalCollections);

  function handlePublisherClick(publisher: CollectionItem) {
    navigate(`/publishers/${publisher.id}`);
  }

  const sortedPublishers = useMemo(() => {
    const unique = publishers.filter((p, i, self) =>
      i === self.findIndex((x) => String(x.id) === String(p.id))
    );
    const rootOnly = filterRootCollectionLikes(unique);
    const sorted = [...rootOnly].sort((a, b) =>
      sortAscending ? compareTitles(a.title || "", b.title || "") : -compareTitles(a.title || "", b.title || "")
    );
    return sorted.filter((p) => titleMatchesFilter(p.title, titleFilterQuery));
  }, [publishers, sortAscending, titleFilterQuery]);

  const allPublishersForCount = useMemo(() => {
    return publishers.filter((p, i, self) =>
      i === self.findIndex((x) => String(x.id) === String(p.id))
    );
  }, [publishers]);

  useLayoutEffect(() => {
    if (publishersLoading) setIsReady(false);
    else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsReady(true));
      });
    }
  }, [publishersLoading, sortedPublishers.length]);

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
  }, [fixedFocalCollections, isReady, sortedPublishers.length]);

  return (
    <main className="flex-1 home-page-content">
      <div className="home-page-layout">
        <div className={`home-page-content-wrapper home-page-fade-in${isReady ? " home-page-fade-in--ready" : ""}`}>
          <div ref={scrollContainerRef} className="home-page-scroll-container">
            <CollectionsList
              collections={sortedPublishers}
              allItemsForCount={allPublishersForCount}
              onCollectionClick={handlePublisherClick}
              onPlay={onPlay}
              isLoading={publishersLoading}
              showEdit={true}
              gamesPath="publishers"
              onCollectionUpdate={(updated) => updatePublisher({ ...updated, gameCount: publishers.find((p) => String(p.id) === String(updated.id))?.gameCount })}
              buildCoverUrl={buildCoverUrl}
              coverSize={coverSize}
              itemRefs={itemRefs}
              scrollContainerRef={scrollContainerRef}
            />
          </div>
        </div>
        {isReady && !activeSkinWeb.disableAlphabetNavigator && !activeSkinWeb.verticalCoverAlignment && (
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
