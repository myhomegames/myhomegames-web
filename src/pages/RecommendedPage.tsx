import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { usePageRevealReady } from "../hooks/usePageRevealReady";
import { useTitleFilterQuery } from "../contexts/TitleFilterContext";
import { useLoading } from "../contexts/LoadingContext";
import { useSettings } from "../contexts/SettingsContext";
import { useSkin } from "../contexts/SkinContext";
import { useListDataReady, withListFetchRetries } from "../hooks/useListDataReady";
import ScrollableGamesSection from "../components/common/ScrollableGamesSection";
import FixedFocalRecommendedSectionsList from "../components/lists/FixedFocalRecommendedSectionsList";
import RecommendedBrowsePreview from "../components/games/RecommendedBrowsePreview";
import BackgroundManager from "../components/common/BackgroundManager";
import type { GameItem, CollectionItem } from "../types";
import { buildApiHeaders, buildAppApiUrl, buildBackgroundUrl } from "../utils/api";
import { API_BASE } from "../config";
import { isSmartTvBrowser } from "../utils/smartTv";
import { buildCatalogApiUrl } from "../utils/catalogApi";
import {
  collectGameBackgroundUrls,
  preloadBackgroundUrl,
  preloadBackgroundUrls,
} from "../utils/preloadBackground";
import {
  clearRecommendedSectionsCache,
  consumeRecommendedReturnFromGame,
  consumeRecommendedReturnToIndex,
  getRecommendedSectionsCache,
  markRecommendedReturnFromGame,
  markRecommendedReturnToIndex,
  peekRecommendedReturnFromGame,
  peekRecommendedReturnToIndex,
  setRecommendedSectionsCache,
  type RecommendedSectionsNavState,
} from "../utils/recommendedSectionsCache";
import { titleMatchesFilter } from "../utils/titleFilter";

type RecommendedSection = {
  id: string;
  title?: string;
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
  const titleFilterQuery = useTitleFilterQuery();
  const { catalogSearchEnabled } = useSettings();
  const { ready: listDataReady, reloadToken } = useListDataReady();
  const { setLoading } = useLoading();
  const { activeSkinWeb } = useSkin();
  const verticalStripsLayout = activeSkinWeb.verticalCoverAlignment;
  const browsePreviewEnabled =
    activeSkinWeb.tvRecommendedBrowsePreview &&
    isSmartTvBrowser() &&
    !verticalStripsLayout;
  const [previewGame, setPreviewGame] = useState<GameItem | null>(null);
  // Only reuse cache when returning from a game/section; a fresh visit must fetch
  // a new random set without painting the previous strips first.
  const preserveCachedSections =
    peekRecommendedReturnFromGame() || peekRecommendedReturnToIndex();
  const initialCachedSections = preserveCachedSections
    ? getRecommendedSectionsCache()
    : null;
  const [sections, setSections] = useState<RecommendedSection[]>(
    () => initialCachedSections ?? [],
  );
  const [isFetching, setIsFetching] = useState(
    () => !initialCachedSections || initialCachedSections.length === 0,
  );
  const isReady = usePageRevealReady(
    isFetching && sections.length === 0,
    sections.length > 0,
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stripsScrollRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef<boolean>(false);
  const fetchGenerationRef = useRef(0);
  const catalogPreviewFetchedRef = useRef<Set<string>>(new Set());
  const onGamesLoadedRef = useRef(onGamesLoaded);
  const setLoadingRef = useRef(setLoading);
  onGamesLoadedRef.current = onGamesLoaded;
  setLoadingRef.current = setLoading;

  const handleGameClick = useCallback(
    (game: GameItem) => {
      setRecommendedSectionsCache(sections);
      markRecommendedReturnFromGame();
      if (catalogSearchEnabled && (game as GameItem & { isCatalogOnly?: boolean }).isCatalogOnly) {
        navigate(`/catalog-game/${game.id}`);
      } else {
        onGameClick(game);
      }
    },
    [catalogSearchEnabled, navigate, onGameClick, sections]
  );
  
  useScrollRestoration(scrollContainerRef, undefined, !verticalStripsLayout);

  const sectionsForDisplay = useMemo(() => {
    const q = titleFilterQuery.trim();
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        games: section.games.filter((g) => titleMatchesFilter(g.title, q)),
      }))
      .filter((s) => s.games.length > 0);
  }, [sections, titleFilterQuery]);

  const handleGameUpdate = (updatedGame: GameItem) => {
    setSections((prevSections) => {
      const next = prevSections.map((section) => ({
        ...section,
        games: section.games.map((game) =>
          String(game.id) === String(updatedGame.id) ? updatedGame : game
        ),
      }));
      setRecommendedSectionsCache(next);
      return next;
    });
    window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
  };

  // Listen for game events to update sections
  useEffect(() => {
    const handleGameUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ game: GameItem }>;
      const updatedGame = customEvent.detail?.game;
      if (updatedGame) {
        setSections((prevSections) => {
          const next = prevSections.map((section) => ({
            ...section,
            games: section.games.map((game) =>
              String(game.id) === String(updatedGame.id) ? updatedGame : game
            ),
          }));
          setRecommendedSectionsCache(next);
          return next;
        });
      }
    };

    const handleGameDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: string | number }>;
      const deletedGameId = customEvent.detail?.gameId;
      if (deletedGameId == null) return;
      const gameIdStr = String(deletedGameId);
      setSections((prevSections) => {
        const next = prevSections
          .map((section) => ({
            ...section,
            games: section.games.filter((game) => String(game.id) !== gameIdStr),
          }))
          .filter((section) => section.games.length > 0);
        setRecommendedSectionsCache(next);
        return next;
      });
    };

    const handleRecommendedUpdated = () => {
      clearRecommendedSectionsCache();
      fetchRecommendedSections();
    };

    window.addEventListener("gameUpdated", handleGameUpdated as EventListener);
    window.addEventListener("gameDeleted", handleGameDeleted as EventListener);
    window.addEventListener("recommendedUpdated", handleRecommendedUpdated);
    window.addEventListener("mhg-language-changed", handleRecommendedUpdated);
    
    return () => {
      window.removeEventListener("gameUpdated", handleGameUpdated as EventListener);
      window.removeEventListener("gameDeleted", handleGameDeleted as EventListener);
      window.removeEventListener("recommendedUpdated", handleRecommendedUpdated);
      window.removeEventListener("mhg-language-changed", handleRecommendedUpdated);
    };
  }, []);

  const hydrateFromCache = useCallback(() => {
    const cached = getRecommendedSectionsCache();
    if (!cached || cached.length === 0) return false;
    setSections(cached);
    onGamesLoadedRef.current(cached.flatMap((s) => s.games));
    setIsFetching(false);
    setLoadingRef.current(false);
    return true;
  }, []);

  useEffect(() => {
    if (!listDataReady) return;
    if (
      (consumeRecommendedReturnFromGame() || consumeRecommendedReturnToIndex()) &&
      hydrateFromCache()
    ) {
      return;
    }
    // Fresh visit: fetch a new random set — do not paint stale cache then refresh.
    fetchRecommendedSections();
  }, [listDataReady, reloadToken, navigate, hydrateFromCache]);

  // Listen for metadata reload event
  useEffect(() => {
    const handleMetadataReloaded = () => {
      clearRecommendedSectionsCache();
      fetchRecommendedSections();
    };
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    return () => {
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
    };
  }, []);

  // Sync rendering state with global loading context
  useEffect(() => {
    setLoading(isFetching || !isReady);
  }, [isFetching, isReady, setLoading]);

  const stripRows = useMemo(
    () =>
      sectionsForDisplay.map((section) => ({
        id: section.id,
        title: section.title ?? section.id,
      })),
    [sectionsForDisplay],
  );

  const handleStripClick = useCallback(
    (section: { id: string; title: string }) => {
      const snapshot = sections;
      setRecommendedSectionsCache(snapshot);
      markRecommendedReturnToIndex();
      const navState: RecommendedSectionsNavState = {
        recommendedSectionsSnapshot: snapshot,
        skipRecommendedFetch: true,
      };
      navigate(`/recommended/${encodeURIComponent(section.id)}`, { state: navState });
    },
    [navigate, sections],
  );

  useEffect(() => {
    if (!verticalStripsLayout || !isReady) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const pin = () => {
      if (el.scrollTop !== 0) el.scrollTop = 0;
    };
    pin();
    el.addEventListener("scroll", pin, { passive: true });
    return () => el.removeEventListener("scroll", pin);
  }, [verticalStripsLayout, isReady, stripRows.length]);

  // TV Recommended browse preview: seed from first game + follow cover focus.
  useEffect(() => {
    if (!browsePreviewEnabled) {
      setPreviewGame(null);
      return;
    }
    const first = sectionsForDisplay[0]?.games[0] ?? null;
    setPreviewGame((prev) => {
      if (prev && sectionsForDisplay.some((s) => s.games.some((g) => String(g.id) === String(prev.id)))) {
        return prev;
      }
      return first;
    });
  }, [browsePreviewEnabled, sectionsForDisplay]);

  // Warm fanarts into the HTTP/image cache so focus swaps stay snappy on TV.
  useEffect(() => {
    if (!browsePreviewEnabled || !isReady || sectionsForDisplay.length === 0) return;

    const urls = collectGameBackgroundUrls(
      sectionsForDisplay,
      (background) => buildBackgroundUrl(API_BASE, background) || "",
      { perSection: 12, maxTotal: 36 },
    );
    if (urls.length === 0) return;

    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const start = () => preloadBackgroundUrls(urls, { concurrency: 2 });

    const ric = window.requestIdleCallback;
    if (typeof ric === "function") {
      idleId = ric(() => start(), { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(start, 200);
    }

    return () => {
      if (idleId != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [browsePreviewEnabled, isReady, sectionsForDisplay]);

  useEffect(() => {
    if (!browsePreviewEnabled || !isReady) return;
    const root = scrollContainerRef.current;
    if (!root) return;

    const resolveGameFromTarget = (target: EventTarget | null): GameItem | null => {
      if (!(target instanceof Element)) return null;
      const host = target.closest("[data-mhg-game-id]") as HTMLElement | null;
      const id = host?.getAttribute("data-mhg-game-id");
      if (!id) return null;
      for (const section of sectionsForDisplay) {
        const found = section.games.find((g) => String(g.id) === id);
        if (found) return found;
      }
      return null;
    };

    const preloadNeighbors = (game: GameItem) => {
      const neighborUrls: string[] = [];
      for (const section of sectionsForDisplay) {
        const idx = section.games.findIndex((g) => String(g.id) === String(game.id));
        if (idx < 0) continue;
        for (const offset of [-1, 0, 1, 2]) {
          const neighbor = section.games[idx + offset];
          const raw = neighbor?.background?.trim();
          if (!raw) continue;
          const url = buildBackgroundUrl(API_BASE, raw);
          if (url) neighborUrls.push(url);
        }
        break;
      }
      if (neighborUrls.length > 0) {
        preloadBackgroundUrls(neighborUrls, { concurrency: 2 });
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      const game = resolveGameFromTarget(e.target);
      if (!game) return;
      setPreviewGame(game);
      preloadNeighbors(game);
    };

    root.addEventListener("focusin", onFocusIn);
    const focusTimer = window.setTimeout(() => {
      const active = document.activeElement;
      if (active instanceof Element && root.contains(active) && resolveGameFromTarget(active)) {
        return;
      }
      const firstCover = root.querySelector<HTMLElement>(
        ".games-list-cover[role='button'], .games-list-cover[tabindex]",
      );
      if (firstCover) {
        try {
          firstCover.focus({ preventScroll: true });
        } catch {
          firstCover.focus();
        }
      }
    }, 120);

    return () => {
      root.removeEventListener("focusin", onFocusIn);
      window.clearTimeout(focusTimer);
    };
  }, [browsePreviewEnabled, isReady, sectionsForDisplay]);

  // Catalog-only (“New”) covers ship lean from keyword search — enrich preview on focus.
  useEffect(() => {
    if (!browsePreviewEnabled || !previewGame?.isCatalogOnly) return;

    const gameId = String(previewGame.id);
    if (catalogPreviewFetchedRef.current.has(gameId)) return;

    const baseGame = previewGame;
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const url = buildCatalogApiUrl(`/igdb/game/${gameId}`);
        const res = await fetch(url, {
          headers: buildApiHeaders({ Accept: "application/json" }),
          signal: controller.signal,
        });
        if (!res.ok || cancelled) return;
        const detail = await res.json();
        if (cancelled || !detail) return;

        catalogPreviewFetchedRef.current.add(gameId);

        const enriched: GameItem = {
          ...baseGame,
          title: detail.name || baseGame.title,
          summary: detail.summary || baseGame.summary,
          cover: detail.cover || baseGame.cover,
          background: detail.background || baseGame.background,
          year:
            detail.releaseDateFull?.year ??
            detail.releaseDate ??
            baseGame.year,
          month: detail.releaseDateFull?.month ?? baseGame.month,
          day: detail.releaseDateFull?.day ?? baseGame.day,
          genre: Array.isArray(detail.genres)
            ? detail.genres.map((title: string, index: number) => ({
                id: index,
                title: typeof title === "string" ? title : String(title),
              }))
            : baseGame.genre,
          criticratings: detail.criticRating ?? baseGame.criticratings ?? null,
          userratings: detail.userRating ?? baseGame.userratings ?? null,
          ageRatings: detail.ageRatings ?? baseGame.ageRatings,
          type: detail.type ?? baseGame.type,
          isCatalogOnly: true,
        };

        setPreviewGame((prev) =>
          prev && String(prev.id) === gameId ? enriched : prev,
        );
        const bgUrl = buildBackgroundUrl(API_BASE, enriched.background);
        if (bgUrl) preloadBackgroundUrl(bgUrl);
        setSections((prev) => {
          const next = prev.map((section) => ({
            ...section,
            games: section.games.map((game) =>
              String(game.id) === gameId && game.isCatalogOnly
                ? { ...game, ...enriched }
                : game,
            ),
          }));
          setRecommendedSectionsCache(next);
          return next;
        });
      } catch {
        /* aborted or network — keep lean catalog card */
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [browsePreviewEnabled, previewGame?.id, previewGame?.isCatalogOnly]);

  async function fetchRecommendedSections(options?: { background?: boolean }) {
    if (fetchingRef.current) {
      return;
    }
    if (!listDataReady) return;
    const background = options?.background === true;
    fetchingRef.current = true;
    const generation = ++fetchGenerationRef.current;
    if (!background) {
      setIsFetching(true);
      setLoadingRef.current(true);
    }
    try {
      const parsedSections = await withListFetchRetries(async () => {
        const attemptController = new AbortController();
        const attemptTimeoutId = setTimeout(() => attemptController.abort(), 90000);
        try {
          const url = buildAppApiUrl("/recommended");
          const res = await fetch(url, {
            headers: buildApiHeaders({ Accept: "application/json" }),
            signal: attemptController.signal,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const sectionsData = (json.sections || []) as any[];

          return sectionsData.map((section) => ({
            id: section.id,
            title: section.title ?? section.id,
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
        } finally {
          clearTimeout(attemptTimeoutId);
        }
      });

      // Show library data immediately so the page is fast
      setSections(parsedSections);
      setRecommendedSectionsCache(parsedSections);
      onGamesLoadedRef.current(parsedSections.flatMap((s) => s.games));
      setIsFetching(false);
      setLoadingRef.current(false);

      if (catalogSearchEnabled) {
          // Fetch IGDB data in background; update each section as its response arrives
          parsedSections.forEach((section) => {
            const excludeIds = section.games
              .map((g: GameItem) => Number(g.id))
              .filter((id: number) => !Number.isNaN(id));
            const catalogUrl = buildCatalogApiUrl("/igdb/games-by-keyword");
            fetch(catalogUrl, {
              method: "POST",
              headers: buildApiHeaders({
                "Content-Type": "application/json",
              }),
              body: JSON.stringify({ keyword: section.id, excludeIds }),
            })
              .then((catalogRes) => {
                if (generation !== fetchGenerationRef.current) return null;
                return catalogRes.json().catch(() => ({})).then((catalogData) => ({ catalogRes, catalogData }));
              })
              .then((pair) => {
                if (!pair || generation !== fetchGenerationRef.current) return;
                const { catalogRes, catalogData } = pair;
                if (!catalogRes.ok) return;
                const catalogGamesList = (catalogData.games || []) as Array<{
                  id: number;
                  name: string;
                  summary?: string;
                  cover?: string | null;
                  background?: string | null;
                  releaseDate?: number | null;
                  releaseDateFull?: {
                    year?: number;
                    month?: number;
                    day?: number;
                  } | null;
                  genres?: string[];
                  criticRating?: number | null;
                  userRating?: number | null;
                  type?: number | null;
                }>;
                const catalogGames = catalogGamesList.map(
                  (g) =>
                    ({
                      id: String(g.id),
                      title: g.name,
                      summary: g.summary || undefined,
                      cover: g.cover || undefined,
                      background: g.background || undefined,
                      year: g.releaseDateFull?.year ?? g.releaseDate ?? undefined,
                      month: g.releaseDateFull?.month ?? undefined,
                      day: g.releaseDateFull?.day ?? undefined,
                      genre: Array.isArray(g.genres)
                        ? g.genres.map((title, index) => ({ id: index, title }))
                        : undefined,
                      criticratings: g.criticRating ?? null,
                      userratings: g.userRating ?? null,
                      type: g.type ?? null,
                      isCatalogOnly: true,
                    }) as GameItem
                );
                setSections((prev) => {
                  const next = prev.map((s) =>
                    s.id === section.id ? { ...s, games: [...s.games, ...catalogGames] } : s
                  );
                  setRecommendedSectionsCache(next);
                  onGamesLoadedRef.current(next.flatMap((s) => s.games));
                  return next;
                });
              })
              .catch(() => {});
          });
      }
    } catch (err: any) {
      const errorMessage = err?.name === "AbortError" ? "Request timed out" : String(err.message || err);
      console.error("Error fetching recommended sections:", errorMessage);
    } finally {
      setIsFetching(false);
      fetchingRef.current = false;
    }
  }

  const previewBackgroundUrl = useMemo(() => {
    if (!browsePreviewEnabled || !previewGame) return "";
    // Stable URL (no cache-bust timestamp) so idle/neighbor preloads hit the same resource.
    return buildBackgroundUrl(API_BASE, previewGame.background) || "";
  }, [browsePreviewEnabled, previewGame]);

  const pageBody = (
    <main
      className={`flex-1 home-page-content${
        verticalStripsLayout ? " mhg-recommended-strips-page" : ""
      }${browsePreviewEnabled ? " mhg-recommended-browse-preview-page" : ""}`}
    >
      <div
        className={`home-page-layout${
          verticalStripsLayout ? " recommended-strips-page-layout" : ""
        }`}
      >
        <div
          className={`home-page-content-wrapper home-page-fade-in${
            isReady ? " home-page-fade-in--ready" : ""
          }${browsePreviewEnabled ? " mhg-recommended-browse-preview-host" : ""}`}
        >
          {browsePreviewEnabled ? <RecommendedBrowsePreview game={previewGame} /> : null}
          <div
            ref={scrollContainerRef}
            className={`home-page-scroll-container recommended-page-scroll${
              verticalStripsLayout ? " recommended-page-scroll--strips-layout" : ""
            }`}
          >
            {!isFetching &&
              (verticalStripsLayout ? (
                stripRows.length > 0 ? (
                  <div ref={stripsScrollRef} className="recommended-strips-column">
                    <FixedFocalRecommendedSectionsList
                      sections={stripRows}
                      containerRef={stripsScrollRef}
                      onSectionClick={handleStripClick}
                    />
                  </div>
                ) : null
              ) : (
                sectionsForDisplay.map((section) => (
                  <ScrollableGamesSection
                    key={section.id}
                    sectionId={section.id}
                    titleOverride={section.title ?? section.id}
                    games={section.games}
                    onGameClick={handleGameClick}
                    onPlay={onPlay}
                    onGameUpdate={handleGameUpdate}
                    coverSize={coverSize}
                    allCollections={allCollections}
                  />
                ))
              ))}
          </div>
        </div>
      </div>
    </main>
  );

  if (browsePreviewEnabled) {
    return (
      <BackgroundManager
        backgroundUrl={previewBackgroundUrl}
        hasBackground={Boolean(previewBackgroundUrl)}
        elementId={
          previewGame ? `recommended-browse-${previewGame.id}` : "recommended-browse"
        }
        autoShowWhenAvailable
        detailBackdrop={activeSkinWeb.detailBackdropLayout}
      >
        {pageBody}
      </BackgroundManager>
    );
  }

  return pageBody;
}

