import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useAutoTranslateBatch } from "../hooks/useAutoTranslate";
import { useLoading } from "../contexts/LoadingContext";
import { useSettings } from "../contexts/SettingsContext";
import ScrollableGamesSection from "../components/common/ScrollableGamesSection";
import type { GameItem, CollectionItem } from "../types";
import { API_BASE } from "../config";
import { getApiToken, getTwitchClientId, getTwitchClientSecret } from "../config";
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
  const navigate = useNavigate();
  const { twitchLoginEnabled } = useSettings();
  const { setLoading } = useLoading();
  const [sections, setSections] = useState<RecommendedSection[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef<boolean>(false);

  const handleGameClick = useCallback(
    (game: GameItem) => {
      if (twitchLoginEnabled && (game as GameItem & { isIgdbOnly?: boolean }).isIgdbOnly) {
        navigate(`/igdb-game/${game.id}`);
      } else {
        onGameClick(game);
      }
    },
    [twitchLoginEnabled, navigate, onGameClick]
  );
  
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
  }, [twitchLoginEnabled]);

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

  const batchItems = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        text: section.id,
        translationKey: `recommended.${section.id}`,
      })),
    [sections]
  );
  const sectionTitles = useAutoTranslateBatch(batchItems);

  async function fetchRecommendedSections() {
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;
    setIsFetching(true);
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const url = buildApiUrl(API_BASE, `/recommended`);
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
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

      if (twitchLoginEnabled) {
        const clientId = getTwitchClientId();
        const clientSecret = getTwitchClientSecret();
        if (clientId && clientSecret) {
          const mergedSections = await Promise.all(
            parsedSections.map(async (section) => {
              const excludeIds = section.games
                .map((g: GameItem) => Number(g.id))
                .filter((id: number) => !Number.isNaN(id));
              try {
                const url = buildApiUrl(API_BASE, "/igdb/games-by-keyword");
                const igdbRes = await fetch(url, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Auth-Token": getApiToken() || "",
                    "X-Twitch-Client-Id": clientId,
                    "X-Twitch-Client-Secret": clientSecret,
                  },
                  body: JSON.stringify({ keyword: section.id, excludeIds }),
                });
                const igdbData = await igdbRes.json().catch(() => ({}));
                if (!igdbRes.ok) {
                  return section;
                }
                const igdbGamesList = (igdbData.games || []) as Array<{ id: number; name: string; cover?: string | null; releaseDate?: number | null }>;
                const igdbGames = igdbGamesList.map(
                  (g) =>
                    ({
                      id: String(g.id),
                      title: g.name,
                      cover: g.cover || undefined,
                      year: g.releaseDate ?? undefined,
                      isIgdbOnly: true,
                    }) as GameItem
                );
                return { ...section, games: [...section.games, ...igdbGames] };
              } catch (err) {
                return section;
              }
            })
          );
          setSections(mergedSections);
          const allGamesMerged = mergedSections.flatMap((s) => s.games);
          onGamesLoaded(allGamesMerged);
        } else {
          setSections(parsedSections);
          onGamesLoaded(parsedSections.flatMap((s) => s.games));
        }
      } else {
        setSections(parsedSections);
        onGamesLoaded(parsedSections.flatMap((s) => s.games));
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const errorMessage = err?.name === "AbortError" ? "Request timed out" : String(err.message || err);
      console.error("Error fetching recommended sections:", errorMessage);
    } finally {
      clearTimeout(timeoutId);
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
            <ScrollableGamesSection
              key={section.id}
              sectionId={section.id}
              titleOverride={sectionTitles[section.id]}
              disableAutoTranslate
              games={section.games}
              onGameClick={handleGameClick}
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

