import { useState, useRef, useMemo, useLayoutEffect, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useDevelopers } from "../contexts/DevelopersContext";
import CollectionsList from "../components/lists/CollectionsList";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import { compareTitles } from "../utils/stringUtils";
import type { CollectionItem } from "../types";
import { buildCoverUrl } from "../utils/api";

type DevelopersPageProps = {
  coverSize: number;
};

export default function DevelopersPage({ coverSize }: DevelopersPageProps) {
  const { setLoading } = useLoading();
  const { developers, isLoading: developersLoading, updateDeveloper } = useDevelopers();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [sortAscending] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    setLoading(developersLoading || !isReady);
  }, [developersLoading, isReady, setLoading]);

  useScrollRestoration(scrollContainerRef);

  function handleDeveloperClick(developer: CollectionItem) {
    navigate(`/developers/${developer.id}`);
  }

  const sortedDevelopers = useMemo(() => {
    const unique = developers.filter((d, i, self) =>
      i === self.findIndex((x) => String(x.id) === String(d.id))
    );
    return [...unique].sort((a, b) =>
      sortAscending ? compareTitles(a.title || "", b.title || "") : -compareTitles(a.title || "", b.title || "")
    );
  }, [developers, sortAscending]);

  useLayoutEffect(() => {
    if (developersLoading) setIsReady(false);
    else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsReady(true));
      });
    }
  }, [developersLoading, sortedDevelopers.length]);

  return (
    <main className="flex-1 home-page-content">
      <div className="home-page-layout">
        <div
          className="home-page-content-wrapper"
          style={{ opacity: isReady ? 1 : 0, transition: "opacity 0.2s ease-in-out" }}
        >
          <div ref={scrollContainerRef} className="home-page-scroll-container">
            <CollectionsList
              collections={sortedDevelopers}
              onCollectionClick={handleDeveloperClick}
              isLoading={developersLoading}
              showEdit={true}
              gamesPath="developers"
                onCollectionUpdate={(updated) => updateDeveloper({ ...updated, gameCount: developers.find((d) => String(d.id) === String(updated.id))?.gameCount })}
                buildCoverUrl={buildCoverUrl}
                coverSize={coverSize}
                itemRefs={itemRefs}
                scrollContainerRef={scrollContainerRef}
            />
          </div>
        </div>
        {isReady && (
          <AlphabetNavigator
            games={sortedDevelopers as any}
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
