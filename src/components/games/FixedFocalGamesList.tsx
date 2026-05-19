import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { CollectionInfo, CollectionItem, GameItem } from "../../types";
import type { CollectionLikeResourceType } from "../collections/EditCollectionLikeModal";
import { GameListItem } from "./GamesList";
import { useSkin } from "../../contexts/SkinContext";
import { readFixedFocalGamesTopPx } from "../../utils/readGridTopInsetPx";
import { notifyFixedFocalIndexChange } from "../../utils/fixedFocalStepSound";

const DEFAULT_GAP = 40;
const DEFAULT_MIN_SIDE_GUTTER = 56;
/** Visible neighbor slots above/below the selected cover (XMB-style). */
const FOCAL_NEIGHBOR_SLOTS = 2;

function readGridSpacing(): { gap: number; minLeftGutter: number; minRightGutter: number } {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { gap: DEFAULT_GAP, minLeftGutter: DEFAULT_MIN_SIDE_GUTTER, minRightGutter: DEFAULT_MIN_SIDE_GUTTER };
  }
  const root = getComputedStyle(document.documentElement);
  const gapHalf = parseFloat(root.getPropertyValue("--vgrid-gap-half"));
  const legacyGutter = parseFloat(root.getPropertyValue("--vgrid-side-gutter"));
  const leftGutter = parseFloat(root.getPropertyValue("--vgrid-side-gutter-left"));
  const rightGutter = parseFloat(root.getPropertyValue("--vgrid-side-gutter-right"));
  const gap = Number.isFinite(gapHalf) && gapHalf > 0 ? gapHalf * 2 : DEFAULT_GAP;
  const minLeft =
    Number.isFinite(leftGutter) && leftGutter >= 0
      ? leftGutter
      : Number.isFinite(legacyGutter) && legacyGutter >= 0
        ? legacyGutter
        : DEFAULT_MIN_SIDE_GUTTER;
  const minRight =
    Number.isFinite(rightGutter) && rightGutter >= 0
      ? rightGutter
      : Number.isFinite(legacyGutter) && legacyGutter >= 0
        ? legacyGutter
        : DEFAULT_MIN_SIDE_GUTTER;
  return { gap, minLeftGutter: minLeft, minRightGutter: minRight };
}

function readScaleValues(): { unselected: number; selected: number } {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { unselected: 0.5, selected: 1 };
  }
  const root = getComputedStyle(document.documentElement);
  const rawUnselected = parseFloat(root.getPropertyValue("--mhg-cell-scale-unselected"));
  const rawSelected = parseFloat(root.getPropertyValue("--mhg-cell-scale-selected"));
  return {
    unselected: Number.isFinite(rawUnselected) && rawUnselected > 0 ? rawUnselected : 0.5,
    selected: Number.isFinite(rawSelected) && rawSelected > 0 ? rawSelected : 1,
  };
}

function getScrollPosition(key: string): { scrollTop: number; scrollLeft: number } | null {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return { scrollTop: parsed.scrollTop ?? 0, scrollLeft: parsed.scrollLeft ?? 0 };
  } catch {
    return null;
  }
}

function setScrollPosition(key: string, scrollTop: number, scrollLeft: number): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ scrollTop, scrollLeft }));
  } catch {
    // Ignore
  }
}

export type FixedFocalGamesListProps = {
  games: GameItem[];
  coverSize: number;
  coverCacheBustTimestamp?: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (game: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean, customTimestamp?: number) => string;
  allCollections?: CollectionItem[];
  collectionId?: string;
  onRemoveFromCollection?: (gameId: string) => void;
  developerId?: string;
  publisherId?: string;
  onRemoveFromDeveloper?: (gameId: string) => void;
  onRemoveFromPublisher?: (gameId: string) => void;
  platformIdForPlay?: string;
  allCollectionLikes?: CollectionItem[];
  collectionLikeResourceType?: CollectionLikeResourceType;
  sliderParentCollectionLikeId?: string;
  onRemoveChildFromSliderParent?: (childId: string) => void | Promise<void>;
  onCollectionLikePseudoEdit?: (game: GameItem) => void;
  onPlayFirstInCollectionLike?: (resourceType: string, cid: string) => void | Promise<void>;
  onCollectionLikePseudoAddToParent?: (source: CollectionItem, parentId?: string) => void | Promise<void>;
  onCollectionLikePseudoUpdated?: (updated: CollectionInfo) => void;
};

/**
 * Library rail: cover slots stay at fixed Y positions on screen; wheel / bar
 * input only changes which game is selected (XMB-style). No react-window scroll.
 */
export default function FixedFocalGamesList({
  games,
  coverSize,
  coverCacheBustTimestamp,
  containerRef,
  itemRefs,
  onGameClick,
  onPlay,
  onEditClick,
  onGameDelete,
  onGameUpdate,
  buildCoverUrl,
  allCollections = [],
  collectionId,
  onRemoveFromCollection,
  developerId,
  publisherId,
  onRemoveFromDeveloper,
  onRemoveFromPublisher,
  platformIdForPlay,
  allCollectionLikes,
  collectionLikeResourceType,
  sliderParentCollectionLikeId,
  onRemoveChildFromSliderParent,
  onCollectionLikePseudoEdit,
  onPlayFirstInCollectionLike,
  onCollectionLikePseudoAddToParent,
  onCollectionLikePseudoUpdated,
}: FixedFocalGamesListProps) {
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);
  const storageKey = `${location.pathname}:grid`;
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [spacing, setSpacing] = useState(() => readGridSpacing());
  const [focalTopPx, setFocalTopPx] = useState(() =>
    readFixedFocalGamesTopPx(listRef.current, containerRef.current),
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRestored, setIsRestored] = useState(false);
  const { activeSkinId, activeSkinWeb } = useSkin();

  const { gap: GAP } = spacing;
  const rowHeight = coverSize * 1.5 + GAP;
  const scaleValues = readScaleValues();

  useEffect(() => {
    setSpacing(readGridSpacing());
    setFocalTopPx(readFixedFocalGamesTopPx(listRef.current, containerRef.current));
    const t = window.setTimeout(() => {
      setSpacing(readGridSpacing());
      setFocalTopPx(readFixedFocalGamesTopPx(listRef.current, containerRef.current));
    }, 50);
    return () => window.clearTimeout(t);
  }, [activeSkinId, containerRef]);

  useEffect(() => {
    const updateDimensions = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padBottom = parseFloat(cs.paddingBottom) || 0;
      const padLeft = parseFloat(cs.paddingLeft) || 0;
      const padRight = parseFloat(cs.paddingRight) || 0;
      const contentWidth = Math.max(0, rect.width - padLeft - padRight);
      const contentHeight = Math.max(0, rect.height - padTop - padBottom);
      setDimensions({
        width: contentWidth || rect.width,
        height: contentHeight || rect.height || window.innerHeight - 200,
      });
      setFocalTopPx(readFixedFocalGamesTopPx(listRef.current, containerRef.current));
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (listRef.current) {
      resizeObserver.observe(listRef.current);
    }
    const col1Cover = containerRef.current
      ?.closest(".library-item-detail-context-layout, .tag-games-context-layout")
      ?.querySelector(".library-item-detail-context-rail-cover, .tag-games-context-rail-cover");
    if (col1Cover instanceof HTMLElement) {
      resizeObserver.observe(col1Cover);
    }
    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, [containerRef, dimensions.width, dimensions.height]);

  useLayoutEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;
    setFocalTopPx(readFixedFocalGamesTopPx(listRef.current, containerRef.current));
  }, [containerRef, dimensions.width, dimensions.height, activeSkinId]);

  useLayoutEffect(() => {
    setIsRestored(false);
    if (games.length === 0) {
      setSelectedIndex(0);
      setIsRestored(true);
      return;
    }
    const saved = getScrollPosition(storageKey);
    if (saved && rowHeight > 0) {
      const idx = Math.round(saved.scrollTop / rowHeight);
      setSelectedIndex(Math.max(0, Math.min(games.length - 1, idx)));
    } else {
      setSelectedIndex(0);
    }
    setIsRestored(true);
  }, [location.pathname, games.length, rowHeight, storageKey]);

  useEffect(() => {
    if (!isRestored || rowHeight <= 0) return;
    setScrollPosition(storageKey, selectedIndex * rowHeight, 0);
  }, [selectedIndex, rowHeight, isRestored, storageKey]);

  useEffect(() => {
    setSelectedIndex((prev) => Math.max(0, Math.min(games.length - 1, prev)));
  }, [games.length]);

  const stepIndex = useCallback(
    (direction: 1 | -1) => {
      setSelectedIndex((prev) => {
        const next = Math.max(0, Math.min(games.length - 1, prev + direction));
        notifyFixedFocalIndexChange(prev, next, activeSkinWeb.fixedFocalStepSound);
        return next;
      });
    },
    [games.length, activeSkinWeb.fixedFocalStepSound],
  );
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;

  useEffect(() => {
    let cancelled = false;
    const attachTimers: number[] = [];
    let cleanupFn: (() => void) | null = null;

    const bindWheel = (): boolean => {
      const scrollHost = containerRef.current;
      const listHost = listRef.current;
      if (!scrollHost) return false;

      const onWheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaY) < 0.01 && Math.abs(e.deltaX) < 0.01) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault();
        e.stopPropagation();
        stepIndexRef.current(e.deltaY > 0 ? 1 : -1);
      };

      const onStep = (e: Event) => {
        const direction = (e as CustomEvent<{ direction?: 1 | -1 }>).detail?.direction;
        if (direction === 1 || direction === -1) {
          stepIndexRef.current(direction);
        }
      };

      scrollHost.addEventListener("wheel", onWheel, { passive: false, capture: true });
      listHost?.addEventListener("wheel", onWheel, { passive: false, capture: true });
      document.addEventListener("mhg:fixed-focal-step", onStep);

      cleanupFn = () => {
        scrollHost.removeEventListener("wheel", onWheel, { capture: true });
        listHost?.removeEventListener("wheel", onWheel, { capture: true });
        document.removeEventListener("mhg:fixed-focal-step", onStep);
      };
      return true;
    };

    const tryAttach = (attempt: number) => {
      if (cancelled) return;
      if (bindWheel()) return;
      if (attempt < 60) {
        attachTimers.push(window.setTimeout(() => tryAttach(attempt + 1), 50));
      }
    };

    tryAttach(0);

    return () => {
      cancelled = true;
      attachTimers.forEach((id) => window.clearTimeout(id));
      cleanupFn?.();
    };
  }, [containerRef, dimensions.width, dimensions.height, games.length]);

  const visibleIndices = useMemo(() => {
    if (games.length === 0) return [];
    const lo = Math.max(0, selectedIndex - FOCAL_NEIGHBOR_SLOTS);
    const hi = Math.min(games.length - 1, selectedIndex + FOCAL_NEIGHBOR_SLOTS);
    const indices: number[] = [];
    for (let i = lo; i <= hi; i++) indices.push(i);
    return indices;
  }, [selectedIndex, games.length]);

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div className="virtualized-list-fill" />;
  }

  return (
    <div
      ref={listRef}
      className={`fixed-focal-games-list virtualized-list-fade${
        isRestored ? " virtualized-list-fade--ready" : ""
      }`}
      style={{
        ["--games-list-cover-size" as string]: `${coverSize}px`,
        ["--mhg-fixed-focal-cover-size" as string]: `${coverSize}px`,
        height: dimensions.height,
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
      }}
      tabIndex={-1}
    >
      {visibleIndices.map((index) => {
        const game = games[index];
        const offset = index - selectedIndex;
        const isSelected = offset === 0;
        const top = focalTopPx + offset * rowHeight;

        return (
          <div
            key={game.id}
            ref={(el) => {
              if (!itemRefs?.current) return;
              if (el) itemRefs.current.set(String(game.id), el);
              else itemRefs.current.delete(String(game.id));
            }}
            className={`fixed-focal-games-item virtualized-grid-cell-pad${
              isSelected ? " mhg-cover-scale-selected" : ""
            }`}
            style={{
              position: "absolute",
              left: 0,
              top,
              width: coverSize + GAP,
              height: coverSize * 1.5,
              boxSizing: "border-box",
              ["--mhg-cell-scale" as string]: (
                isSelected ? scaleValues.selected : scaleValues.unselected
              ).toFixed(3),
            }}
          >
            <GameListItem
              game={game}
              onGameClick={onGameClick}
              onPlay={onPlay}
              onEditClick={onEditClick}
              onGameDelete={onGameDelete}
              onGameUpdate={onGameUpdate}
              buildCoverUrl={buildCoverUrl}
              coverSize={coverSize}
              coverCacheBustTimestamp={coverCacheBustTimestamp}
              itemRefs={itemRefs}
              index={index}
              onDragStart={() => {}}
              onDragOver={() => {}}
              onDragEnd={() => {}}
              isDragging={false}
              dragOverIndex={null}
              viewMode="grid"
              allCollections={allCollections}
              collectionId={collectionId}
              onRemoveFromCollection={onRemoveFromCollection}
              developerId={developerId}
              publisherId={publisherId}
              onRemoveFromDeveloper={onRemoveFromDeveloper}
              onRemoveFromPublisher={onRemoveFromPublisher}
              platformIdForPlay={platformIdForPlay}
              allCollectionLikes={allCollectionLikes}
              collectionLikeResourceType={collectionLikeResourceType}
              sliderParentCollectionLikeId={sliderParentCollectionLikeId}
              onRemoveChildFromSliderParent={onRemoveChildFromSliderParent}
              onCollectionLikePseudoEdit={onCollectionLikePseudoEdit}
              onPlayFirstInCollectionLike={onPlayFirstInCollectionLike}
              onCollectionLikePseudoAddToParent={onCollectionLikePseudoAddToParent}
              onCollectionLikePseudoUpdated={onCollectionLikePseudoUpdated}
            />
          </div>
        );
      })}
    </div>
  );
}
