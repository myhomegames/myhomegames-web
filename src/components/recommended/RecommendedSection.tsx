import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import GamesList from "../games/GamesList";
import RecommendedSectionNav from "./RecommendedSectionNav";
import type { GameItem, CollectionItem } from "../../types";
import { buildCoverUrl } from "../../utils/api";
import "./RecommendedSection.css";

// Helper per sessionStorage
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

type RecommendedSectionProps = {
  sectionId: string;
  games: GameItem[];
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  coverSize: number;
  allCollections?: CollectionItem[];
};

export default function RecommendedSection({
  sectionId,
  games,
  onGameClick,
  onPlay,
  onGameUpdate,
  coverSize,
  allCollections = [],
}: RecommendedSectionProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const storageKey = `${location.pathname}:${sectionId}`;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  const titleKey = `recommended.${sectionId}`;
  const title = t(titleKey, { defaultValue: sectionId });

  const updateScrollButtons = () => {
    const container = scrollRef.current;
    if (!container) return;
    
    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < maxScroll - 1);
  };

  const scrollToFirst = () => {
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const scrollToLast = () => {
    const container = scrollRef.current;
    if (container) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      container.scrollTo({ left: maxScroll, behavior: 'smooth' });
    }
  };

  // Restore position when route or section changes
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    setIsRestoring(true);
    const savedPosition = getScrollPosition(storageKey);

    if (savedPosition <= 0) {
      setIsRestoring(false);
      return;
    }

    // Check when content is ready
    const restoreScroll = (attempt = 0) => {
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
  }, [location.pathname, sectionId, storageKey, games.length]);

  // Save position during scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!isRestoring) {
        setScrollPosition(storageKey, container.scrollLeft);
      }
      updateScrollButtons();
    };

    // Prevent browser navigation during horizontal scroll
    const handleWheel = (e: WheelEvent) => {
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

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      // Save final position when component is unmounted
      const finalPosition = container.scrollLeft;
      if (finalPosition > 0 && !isRestoring) {
        setScrollPosition(storageKey, finalPosition);
      }
    };
  }, [sectionId, storageKey, isRestoring]);

  // Update buttons when content changes
  useEffect(() => {
    updateScrollButtons();
    const timer = setTimeout(updateScrollButtons, 200);
    return () => clearTimeout(timer);
  }, [games.length]);

  if (games.length === 0) {
    return null;
  }


  return (
    <div className="recommended-section">
      <div className="recommended-section-header">
        <h2 className="recommended-section-title">{title}</h2>
        <RecommendedSectionNav
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onScrollToFirst={scrollToFirst}
          onScrollToLast={scrollToLast}
        />
      </div>
      <div
        ref={scrollRef}
        className={`recommended-section-scroll ${isRestoring ? 'restoring' : ''}`}
      >
        <GamesList
          games={games}
          onGameClick={onGameClick}
          onPlay={onPlay}
          onGameUpdate={onGameUpdate}
          buildCoverUrl={buildCoverUrl}
          coverSize={coverSize}
          allCollections={allCollections}
        />
      </div>
    </div>
  );
}
