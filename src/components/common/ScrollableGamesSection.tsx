import { useRef, useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import GamesList from "../games/GamesList";
import { resolveHorizontalStripScroller } from "../games/VirtualizedHorizontalGamesStrip";
import ScrollableGamesSectionNav from "./ScrollableGamesSectionNav";
import type { CollectionInfo, CollectionItem, GameItem } from "../../types";
import type { CollectionLikeResourceType } from "../collections/EditCollectionLikeModal";
import type { ActiveCollectionLikeDetail } from "../../utils/collectionLikePseudoGame";
import { buildCoverUrl } from "../../utils/api";
import { useSkin } from "../../contexts/SkinContext";
import { isSmartTvBrowser } from "../../utils/smartTv";
// sessionStorage helpers
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
    // Ignore
  }
}

function stripScrollEl(sectionScroll: HTMLDivElement | null): HTMLElement | null {
  return resolveHorizontalStripScroller(sectionScroll);
}

type ScrollableGamesSectionProps = {
  sectionId: string;
  games: GameItem[];
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  coverSize: number;
  allCollections?: CollectionItem[];
  titleOverride?: string;
  titleHref?: string;
  showTitle?: boolean;
  /** Synthetic `collectionlike:…` rows in sliders: use collection-like Cover actions */
  allCollectionLikes?: CollectionItem[];
  collectionLikeResourceType?: CollectionLikeResourceType;
  sliderParentCollectionLikeId?: string;
  onRemoveChildFromSliderParent?: (childId: string) => void | Promise<void>;
  onCollectionLikePseudoEdit?: (game: GameItem) => void;
  onPlayFirstInCollectionLike?: (resourceType: string, cid: string) => void | Promise<void>;
  onCollectionLikePseudoAddToParent?: (source: CollectionItem, parentId?: string) => void | Promise<void>;
  onCollectionLikePseudoUpdated?: (updated: CollectionInfo) => void;
  /** Game detail collection sliders: keep classic horizontal covers (not vertical alignment). */
  disableVerticalCoverAlignment?: boolean;
  activeCollectionLikeDetail?: ActiveCollectionLikeDetail | null;
  activeGameId?: string | null;
};

export default function ScrollableGamesSection({
  sectionId,
  games,
  onGameClick,
  onPlay,
  onGameUpdate,
  coverSize,
  allCollections = [],
  titleOverride,
  titleHref,
  showTitle = true,
  allCollectionLikes,
  collectionLikeResourceType,
  sliderParentCollectionLikeId,
  onRemoveChildFromSliderParent,
  onCollectionLikePseudoEdit,
  onPlayFirstInCollectionLike,
  onCollectionLikePseudoAddToParent,
  onCollectionLikePseudoUpdated,
  disableVerticalCoverAlignment = false,
  activeCollectionLikeDetail,
  activeGameId,
}: ScrollableGamesSectionProps) {
  const { activeSkinWeb } = useSkin();
  const location = useLocation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const storageKey = `${location.pathname}:${sectionId}`;
  const forceVerticalCovers =
    activeSkinWeb.verticalCoverAlignment && !disableVerticalCoverAlignment;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  const title = titleOverride ?? sectionId;

  /**
   * Mouse wheel uses scrollLeft; Smart TV D-pad often keeps a cover visible without
   * reaching scroll ends — when a cover in this strip is focused, drive < / > from
   * its index so the sensors match remote navigation.
   */
  const updateScrollButtons = () => {
    const sectionScroll = scrollRef.current;
    const container = stripScrollEl(sectionScroll);
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;

    if (maxScroll <= 1) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const active = document.activeElement;
    const focusedCover =
      active instanceof HTMLElement
        ? active.classList.contains("games-list-cover")
          ? active
          : (active.closest(".games-list-cover") as HTMLElement | null)
        : null;
    if (focusedCover && container.contains(focusedCover)) {
      const covers = Array.from(
        container.querySelectorAll<HTMLElement>(
          ".games-list-cover[role='button'], .games-list-cover[tabindex]",
        ),
      );
      const idx = covers.indexOf(focusedCover);
      if (idx >= 0) {
        setCanScrollLeft(idx > 0 || scrollLeft > 0);
        setCanScrollRight(idx < covers.length - 1 || scrollLeft < maxScroll - 1);
        return;
      }
    }

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < maxScroll - 1);
  };

  const scrollToFirst = () => {
    stripScrollEl(scrollRef.current)?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const scrollToLast = () => {
    const container = stripScrollEl(scrollRef.current);
    if (container) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      container.scrollTo({ left: maxScroll, behavior: "smooth" });
    }
  };

  // Restore position when route or section changes (not when only games.length changes, e.g. IGDB merge)
  useEffect(() => {
    const sectionScroll = scrollRef.current;
    if (!sectionScroll) return;

    if (forceVerticalCovers) {
      setIsRestoring(false);
      return;
    }

    setIsRestoring(true);
    const savedPosition = getScrollPosition(storageKey);

    if (savedPosition <= 0) {
      setIsRestoring(false);
      return;
    }

    // Check when content is ready
    const restoreScroll = (attempt = 0) => {
      const container = stripScrollEl(scrollRef.current);
      if (!container) {
        setIsRestoring(false);
        return;
      }

      // Check that content is rendered (scrollWidth > clientWidth)
      if (container.scrollWidth <= container.clientWidth) {
        if (attempt < 20) {
          // Retry after a frame
          requestAnimationFrame(() => restoreScroll(attempt + 1));
        } else {
          setIsRestoring(false);
        }
        return;
      }

      // Content is ready, restore position
      container.scrollLeft = savedPosition;
      updateScrollButtons();
      setIsRestoring(false);
    };

    // Start restoration after a brief delay to ensure DOM is ready
    const timer = setTimeout(() => {
      restoreScroll();
    }, 100);

    return () => {
      clearTimeout(timer);
      setIsRestoring(false);
    };
  }, [location.pathname, sectionId, storageKey, forceVerticalCovers]);

  // Save position during scroll + re-attach when content changes (e.g. IGDB games merged) so scrollWidth is correct
  useEffect(() => {
    const sectionScroll = scrollRef.current;
    if (!sectionScroll) return;

    if (forceVerticalCovers) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    let attached: HTMLElement | null = null;
    let detachTimer = 0;

    const handleScroll = () => {
      const container = attached ?? stripScrollEl(scrollRef.current);
      if (!container) return;
      if (!isRestoring) {
        setScrollPosition(storageKey, container.scrollLeft);
      }
      updateScrollButtons();
    };

    // Prevent browser navigation during horizontal scroll
    const handleWheel = (e: WheelEvent) => {
      const container = attached ?? stripScrollEl(scrollRef.current);
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const isOverContainer =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isOverContainer) return;

      const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
      if (!hasHorizontalScroll) return;

      const isPrimarilyHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);

      if (isPrimarilyHorizontal || Math.abs(e.deltaX) > 0) {
        e.preventDefault();
        e.stopPropagation();

        const currentScrollLeft = container.scrollLeft;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        const canScrollLeft = currentScrollLeft > 0 && e.deltaX < 0;
        const canScrollRight = currentScrollLeft < maxScrollLeft && e.deltaX > 0;

        if (canScrollLeft || canScrollRight) {
          container.scrollLeft += e.deltaX;
        }
      }
    };

    const attach = (attempt = 0) => {
      const container = stripScrollEl(scrollRef.current);
      if (!container) {
        if (attempt < 40) {
          detachTimer = window.setTimeout(() => attach(attempt + 1), 50);
        }
        return;
      }
      attached = container;
      container.addEventListener("scroll", handleScroll, { passive: true });
      container.addEventListener("wheel", handleWheel, { passive: false, capture: true });
      updateScrollButtons();
    };

    attach();

    return () => {
      window.clearTimeout(detachTimer);
      if (attached) {
        attached.removeEventListener("scroll", handleScroll);
        attached.removeEventListener("wheel", handleWheel);
        const finalPosition = attached.scrollLeft;
        if (finalPosition > 0 && !isRestoring) {
          setScrollPosition(storageKey, finalPosition);
        }
      }
    };
  }, [sectionId, storageKey, isRestoring, games.length, forceVerticalCovers]);

  // Update buttons when content changes (e.g. after IGDB games merged)
  useEffect(() => {
    if (forceVerticalCovers) return;
    updateScrollButtons();
    const timer = setTimeout(updateScrollButtons, 200);
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updateScrollButtons);
    });
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [games.length, forceVerticalCovers]);

  // D-pad focus moves without always firing a meaningful scroll at the ends.
  // Smart TV: skip — nav chevrons are unused and querySelectorAll+setState per focus was hitching strips.
  useEffect(() => {
    if (forceVerticalCovers || isSmartTvBrowser()) return;
    const section = sectionRef.current;
    if (!section) return;

    const onFocusIn = () => {
      updateScrollButtons();
      // ensureElementVisible may adjust scrollLeft just after focus.
      window.requestAnimationFrame(updateScrollButtons);
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget;
      if (next instanceof Node && section.contains(next)) return;
      updateScrollButtons();
    };

    section.addEventListener("focusin", onFocusIn);
    section.addEventListener("focusout", onFocusOut);
    return () => {
      section.removeEventListener("focusin", onFocusIn);
      section.removeEventListener("focusout", onFocusOut);
    };
  }, [forceVerticalCovers, games.length, sectionId]);

  if (games.length === 0) {
    return null;
  }

  return (
    <div
      ref={sectionRef}
      className={[
        "scrollable-section",
        disableVerticalCoverAlignment ? "scrollable-section--classic-covers" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showTitle && (
        <div className="scrollable-section-header">
          <h2 className="scrollable-section-title">
            {titleHref ? (
              <Link to={titleHref} className="scrollable-section-title-link">
                {title}
              </Link>
            ) : (
              title
            )}
          </h2>
          {!forceVerticalCovers && (
            <ScrollableGamesSectionNav
              canScrollLeft={canScrollLeft}
              canScrollRight={canScrollRight}
              onScrollToFirst={scrollToFirst}
              onScrollToLast={scrollToLast}
            />
          )}
        </div>
      )}
      {!showTitle && !forceVerticalCovers && (
        <ScrollableGamesSectionNav
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onScrollToFirst={scrollToFirst}
          onScrollToLast={scrollToLast}
        />
      )}
      <div
        ref={scrollRef}
        className={`scrollable-section-scroll${
          !forceVerticalCovers ? " scrollable-section-scroll--may-virtualize" : ""
        } ${isRestoring ? "restoring" : ""}`}
      >
        {/* Vertical-covers: VirtualizedGamesList needs height on games-list-container (no scrollContainerRef).
            Horizontal rails: pass scrollRef so the strip Grid can measure width and own scrollLeft. */}
        <GamesList
          games={games}
          onGameClick={onGameClick}
          onPlay={onPlay}
          onGameUpdate={onGameUpdate}
          buildCoverUrl={buildCoverUrl}
          coverSize={coverSize}
          allCollections={allCollections}
          enableVirtualization={forceVerticalCovers}
          forceSingleColumnVirtualized={forceVerticalCovers}
          horizontalStripVirtualization={!forceVerticalCovers}
          scrollContainerRef={!forceVerticalCovers ? scrollRef : undefined}
          allCollectionLikes={allCollectionLikes}
          collectionLikeResourceType={collectionLikeResourceType}
          sliderParentCollectionLikeId={sliderParentCollectionLikeId}
          onRemoveChildFromSliderParent={onRemoveChildFromSliderParent}
          onCollectionLikePseudoEdit={onCollectionLikePseudoEdit}
          onPlayFirstInCollectionLike={onPlayFirstInCollectionLike}
          onCollectionLikePseudoAddToParent={onCollectionLikePseudoAddToParent}
          onCollectionLikePseudoUpdated={onCollectionLikePseudoUpdated}
          activeCollectionLikeDetail={activeCollectionLikeDetail}
          activeGameId={activeGameId}
        />
      </div>
    </div>
  );
}
