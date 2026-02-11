import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useDevelopers } from "../contexts/DevelopersContext";
import GamesList from "../components/games/GamesList";
import Cover from "../components/games/Cover";
import EditCollectionLikeModal from "../components/collections/EditCollectionLikeModal";
import DropdownMenu from "../components/common/DropdownMenu";
import Tooltip from "../components/common/Tooltip";
import BackgroundManager from "../components/common/BackgroundManager";
import LibrariesBar from "../components/layout/LibrariesBar";
import StarRating from "../components/common/StarRating";
import Summary from "../components/common/Summary";
import { compareTitles } from "../utils/stringUtils";
import { buildApiUrl, buildCoverUrl, buildBackgroundUrl } from "../utils/api";
import { API_BASE, getApiToken } from "../config";
import type { GameItem, CollectionInfo } from "../types";
import "./CollectionDetail.css";

type DeveloperDetailPageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
};

export default function DeveloperDetailPage({
  onGameClick,
  onGamesLoaded,
  onPlay,
}: DeveloperDetailPageProps) {
  const { t } = useTranslation();
  const { setLoading, isLoading } = useLoading();
  const { developers: allDevelopers, updateDeveloper } = useDevelopers();
  const { developerId } = useParams<{ developerId: string }>();
  const [developer, setDeveloper] = useState<CollectionInfo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [games, setGames] = useState<GameItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [coverSize, setCoverSize] = useState(() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const fetchingRef = useRef(false);

  useScrollRestoration(scrollContainerRef);

  useEffect(() => {
    if (developerId) {
      const found = allDevelopers.find((d) => String(d.id) === String(developerId));
      if (found) {
        setDeveloper({
          id: String(found.id),
          title: found.title,
          summary: found.summary,
          cover: found.cover,
          background: (found as any).background,
          showTitle: (found as any).showTitle !== false,
        });
      } else {
        fetchDeveloperInfo(developerId);
      }
    }
  }, [developerId, allDevelopers]);

  useEffect(() => {
    if (developerId && !fetchingRef.current) {
      fetchDeveloperGames(developerId);
    }
  }, [developerId]);

  async function fetchDeveloperInfo(id: string) {
    try {
      const url = buildApiUrl(API_BASE, `/developers/${id}`);
      const res = await fetch(url, {
        headers: { Accept: "application/json", "X-Auth-Token": getApiToken() || "" },
      });
      if (res.ok) {
        const data = await res.json();
        setDeveloper({
          id: String(data.id),
          title: data.title,
          summary: data.summary,
          cover: data.cover,
          background: data.background,
          showTitle: data.showTitle !== false,
        });
      }
    } catch (err) {
      console.error("Error fetching developer:", err);
    }
  }

  async function fetchDeveloperGames(id: string) {
    fetchingRef.current = true;
    setLoading(true);
    try {
      const url = buildApiUrl(API_BASE, `/developers/${id}/games`);
      const res = await fetch(url, {
        headers: { Accept: "application/json", "X-Auth-Token": getApiToken() || "" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.games || []).map((v: any) => ({
        id: String(v.id),
        title: v.title,
        summary: v.summary,
        cover: v.cover,
        day: v.day,
        month: v.month,
        year: v.year,
        stars: v.stars,
        developers: v.developers,
        publishers: v.publishers,
        executables: v.executables,
      }));
      setGames(items);
      onGamesLoaded(items);
    } catch (err) {
      console.error("Error fetching developer games:", err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }

  useLayoutEffect(() => {
    if (!isLoading && developer) {
      requestAnimationFrame(() => requestAnimationFrame(() => setIsReady(true)));
    } else if (isLoading) setIsReady(false);
  }, [isLoading, developer, games.length]);

  const sortedGames = useMemo(() => {
    const s = [...games];
    s.sort((a, b) => {
      const ya = a.year ?? 0;
      const yb = b.year ?? 0;
      if (ya !== 0 && yb !== 0) return ya - yb;
      if (ya !== 0) return -1;
      if (yb !== 0) return 1;
      return compareTitles(a.title || "", b.title || "");
    });
    return s;
  }, [games]);

  const yearRange = useMemo(() => {
    const years = games.map((g) => g.year).filter((y): y is number => y != null);
    if (years.length === 0) return null;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? min.toString() : `${min} - ${max}`;
  }, [games]);

  const averageRating = useMemo(() => {
    const ratings = games.map((g) => g.stars).filter((s): s is number => s != null);
    if (ratings.length === 0) return null;
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    return (avg / 10) * 5;
  }, [games]);

  const handleCoverSizeChange = (size: number) => {
    setCoverSize(size);
    localStorage.setItem("coverSize", size.toString());
  };

  if (!developerId) {
    return (
      <div className="bg-[#1a1a1a] text-white flex items-center justify-center" style={{ width: "100%", height: "100%" }}>
        <div className="text-gray-400">{t("tags.noItemsFound", { type: t("igdbInfo.developers", "Developers") })}</div>
      </div>
    );
  }

  const coverUrl = developer?.cover ? buildCoverUrl(API_BASE, developer.cover, true) : "";
  const coverWidth = 240;
  const coverHeight = 360;
  const backgroundUrl = buildBackgroundUrl(API_BASE, developer?.background);
  const hasBackground = Boolean(backgroundUrl && backgroundUrl.trim() !== "");

  return (
    <BackgroundManager backgroundUrl={backgroundUrl} hasBackground={hasBackground} elementId={developerId || ""}>
    <div className="bg-[#1a1a1a] home-page-main-container">
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
      <main className="flex-1 home-page-content">
        <div className="home-page-layout">
          <div
            className="home-page-content-wrapper"
            style={{ opacity: isReady ? 1 : 0, transition: "opacity 0.2s ease-in-out" }}
          >
            <div
              ref={scrollContainerRef}
              className="home-page-scroll-container"
              style={{ paddingLeft: "64px", paddingRight: "64px", paddingTop: "5px", paddingBottom: "32px" }}
            >
              {developer && (
                <div className="pt-8" style={{ display: "flex", flexDirection: "row", gap: "48px", alignItems: "flex-start", width: "100%", boxSizing: "border-box", marginBottom: "32px" }}>
                  <div style={{ flexShrink: 0 }}>
                    <Cover
                      title={developer.title}
                      coverUrl={coverUrl}
                      width={coverWidth}
                      height={coverHeight}
                      onPlay={onPlay && sortedGames.some((g) => g.executables?.length) ? () => {
                        const g = sortedGames.find((x) => x.executables?.length);
                        if (g) onPlay(g);
                      } : undefined}
                      showTitle={false}
                      detail={false}
                      play={sortedGames.some((g) => g.executables?.length) ? true : false}
                      showBorder={true}
                    />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: "16px", minHeight: `${coverHeight}px`, minWidth: 0, visibility: "visible" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", visibility: "visible" }}>
                    <h1 className="text-white" style={{ fontFamily: "var(--font-heading-1-font-family)", fontSize: "var(--font-heading-1-font-size)", lineHeight: "var(--font-heading-1-line-height)" }}>
                      {developer.title}
                    </h1>
                    {yearRange && (
                      <div className="text-white" style={{ opacity: 0.8, fontFamily: "var(--font-body-2-font-family)", fontSize: "var(--font-body-2-font-size)", lineHeight: "var(--font-body-2-line-height)" }}>
                        {yearRange}
                      </div>
                    )}
                    {averageRating !== null && <StarRating rating={averageRating} />}
                    {(onPlay && sortedGames.some((g) => g.executables?.length)) || developer ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
                        {onPlay && sortedGames.some((g) => g.executables?.length) && (
                          <button
                            onClick={() => {
                              const g = sortedGames.find((x) => x.executables?.length);
                              if (g) onPlay(g);
                            }}
                            style={{
                              backgroundColor: "#E5A00D",
                              color: "#000000",
                              border: "none",
                              borderRadius: "4px",
                              paddingTop: "6px",
                              paddingBottom: "6px",
                              paddingLeft: "8px",
                              paddingRight: "12px",
                              fontSize: "1.25rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "background-color 0.2s ease",
                              width: "fit-content",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              lineHeight: "1.2",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#F5B041";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#E5A00D";
                            }}
                          >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ display: "block" }}>
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            {t("common.play")}
                          </button>
                        )}
                        {developer && (
                          <Tooltip text={t("common.edit")} delay={200}>
                            <button
                              onClick={() => setIsEditModalOpen(true)}
                              className="collection-detail-edit-button"
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          </Tooltip>
                        )}
                        {developer && (
                          <DropdownMenu
                            onEdit={() => setIsEditModalOpen(true)}
                            horizontal={true}
                            className="collection-detail-dropdown-menu"
                            toolTipDelay={200}
                          />
                        )}
                      </div>
                    ) : null}
                    {developer && (
                      <EditCollectionLikeModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        resourceType="developers"
                        item={developer}
                        onItemUpdate={(updated) => {
                          setDeveloper(updated);
                          updateDeveloper({ ...updated, gameCount: sortedGames.length });
                        }}
                      />
                    )}
                    {developer.summary && <Summary summary={developer.summary} maxLines={4} />}
                    </div>
                  </div>
                </div>
              )}
              {!isLoading && (
                <div>
                  <h2 className="text-white" style={{ marginBottom: "32px", marginTop: "8px", fontSize: "var(--font-heading-2-font-size)", fontWeight: 600 }}>
                    {sortedGames.length} {t("common.games")}
                  </h2>
                  <div className="collection-detail-games-list">
                    <GamesList
                      games={sortedGames}
                      onGameClick={onGameClick}
                      onPlay={onPlay}
                      buildCoverUrl={(apiBase, cover, ts) => buildCoverUrl(apiBase, cover, ts ?? false)}
                      coverSize={coverSize}
                      itemRefs={itemRefs}
                      draggable={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
    </BackgroundManager>
  );
}
