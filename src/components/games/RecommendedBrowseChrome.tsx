import {
  useState,
  useEffect,
  useRef,
  memo,
  startTransition,
  type ReactNode,
  type RefObject,
} from "react";
import RecommendedBrowsePreview from "./RecommendedBrowsePreview";
import BackgroundManager from "../common/BackgroundManager";
import type { GameItem } from "../../types";
import { buildApiHeaders, buildBackgroundUrl } from "../../utils/api";
import { API_BASE } from "../../config";
import { buildCatalogApiUrl } from "../../utils/catalogApi";
import {
  isBackgroundUrlWarmed,
  preloadBackgroundUrl,
  preloadBackgroundUrls,
  whenBackgroundUrlReady,
} from "../../utils/preloadBackground";
import { ensureElementVisibleInScrollParents } from "../../utils/ensureVisibleInScrollParent";
import { setRecommendedSectionsCache } from "../../utils/recommendedSectionsCache";

type RecommendedSection = {
  id: string;
  title?: string;
  games: GameItem[];
};

type RecommendedBrowseChromeProps = {
  isReady: boolean;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  /** Live sections used to resolve focused covers — owned by the page. */
  sectionsRef: RefObject<RecommendedSection[]>;
  detailBackdrop: boolean;
  /**
   * Stable page shell (scroll + strips). Preview is rendered beside it so strip
   * fibers are not rebuilt when fanart/summary state changes.
   */
  children: ReactNode;
};

/**
 * Delay before fanart + ambient paint. Must be ≥ Plex TV cover scale transition
 * (`transform 0.2s` on `.games-list-item--cover-sized`) so blur/decode never
 * contend with hover. Focus/selection never waits on this.
 */
const FANART_SETTLE_MS = 240;

/**
 * Preview updates independently; `strips` keeps the same React node identity
 * across focus changes so horizontal rails are not reconciled every time.
 */
const BrowseForeground = memo(function BrowseForeground({
  previewGame,
  strips,
  isReady,
}: {
  previewGame: GameItem | null;
  strips: ReactNode;
  isReady: boolean;
}) {
  return (
    <main className="flex-1 home-page-content mhg-recommended-browse-preview-page">
      <div className="home-page-layout">
        <div
          className={`home-page-content-wrapper home-page-fade-in${
            isReady ? " home-page-fade-in--ready" : ""
          } mhg-recommended-browse-preview-host`}
        >
          <RecommendedBrowsePreview game={previewGame} />
          {strips}
        </div>
      </div>
    </main>
  );
});

/**
 * Owns TV browse summary + fanart so cover strips are not blocked by fanart
 * paint. Cover focus/selection stays on the remote path; after hover settle,
 * sharp + ambient share one URL swap (BackgroundManager opacity fade-in).
 */
export default function RecommendedBrowseChrome({
  isReady,
  scrollContainerRef,
  sectionsRef,
  detailBackdrop,
  children,
}: RecommendedBrowseChromeProps) {
  const [previewGame, setPreviewGame] = useState<GameItem | null>(null);
  const [paintedBackgroundUrl, setPaintedBackgroundUrl] = useState("");
  const catalogPreviewFetchedRef = useRef<Set<string>>(new Set());
  const enrichedByIdRef = useRef<Map<string, GameItem>>(new Map());
  const paintedUrlRef = useRef("");
  const previewIdRef = useRef<string | null>(null);
  paintedUrlRef.current = paintedBackgroundUrl;
  previewIdRef.current = previewGame ? String(previewGame.id) : null;

  const resolveGame = (id: string): GameItem | null => {
    const enriched = enrichedByIdRef.current.get(id);
    if (enriched) return enriched;
    for (const section of sectionsRef.current) {
      const found = section.games.find((g) => String(g.id) === id);
      if (found) return found;
    }
    return null;
  };

  useEffect(() => {
    if (!isReady) return;
    const first = sectionsRef.current[0]?.games[0] ?? null;
    if (!first) return;
    setPreviewGame((prev) => prev ?? resolveGame(String(first.id)) ?? first);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once when ready
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    const root = scrollContainerRef.current;
    if (!root) return;

    const resolveGameFromTarget = (target: EventTarget | null): GameItem | null => {
      if (!(target instanceof Element)) return null;
      const host = target.closest("[data-mhg-game-id]") as HTMLElement | null;
      const id = host?.getAttribute("data-mhg-game-id");
      if (!id) return null;
      return resolveGame(id);
    };

    const preloadNeighbors = (game: GameItem) => {
      const neighborUrls: string[] = [];
      for (const section of sectionsRef.current) {
        const idx = section.games.findIndex((g) => String(g.id) === String(game.id));
        if (idx < 0) continue;
        for (const offset of [-1, 0, 1, 2]) {
          const neighbor = section.games[idx + offset];
          const neighborId = neighbor ? String(neighbor.id) : "";
          const raw =
            (neighborId && enrichedByIdRef.current.get(neighborId)?.background) ||
            neighbor?.background?.trim();
          if (!raw) continue;
          const url = buildBackgroundUrl(API_BASE, raw);
          if (url) neighborUrls.push(url);
        }
        break;
      }
      if (neighborUrls.length > 0) {
        preloadBackgroundUrls(neighborUrls, { concurrency: 2, priority: true });
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      const game = resolveGameFromTarget(e.target);
      if (!game) return;
      // Selection is DOM focus + TV hover mirror — never gate it on fanart.
      // Defer React summary work so the cover scale transition can commit first.
      startTransition(() => setPreviewGame(game));
      const url = buildBackgroundUrl(API_BASE, game.background);
      if (url) preloadBackgroundUrl(url, { priority: true });
      window.requestAnimationFrame(() => preloadNeighbors(game));
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
        root.scrollTop = 0;
        ensureElementVisibleInScrollParents(firstCover);
      }
    }, 120);

    return () => {
      root.removeEventListener("focusin", onFocusIn);
      window.clearTimeout(focusTimer);
    };
  }, [isReady, scrollContainerRef, sectionsRef]);

  useEffect(() => {
    if (!previewGame?.isCatalogOnly) return;

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

        enrichedByIdRef.current.set(gameId, enriched);

        setRecommendedSectionsCache(
          sectionsRef.current.map((section) => ({
            ...section,
            games: section.games.map((game) =>
              String(game.id) === gameId && game.isCatalogOnly
                ? { ...game, ...enriched }
                : game,
            ),
          })),
        );

        startTransition(() => {
          setPreviewGame((prev) =>
            prev && String(prev.id) === gameId ? enriched : prev,
          );
        });
        const bgUrl = buildBackgroundUrl(API_BASE, enriched.background);
        if (bgUrl) preloadBackgroundUrl(bgUrl, { priority: true });
      } catch {
        /* aborted or network — keep lean catalog card */
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [previewGame?.id, previewGame?.isCatalogOnly, sectionsRef]);

  // Same path for sharp crop + ambient fill: wait until cover scale (~200ms)
  // finished, warm decode, then one painted URL → BackgroundManager fades both in.
  useEffect(() => {
    if (!previewGame) {
      const clearTimer = window.setTimeout(() => {
        startTransition(() => setPaintedBackgroundUrl(""));
      }, FANART_SETTLE_MS);
      return () => window.clearTimeout(clearTimer);
    }

    const gameId = String(previewGame.id);
    const url = buildBackgroundUrl(API_BASE, previewGame.background) || "";
    if (url === paintedUrlRef.current) return;

    let cancelled = false;

    if (url) preloadBackgroundUrl(url, { priority: true });

    const timer = window.setTimeout(() => {
      void (async () => {
        if (!url) {
          if (!cancelled && previewIdRef.current === gameId) {
            startTransition(() => setPaintedBackgroundUrl(""));
          }
          return;
        }
        if (!isBackgroundUrlWarmed(url)) {
          await whenBackgroundUrlReady(url);
        }
        if (cancelled || previewIdRef.current !== gameId) return;
        startTransition(() => setPaintedBackgroundUrl(url));
      })();
    }, FANART_SETTLE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [previewGame]);

  return (
    <BackgroundManager
      backgroundUrl={paintedBackgroundUrl}
      hasBackground={Boolean(paintedBackgroundUrl)}
      elementId="recommended-browse"
      autoShowWhenAvailable
      detailBackdrop={detailBackdrop}
      // Ambient rides the same URL + opacity fade as sharp (default ambientFill).
    >
      <BrowseForeground previewGame={previewGame} strips={children} isReady={isReady} />
    </BackgroundManager>
  );
}
