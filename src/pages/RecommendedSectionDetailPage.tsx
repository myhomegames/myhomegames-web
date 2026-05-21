import { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAutoTranslate } from "../hooks/useAutoTranslate";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { useLoading } from "../contexts/LoadingContext";
import { useSkin } from "../contexts/SkinContext";
import GamesList from "../components/games/GamesList";
import LibrariesBar from "../components/layout/LibrariesBar";
import { navigateToLibraryRoot } from "../utils/libraryNavigation";
import type { MainAppOutletContext } from "../layouts/MainAppLayout";
import type { GameItem, CollectionItem } from "../types";
import { API_BASE } from "../config";
import { buildApiUrl, buildApiHeaders, buildCoverUrl } from "../utils/api";
import {
  getRecommendedSectionFromCache,
  getRecommendedSectionsCache,
  type RecommendedSectionsNavState,
} from "../utils/recommendedSectionsCache";

type RecommendedSectionDetailPageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  coverSize?: number;
  allCollections?: CollectionItem[];
};

export default function RecommendedSectionDetailPage({
  onGameClick,
  onGamesLoaded,
  onPlay,
  coverSize: coverSizeProp = 150,
  allCollections = [],
}: RecommendedSectionDetailPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext<MainAppOutletContext | null>();
  const { sectionId: rawSectionId } = useParams<{ sectionId: string }>();
  const sectionId = rawSectionId ? decodeURIComponent(rawSectionId) : null;
  const { token } = useAuth();
  const { twitchLoginEnabled, settingsLoaded } = useSettings();
  const { setLoading } = useLoading();
  const { activeSkinWeb } = useSkin();
  const persistentShell = activeSkinWeb.persistentLibraryShell;

  const contextRailLayout =
    !!sectionId &&
    activeSkinWeb.compactCollectionLikeDetail &&
    activeSkinWeb.verticalCoverAlignment;

  const [games, setGames] = useState<GameItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [localCoverSize, setLocalCoverSize] = useState(() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : coverSizeProp;
  });
  const coverSizeFromOutlet = outletContext?.coverSize;
  const coverSize =
    persistentShell && coverSizeFromOutlet != null ? coverSizeFromOutlet : localCoverSize;

  const handleCoverSizeChange = useCallback((size: number) => {
    setLocalCoverSize(size);
    localStorage.setItem("coverSize", size.toString());
    window.dispatchEvent(new CustomEvent("mhg-cover-size-changed", { detail: { size } }));
  }, []);

  useEffect(() => {
    if (persistentShell) return;
    const handler = (e: Event) => {
      const size = (e as CustomEvent<{ size?: number }>).detail?.size;
      if (typeof size === "number" && !Number.isNaN(size)) setLocalCoverSize(size);
    };
    window.addEventListener("mhg-cover-size-changed", handler as EventListener);
    return () => window.removeEventListener("mhg-cover-size-changed", handler as EventListener);
  }, [persistentShell]);

  const sectionTitle = useAutoTranslate(sectionId ?? "", `recommended.${sectionId ?? ""}`, {
    disabled: !sectionId,
  });

  const handleGameClick = useCallback(
    (game: GameItem) => {
      if (twitchLoginEnabled && (game as GameItem & { isIgdbOnly?: boolean }).isIgdbOnly) {
        navigate(`/igdb-game/${game.id}`);
      } else {
        onGameClick(game);
      }
    },
    [twitchLoginEnabled, navigate, onGameClick],
  );

  useEffect(() => {
    if (!settingsLoaded || !sectionId) return;
    if (twitchLoginEnabled && !token) {
      navigate("/login", { replace: true });
      return;
    }

    const navState = location.state as RecommendedSectionsNavState | null;
    const snapshot =
      navState?.skipRecommendedFetch && navState.recommendedSectionsSnapshot
        ? navState.recommendedSectionsSnapshot
        : getRecommendedSectionsCache();

    if (snapshot && snapshot.length > 0) {
      const section = snapshot.find((s) => String(s.id) === String(sectionId));
      if (section) {
        setGames(section.games);
        onGamesLoaded(section.games);
        setIsFetching(false);
        setLoading(false);
        return;
      }
    }

    const cachedSection = getRecommendedSectionFromCache(sectionId);
    if (cachedSection) {
      setGames(cachedSection.games);
      onGamesLoaded(cachedSection.games);
      setIsFetching(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      setIsFetching(true);
      setLoading(true);
      try {
        const res = await fetch(buildApiUrl(API_BASE, `/recommended`), {
          headers: buildApiHeaders({ Accept: "application/json" }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const sections = (json.sections || []) as Array<{ id: string; games?: GameItem[] }>;
        const section = sections.find((s) => String(s.id) === String(sectionId));
        if (cancelled) return;
        if (!section) {
          navigate("/", { replace: true });
          return;
        }
        setGames(section.games ?? []);
        onGamesLoaded(section.games ?? []);
      } catch {
        if (!cancelled) navigate("/", { replace: true });
      } finally {
        if (!cancelled) {
          setIsFetching(false);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    sectionId,
    settingsLoaded,
    twitchLoginEnabled,
    token,
    navigate,
    setLoading,
    onGamesLoaded,
    location.state,
  ]);

  useLayoutEffect(() => {
    if (!isFetching) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsReady(true));
      });
    } else {
      setIsReady(false);
    }
  }, [isFetching, games.length]);

  const gamesColumn = useMemo(
    () =>
      games.length > 0 ? (
        <GamesList
          games={games}
          onGameClick={handleGameClick}
          onPlay={onPlay}
          buildCoverUrl={buildCoverUrl}
          coverSize={coverSize}
          allCollections={allCollections}
          enableVirtualization
          forceSingleColumnVirtualized
          fixedFocalSelection={contextRailLayout}
          scrollContainerRef={contextRailLayout ? scrollContainerRef : undefined}
        />
      ) : (
        <div className="centered-content h-full min-h-[400px]">
          <div className="text-gray-400 text-center">{t("table.noGames")}</div>
        </div>
      ),
    [games, handleGameClick, onPlay, coverSize, allCollections, contextRailLayout, t],
  );

  return (
    <>
      {contextRailLayout && !persistentShell ? (
        <div className="recommended-section-libraries-bar-host recommended-section-libraries-bar-host--dock-only">
          <LibrariesBar
            libraries={[]}
            activeLibrary={null}
            onSelectLibrary={() => {}}
            loading={false}
            error={null}
            coverSize={coverSize}
            onCoverSizeChange={handleCoverSizeChange}
            viewMode="grid"
            onViewModeChange={() => {}}
          />
        </div>
      ) : null}
      <div
        className={`bg-[#1a1a1a] home-page-main-container recommended-section-detail-page-shell${
          contextRailLayout
            ? " recommended-section-detail-shell recommended-section-detail-shell--context-rail"
            : ""
        }`}
      >
        <main className="flex-1 home-page-content recommended-section-detail-main-min-h">
          <div
            className={`home-page-layout${
              contextRailLayout ? " recommended-section-detail-layout-min-h" : ""
            }`}
          >
            <div
              className={`home-page-content-wrapper home-page-fade-in${
                isReady ? " home-page-fade-in--ready" : ""
              }`}
            >
              <div
                ref={contextRailLayout ? undefined : scrollContainerRef}
                className={`home-page-scroll-container recommended-section-detail-scroll${
                  contextRailLayout ? " recommended-section-detail-scroll--context-rail" : ""
                }`}
                tabIndex={-1}
                style={
                  {
                    ["--lid-cover-size" as string]: `${coverSize}px`,
                  } as React.CSSProperties
                }
              >
                {contextRailLayout && sectionId ? (
                  <div className="recommended-section-detail-section-full recommended-section-context-layout">
                    <aside
                      className="recommended-section-context-rail"
                      aria-label={sectionTitle || sectionId}
                    >
                      <button
                        type="button"
                        className="mhg-library-button mhg-library-active recommended-section-context-rail-library"
                        data-mhg-library-key="recommended"
                        onClick={() => navigateToLibraryRoot(navigate, "recommended")}
                      >
                        <span className="mhg-library-button-label">{t("libraries.recommended")}</span>
                      </button>
                      <div className="recommended-section-context-rail-title-block">
                        <h1 className="recommended-section-context-rail-title scrollable-section-title">
                          {sectionTitle || sectionId}
                        </h1>
                      </div>
                    </aside>
                    <div className="mhg-context-rail-bridge" aria-hidden="true" />
                    <div ref={scrollContainerRef} className="recommended-section-context-games">
                      <div className="recommended-section-games-list">
                        {!isFetching && gamesColumn}
                      </div>
                    </div>
                  </div>
                ) : (
                  !isFetching && gamesColumn
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
