import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { CollectionItem } from "../../types";
import type { GamesPathType } from "./CollectionsList";
import { CollectionListItem } from "./CollectionsList";
import { useSkin } from "../../contexts/SkinContext";
import { readFixedFocalTopPx, readLibraryBarBandPx } from "../../utils/readGridTopInsetPx";
import { notifyFixedFocalIndexChange } from "../../utils/fixedFocalStepSound";
import { applyWheelDeltaStep, readWheelStepThresholdPx } from "../../utils/stepScrollSnap";
import { portraitCoverHeight } from "../../utils/coverPortrait";
import {
  fixedFocalCoverHeight,
  fixedFocalItemTop,
  fixedFocalVirtualRowStep,
  readFixedFocalNeighborSlots,
  readFixedFocalPackedRows,
} from "../../utils/fixedFocalLayout";

const DEFAULT_GAP = 40;
const DEFAULT_MIN_SIDE_GUTTER = 56;

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

export type FixedFocalCollectionsListProps = {
  collections: CollectionItem[];
  displayCountById: Record<string, number | undefined>;
  coverSize: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onCollectionClick: (collection: CollectionItem) => void;
  onPlay?: (game: import("../../types").GameItem) => void;
  onEditClick?: (collection: CollectionItem) => void;
  onCollectionDelete?: (deletedCollection: CollectionItem) => void;
  onCollectionUpdate?: (updatedCollection: CollectionItem) => void;
  onAddToCollectionLike?: (collection: CollectionItem, parentId?: string) => void;
  allCollectionLikes?: CollectionItem[];
  gamesPath?: GamesPathType;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  onSelectionChange?: (collection: CollectionItem | null) => void;
  lockedSelectedIndex?: number;
  interactive?: boolean;
  contextRailPeek?: boolean;
  onCollectionActivate?: (collection: CollectionItem, index: number) => void;
};

/**
 * Collection-like rail: fixed Y slots; wheel changes selection only (XMB-style).
 */
export default function FixedFocalCollectionsList({
  collections,
  displayCountById,
  coverSize,
  containerRef,
  itemRefs,
  onCollectionClick,
  onPlay,
  onEditClick,
  onCollectionDelete,
  onCollectionUpdate,
  onAddToCollectionLike,
  allCollectionLikes = [],
  gamesPath = "collections",
  buildCoverUrl,
  onSelectionChange,
  lockedSelectedIndex,
  interactive = true,
  contextRailPeek = false,
  onCollectionActivate,
}: FixedFocalCollectionsListProps) {
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);
  const storageKey = `${location.pathname}:collections:${gamesPath}`;
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [spacing, setSpacing] = useState(() => readGridSpacing());
  const [focalTopPx, setFocalTopPx] = useState(() =>
    readFixedFocalTopPx(listRef.current, containerRef.current),
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRestored, setIsRestored] = useState(false);
  const { activeSkinId, activeSkinWeb } = useSkin();

  const { gap: GAP } = spacing;
  const scaleValues = readScaleValues();
  const packedRows = readFixedFocalPackedRows();
  const coverHeight = fixedFocalCoverHeight(coverSize, true);
  const rowHeight = fixedFocalVirtualRowStep(coverHeight, GAP, scaleValues.unselected, packedRows);
  const neighborSlots = readFixedFocalNeighborSlots(18);

  const peekFocalTopPx = useMemo(() => {
    const scaledHeight = coverHeight * scaleValues.selected;
    return Math.max(0, Math.round(scaledHeight * 0.5 + GAP));
  }, [coverHeight, scaleValues.selected, GAP]);

  useEffect(() => {
    setSpacing(readGridSpacing());
    setFocalTopPx(
      contextRailPeek
        ? peekFocalTopPx
        : readFixedFocalTopPx(listRef.current, containerRef.current),
    );
    const t = window.setTimeout(() => {
      setSpacing(readGridSpacing());
      setFocalTopPx(
        contextRailPeek
          ? peekFocalTopPx
          : readFixedFocalTopPx(listRef.current, containerRef.current),
      );
    }, 50);
    return () => window.clearTimeout(t);
  }, [activeSkinId, containerRef, contextRailPeek, peekFocalTopPx]);

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
      setFocalTopPx(
        contextRailPeek
          ? peekFocalTopPx
          : readFixedFocalTopPx(listRef.current, containerRef.current),
      );
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
    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, [containerRef, dimensions.width, dimensions.height, contextRailPeek, peekFocalTopPx]);

  useLayoutEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;
    setFocalTopPx(
      contextRailPeek
        ? peekFocalTopPx
        : readFixedFocalTopPx(listRef.current, containerRef.current),
    );
  }, [containerRef, dimensions.width, dimensions.height, activeSkinId, contextRailPeek, peekFocalTopPx]);

  useLayoutEffect(() => {
    setIsRestored(false);
    if (collections.length === 0) {
      setSelectedIndex(0);
      setIsRestored(true);
      return;
    }
    if (!interactive && lockedSelectedIndex !== undefined) {
      setSelectedIndex(Math.max(0, Math.min(collections.length - 1, lockedSelectedIndex)));
      setIsRestored(true);
      return;
    }
    const saved = getScrollPosition(storageKey);
    if (saved && rowHeight > 0) {
      const idx = Math.round(saved.scrollTop / rowHeight);
      setSelectedIndex(Math.max(0, Math.min(collections.length - 1, idx)));
    } else {
      setSelectedIndex(0);
    }
    setIsRestored(true);
  }, [location.pathname, collections.length, rowHeight, storageKey, gamesPath, interactive, lockedSelectedIndex]);

  useEffect(() => {
    if (!interactive || !isRestored || rowHeight <= 0) return;
    setScrollPosition(storageKey, selectedIndex * rowHeight, 0);
  }, [selectedIndex, rowHeight, isRestored, storageKey, interactive]);

  useEffect(() => {
    if (!interactive || lockedSelectedIndex === undefined) return;
    setSelectedIndex(Math.max(0, Math.min(collections.length - 1, lockedSelectedIndex)));
  }, [interactive, lockedSelectedIndex, collections.length]);

  useEffect(() => {
    setSelectedIndex((prev) => Math.max(0, Math.min(collections.length - 1, prev)));
  }, [collections.length]);

  useEffect(() => {
    if (!onSelectionChange || !isRestored) return;
    onSelectionChange(collections.length > 0 ? collections[selectedIndex] ?? null : null);
  }, [collections, selectedIndex, onSelectionChange, isRestored]);

  const stepIndex = useCallback(
    (direction: 1 | -1) => {
      setSelectedIndex((prev) => {
        const next = Math.max(0, Math.min(collections.length - 1, prev + direction));
        notifyFixedFocalIndexChange(prev, next, activeSkinWeb.fixedFocalStepSound);
        return next;
      });
    },
    [collections.length, activeSkinWeb.fixedFocalStepSound],
  );
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const wheelAccumRef = useRef({ accumulated: 0 });

  useEffect(() => {
    if (!interactive) return;
    let cancelled = false;
    const attachTimers: number[] = [];
    let cleanupFn: (() => void) | null = null;

    const bindWheel = (): boolean => {
      const scrollHost = containerRef.current;
      const listHost = listRef.current;
      if (!scrollHost) return false;

      wheelAccumRef.current.accumulated = 0;
      const wheelThresholdPx = readWheelStepThresholdPx(scrollHost);

      const onWheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaY) < 0.01 && Math.abs(e.deltaX) < 0.01) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault();
        e.stopPropagation();
        applyWheelDeltaStep(wheelAccumRef.current, e.deltaY, wheelThresholdPx, (direction) => {
          stepIndexRef.current(direction);
        });
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
  }, [containerRef, dimensions.width, dimensions.height, collections.length, interactive]);

  const visibleIndices = useMemo(() => {
    if (collections.length === 0) return [];
    const lo = Math.max(0, selectedIndex - neighborSlots);
    const hi = Math.min(collections.length - 1, selectedIndex + neighborSlots);
    const indices: number[] = [];
    for (let i = lo; i <= hi; i++) indices.push(i);
    return indices;
  }, [selectedIndex, collections.length, neighborSlots]);

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div className="virtualized-list-fill" />;
  }

  return (
    <div
      ref={listRef}
      className={`fixed-focal-collections-list collections-list-container collections-list-container--fixed-focal virtualized-list-fade${
        isRestored ? " virtualized-list-fade--ready" : ""
      }`}
      style={{
        ["--collections-list-cover-size" as string]: `${coverSize}px`,
        ["--mhg-fixed-focal-cover-size" as string]: `${coverSize}px`,
        height: dimensions.height,
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
      }}
      tabIndex={-1}
    >
      {visibleIndices.map((index) => {
        const collection = collections[index];
        const offset = index - selectedIndex;
        const isSelected = offset === 0;
        const laneWidth =
          contextRailPeek && dimensions.width > 0 ? dimensions.width : coverSize + GAP;
        const top = fixedFocalItemTop(
          focalTopPx,
          offset,
          coverHeight,
          GAP,
          scaleValues.unselected,
          packedRows,
          readLibraryBarBandPx(listRef.current),
        );

        return (
          <div
            key={String(collection.id)}
            ref={(el) => {
              if (!itemRefs?.current) return;
              if (el) itemRefs.current.set(String(collection.id), el);
              else itemRefs.current.delete(String(collection.id));
            }}
            className={`fixed-focal-collections-item virtualized-grid-cell-pad${
              isSelected ? " mhg-cover-scale-selected" : ""
            }`}
            style={{
              position: "absolute",
              left: 0,
              top,
              width: laneWidth,
              minHeight: portraitCoverHeight(coverSize),
              boxSizing: "border-box",
              ["--mhg-cell-scale" as string]: (
                isSelected ? scaleValues.selected : scaleValues.unselected
              ).toFixed(3),
            }}
          >
            <CollectionListItem
              collection={collection}
              displayCount={displayCountById[String(collection.id)]}
              onCollectionClick={
                interactive
                  ? onCollectionActivate
                    ? () => onCollectionActivate(collection, index)
                    : onCollectionClick
                  : () => {}
              }
              navigationDisabled={!interactive}
              viewTransitionName={interactive && isSelected ? "mhg-context-rail-cover" : undefined}
              onPlay={onPlay}
              onEditClick={onEditClick}
              onCollectionDelete={onCollectionDelete}
              onCollectionUpdate={onCollectionUpdate}
              onAddToCollectionLike={onAddToCollectionLike}
              allCollectionLikes={allCollectionLikes}
              gamesPath={gamesPath}
              buildCoverUrl={buildCoverUrl}
              coverSize={coverSize}
              itemRefs={itemRefs}
            />
          </div>
        );
      })}
    </div>
  );
}
