import { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAutoTranslate } from "../hooks/useAutoTranslate";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { useLoading } from "../contexts/LoadingContext";
import { useSkin } from "../contexts/SkinContext";
import GamesList from "../components/games/GamesList";
import { navigateToLibraryRoot } from "../utils/libraryNavigation";
import type { GameItem, CollectionItem } from "../types";
import { API_BASE } from "../config";
import { buildApiUrl, buildApiHeaders, buildCoverUrl } from "../utils/api";

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
  coverSize = 150,
  allCollections = [],
}: RecommendedSectionDetailPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sectionId: rawSectionId } = useParams<{ sectionId: string }>();
  const sectionId = rawSectionId ? decodeURIComponent(rawSectionId) : null;
  const { token } = useAuth();
  const { twitchLoginEnabled, settingsLoaded } = useSettings();
  const { setLoading } = useLoading();
  const { activeSkinWeb } = useSkin();

  const contextRailLayout =
    !!sectionId &&
    activeSkinWeb.compactCollectionLikeDetail &&
    activeSkinWeb.verticalCoverAlignment;

  const [games, setGames] = useState<GameItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
  }, [sectionId, settingsLoaded, twitchLoginEnabled, token, navigate, setLoading, onGamesLoaded]);

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
    <div
      className={`bg-[#1a1a1a] home-page-main-container${
        contextRailLayout ? " recommended-section-detail-shell recommended-section-detail-shell--context-rail" : ""
      }`}
    >
      <main className="flex-1 home-page-content">
        <div className={`home-page-layout${contextRailLayout ? " recommended-section-detail-layout-min-h" : ""}`}>
          <div className={`home-page-content-wrapper home-page-fade-in${isReady ? " home-page-fade-in--ready" : ""}`}>
            {contextRailLayout && sectionId ? (
              <div className="recommended-section-context-layout">
                <aside className="recommended-section-context-rail" aria-label={sectionTitle || sectionId}>
                  <button
                    type="button"
                    className="mhg-library-button mhg-library-active recommended-section-context-rail-library"
                    data-mhg-library-key="recommended"
                    onClick={() => navigateToLibraryRoot(navigate, "recommended")}
                  >
                    <span className="mhg-library-button-label">{t("libraries.recommended")}</span>
                  </button>
                  <div className="recommended-section-context-rail-title scrollable-section-title">
                    {sectionTitle || sectionId}
                  </div>
                </aside>
                <div className="mhg-context-rail-bridge" aria-hidden="true" />
                <div ref={scrollContainerRef} className="recommended-section-context-games">
                  {!isFetching && gamesColumn}
                </div>
              </div>
            ) : (
              !isFetching && gamesColumn
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
