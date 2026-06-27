import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { API_BASE } from "../../config";
import Cover from "./Cover";
import { buildCoverUrl } from "../../utils/api";
import ScrollableGamesSectionNav from "../common/ScrollableGamesSectionNav";
import type { CSSProperties } from "react";
import type { GameItem, CollectionItem } from "../../types";
export type SimilarGameDisplayItem =
  | { type: "library"; game: GameItem }
  | { type: "catalog"; id: number; name: string; cover?: string; year?: number | null };

function getScrollPosition(key: string): number {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function setScrollPosition(key: string, position: number): void {
  try {
    sessionStorage.setItem(key, position.toString());
  } catch {
    // ignore
  }
}

type SimilarGamesListProps = {
  items: SimilarGameDisplayItem[];
  coverSize?: number;
  allCollections?: CollectionItem[];
  onLibraryGameClick: (game: GameItem) => void;
  onCatalogGameClick: (gameId: number) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  sectionTitle?: string;
  activeGameId?: string | null;
};

export default function SimilarGamesList({
  items,
  coverSize = 140,
  allCollections = [],
  onLibraryGameClick,
  onCatalogGameClick,
  onPlay,
  onGameUpdate,
  sectionTitle,
  activeGameId,
}: SimilarGamesListProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const storageKey = `${location.pathname}:similar-games`;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  const coverHeight = coverSize * 1.5;

  const updateScrollButtons = () => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < maxScroll - 1);
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    setIsRestoring(true);
    const savedPosition = getScrollPosition(storageKey);
    if (savedPosition <= 0) {
      setIsRestoring(false);
      return;
    }
    const restoreScroll = (attempt = 0) => {
      if (!container) {
        setIsRestoring(false);
        return;
      }
      if (container.scrollWidth <= container.clientWidth) {
        if (attempt < 20) requestAnimationFrame(() => restoreScroll(attempt + 1));
        else setIsRestoring(false);
        return;
      }
      container.scrollLeft = savedPosition;
      updateScrollButtons();
      setIsRestoring(false);
    };
    const timer = setTimeout(() => restoreScroll(), 100);
    return () => {
      clearTimeout(timer);
      setIsRestoring(false);
    };
  }, [location.pathname, storageKey, items.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (!isRestoring) setScrollPosition(storageKey, container.scrollLeft);
      updateScrollButtons();
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (!isRestoring) setScrollPosition(storageKey, container.scrollLeft);
    };
  }, [storageKey, isRestoring]);

  useEffect(() => {
    updateScrollButtons();
    const timer = setTimeout(updateScrollButtons, 200);
    return () => clearTimeout(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const scrollToFirst = () => scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  const scrollToLast = () => {
    const c = scrollRef.current;
    if (c) c.scrollTo({ left: c.scrollWidth - c.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="scrollable-section">
      {sectionTitle && (
        <div className="scrollable-section-header">
          <h2 className="scrollable-section-title">{sectionTitle}</h2>
          <ScrollableGamesSectionNav
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
            onScrollToFirst={scrollToFirst}
            onScrollToLast={scrollToLast}
          />
        </div>
      )}
      {!sectionTitle && (
        <ScrollableGamesSectionNav
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onScrollToFirst={scrollToFirst}
          onScrollToLast={scrollToLast}
        />
      )}
      <div ref={scrollRef} className={`scrollable-section-scroll ${isRestoring ? "restoring" : ""}`}>
        <div
          className="similar-games-inline-row"
          style={{ ["--similar-cover-size" as string]: `${coverSize}px` } as CSSProperties}
        >
        {items.map((item) => {
          if (item.type === "library") {
            const game = item.game;
            const coverUrl = game.cover ? buildCoverUrl(API_BASE, game.cover, true) : "";
            const isCurrentGame =
              activeGameId != null && String(game.id) === String(activeGameId);
            return (
              <div
                key={`lib-${game.id}`}
                className={`games-list-item similar-games-cover-cell${isCurrentGame ? " games-list-item--detail-current" : ""}`}
              >
                <Cover
                  title={game.title}
                  coverUrl={coverUrl}
                  width={coverSize}
                  height={coverHeight}
                  onPlay={onPlay ? (executableName?: string) => (executableName !== undefined ? (onPlay as (g: GameItem, ex?: string) => void)(game, executableName) : onPlay(game)) : undefined}
                  onClick={isCurrentGame ? undefined : () => onLibraryGameClick(game)}
                  detailNavigationDisabled={isCurrentGame}
                  gameId={game.id}
                  gameTitle={game.title}
                  game={game}
                  onGameUpdate={onGameUpdate ? (u) => game.id === u.id && onGameUpdate(u) : undefined}
                  showTitle={game.showTitle !== false}
                  subtitle={game.year}
                  detail
                  play={!!(game.executables && game.executables.length > 0)}
                  showBorder
                  allCollections={allCollections}
                />
              </div>
            );
          }
          const coverUrl = item.cover || "";
          return (
            <div key={`catalog-${item.id}`} className="games-list-item similar-games-cover-cell">
              <Cover
                title={item.name}
                coverUrl={coverUrl}
                width={coverSize}
                height={coverHeight}
                onClick={() => onCatalogGameClick(item.id)}
                showTitle
                subtitle={item.year != null ? item.year : null}
                detail
                play={false}
                showBorder
                overlayContent={
                  <span className="game-detail-similar-cover-badge">
                    {t("addGame.new", "New")}
                  </span>
                }
              />
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
