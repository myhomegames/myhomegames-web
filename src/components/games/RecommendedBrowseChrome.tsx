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
  preloadBackgroundUrl,
  preloadBackgroundUrls,
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
  /** Render page body; `preview` must be placed where the summary panel lives. */
  children: (preview: ReactNode) => ReactNode;
};

/** Fanart settle delay — D-pad focus/selection never waits on this. */
const FANART_SETTLE_MS = 140;

/**
 * Keeps strip reconciliation off the fanart update path. Preview still follows
 * focus; BackgroundManager can remount portal layers without walking covers.
 */
const BrowseForeground = memo(function BrowseForeground({
  previewGame,
  renderBody,
}: {
  previewGame: GameItem | null;
  renderBody: (preview: ReactNode) => ReactNode;
}) {
  return <>{renderBody(<RecommendedBrowsePreview game={previewGame} />)}</>;
});

/**
 * Owns TV browse summary + fanart so cover strips are not blocked by fanart
 * decode/paint. Cover focus/selection stays on the remote path; fanart lags.
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
  paintedUrlRef.current = paintedBackgroundUrl;

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
      setPreviewGame(game);
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

  // Fanart follows preview after a short settle — never block cover selection.
  // Apply the URL immediately (no decode wait); CSS paints when the image is ready.
  useEffect(() => {
    if (!previewGame) {
      startTransition(() => setPaintedBackgroundUrl(""));
      return;
    }

    const url = buildBackgroundUrl(API_BASE, previewGame.background) || "";
    if (url === paintedUrlRef.current) return;

    const timer = window.setTimeout(() => {
      startTransition(() => {
        setPaintedBackgroundUrl(url);
      });
      if (url) preloadBackgroundUrl(url, { priority: true });
    }, FANART_SETTLE_MS);

    return () => {
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
    >
      <BrowseForeground previewGame={previewGame} renderBody={children} />
    </BackgroundManager>
  );
}
