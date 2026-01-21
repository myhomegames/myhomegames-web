import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import RecommendedSection from "../components/recommended/RecommendedSection";
import type { GameItem, CollectionItem } from "../types";
import { API_BASE } from "../config";
import { buildApiUrl, buildApiHeaders } from "../utils/api";

type RecommendedSection = {
  id: string;
  games: GameItem[];
};

type RecommendedPageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  coverSize: number;
  allCollections?: CollectionItem[];
};

export default function RecommendedPage({
  onGameClick,
  onGamesLoaded,
  onPlay,
  coverSize,
  allCollections = [],
}: RecommendedPageProps) {
  const { setLoading } = useLoading();
  const [sections, setSections] = useState<RecommendedSection[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef<boolean>(false);
  
  // Restore scroll position
  useScrollRestoration(scrollContainerRef);

  const handleGameUpdate = (updatedGame: GameItem) => {
    setSections((prevSections) =>
      prevSections.map((section) => ({
        ...section,
        games: section.games.map((game) =>
          String(game.id) === String(updatedGame.id) ? updatedGame : game
        ),
      }))
    );
    // Dispatch event to ensure other components are notified
    // (though EditGameModal should already dispatch it)
    window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
  };

  // Listen for game events to update sections
  useEffect(() => {
    const handleGameUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ game: GameItem }>;
      const updatedGame = customEvent.detail?.game;
      if (updatedGame) {
        setSections((prevSections) =>
          prevSections.map((section) => ({
            ...section,
            games: section.games.map((game) =>
              String(game.id) === String(updatedGame.id) ? updatedGame : game
            ),
          }))
        );
      }
    };

    window.addEventListener("gameUpdated", handleGameUpdated as EventListener);
    
    return () => {
      window.removeEventListener("gameUpdated", handleGameUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    fetchRecommendedSections();
  }, []);

  // Listen for metadata reload event
  useEffect(() => {
    const handleMetadataReloaded = () => {
      fetchRecommendedSections();
    };
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    return () => {
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
    };
  }, []);

  // Hide content until fully rendered
  useLayoutEffect(() => {
    if (!isFetching) {
      // Wait for next frame to ensure DOM is ready
      // isReady should be true even if there are no sections
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    } else if (isFetching) {
      setIsReady(false);
    }
  }, [isFetching, sections.length]);

  // Sync rendering state with global loading context
  useEffect(() => {
    setLoading(isFetching || !isReady);
  }, [isFetching, isReady, setLoading]);

  async function fetchRecommendedSections() {
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;
    setIsFetching(true);
    setLoading(true);
    try {
      const url = buildApiUrl(API_BASE, `/recommended`);
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const sectionsData = (json.sections || []) as any[];
      
      const parsedSections = sectionsData.map((section) => ({
        id: section.id,
        games: (section.games || []).map((v: any) => ({
          id: v.id,
          title: v.title,
          summary: v.summary,
          cover: v.cover,
          background: v.background,
          day: v.day,
          month: v.month,
          year: v.year,
          stars: v.stars,
          genre: v.genre,
          executables: v.executables || null,
        })),
      }));
      
      setSections(parsedSections);
      
      // Collect all games for onGamesLoaded callback
      const allGames = parsedSections.flatMap(section => section.games);
      onGamesLoaded(allGames);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      console.error("Error fetching recommended sections:", errorMessage);
    } finally {
      setIsFetching(false);
      fetchingRef.current = false;
    }
  }

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
          style={{ paddingTop: '16px', paddingBottom: '32px' }}
        >
          {!isFetching && sections.map((section) => (
            <RecommendedSection
              key={section.id}
              sectionId={section.id}
              games={section.games}
              onGameClick={onGameClick}
              onPlay={onPlay}
              onGameUpdate={handleGameUpdate}
              coverSize={coverSize}
              allCollections={allCollections}
            />
          ))}
        </div>
      </div>
      </div>
    </main>
  );
}

