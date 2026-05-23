import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { TagItem } from "../../types";
import { useSkin } from "../../contexts/SkinContext";
import { readGridTopInsetPx, readLibraryBarBandPx } from "../../utils/readGridTopInsetPx";
import { notifyFixedFocalIndexChange } from "../../utils/fixedFocalStepSound";
import { applyWheelDeltaStep, readWheelStepThresholdPx } from "../../utils/stepScrollSnap";
import {
  fixedFocalCoverHeight,
  fixedFocalItemTop,
  fixedFocalVirtualRowStep,
  readFixedFocalNeighborSlots,
  readFixedFocalPackedRows,
} from "../../utils/fixedFocalLayout";
import { TagListItem } from "./TagList";
import {
  CONTEXT_RAIL_COVER_VIEW_TRANSITION,
  contextRailViewTransitionsEnabled,
} from "../../utils/contextRailIndexPeek";

const TAG_GAP_PX = 20;

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

function getSavedScrollTop(key: string): number {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function saveScrollTop(key: string, scrollTop: number): void {
  try {
    sessionStorage.setItem(key, scrollTop.toString());
  } catch {
    // Ignore
  }
}

export type FixedFocalTagListProps = {
  items: TagItem[];
  coverSize: number;
  routeBase: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onItemEdit?: (item: TagItem) => void;
  getDisplayName?: (item: TagItem) => string;
  getCoverUrl?: (item: TagItem) => string;
  getRoute?: (item: TagItem) => string;
  /** Frozen index column (context-rail peek): no wheel, no navigation. */
  lockedSelectedIndex?: number;
  interactive?: boolean;
  /** Narrow blurred lane between context cover and games column. */
  contextRailPeek?: boolean;
  onItemActivate?: (item: TagItem, index: number) => void;
  onSelectionChange?: (item: TagItem | null, index: number) => void;
  restoreSelectedIndex?: number;
  /** Block cover activation until the pointer moves (context-rail return). */
  activationLocked?: boolean;
};

/**
 * Tag index: fixed Y slots under the libraries bar; wheel changes selection only.
 */
export default function FixedFocalTagList({
  items,
  coverSize,
  routeBase,
  containerRef,
  itemRefs,
  onItemEdit,
  getDisplayName,
  getCoverUrl,
  getRoute,
  lockedSelectedIndex,
  interactive = true,
  contextRailPeek = false,
  onItemActivate,
  onSelectionChange,
  restoreSelectedIndex,
  activationLocked = false,
}: FixedFocalTagListProps) {
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);
  const storageKey = `${location.pathname}:${routeBase}`;
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [focalTopPx, setFocalTopPx] = useState(() => readGridTopInsetPx(containerRef.current));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRestored, setIsRestored] = useState(false);
  const { activeSkinId, activeSkinWeb } = useSkin();
  const contextRailCoverTransition = contextRailViewTransitionsEnabled(activeSkinWeb);

  const coverHeight = fixedFocalCoverHeight(coverSize, false);
  const scaleValues = readScaleValues();
  const packedRows = readFixedFocalPackedRows();
  const rowHeight = fixedFocalVirtualRowStep(coverHeight, TAG_GAP_PX, scaleValues.unselected, packedRows);
  const neighborSlots = readFixedFocalNeighborSlots(18);

  const peekFocalTopPx = useMemo(() => {
    const scaledHeight = coverHeight * scaleValues.selected;
    return Math.max(0, Math.round(scaledHeight * 0.5 + TAG_GAP_PX));
  }, [coverHeight, scaleValues.selected]);

  useEffect(() => {
    setFocalTopPx(
      contextRailPeek ? peekFocalTopPx : readGridTopInsetPx(containerRef.current),
    );
    const t = window.setTimeout(() => {
      setFocalTopPx(
        contextRailPeek ? peekFocalTopPx : readGridTopInsetPx(containerRef.current),
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
      const viewportHeight =
        typeof window !== "undefined"
          ? Math.max(window.innerHeight, document.documentElement?.clientHeight ?? 0)
          : 0;
      setDimensions({
        width: contentWidth || rect.width,
        height: Math.max(contentHeight, rect.height, viewportHeight) || viewportHeight - 200,
      });
      setFocalTopPx(
        contextRailPeek ? peekFocalTopPx : readGridTopInsetPx(containerRef.current),
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
  }, [containerRef, activeSkinId, contextRailPeek, peekFocalTopPx]);

  useLayoutEffect(() => {
    setIsRestored(false);
    if (items.length === 0) {
      setSelectedIndex(0);
      setIsRestored(true);
      return;
    }
    if (!interactive && lockedSelectedIndex !== undefined) {
      setSelectedIndex(Math.max(0, Math.min(items.length - 1, lockedSelectedIndex)));
      setIsRestored(true);
      return;
    }
    if (interactive && restoreSelectedIndex !== undefined) {
      const idx = Math.max(0, Math.min(items.length - 1, restoreSelectedIndex));
      setSelectedIndex(idx);
      if (rowHeight > 0) {
        saveScrollTop(storageKey, idx * rowHeight);
      }
      setIsRestored(true);
      return;
    }
    const saved = getSavedScrollTop(storageKey);
    if (saved > 0 && rowHeight > 0) {
      const idx = Math.round(saved / rowHeight);
      setSelectedIndex(Math.max(0, Math.min(items.length - 1, idx)));
    } else {
      setSelectedIndex(0);
    }
    setIsRestored(true);
  }, [
    location.pathname,
    items.length,
    rowHeight,
    storageKey,
    interactive,
    lockedSelectedIndex,
    restoreSelectedIndex,
  ]);

  useEffect(() => {
    if (!interactive || !isRestored || rowHeight <= 0) return;
    saveScrollTop(storageKey, selectedIndex * rowHeight);
  }, [selectedIndex, rowHeight, isRestored, storageKey, interactive]);

  useEffect(() => {
    if (!interactive || lockedSelectedIndex === undefined) return;
    setSelectedIndex(Math.max(0, Math.min(items.length - 1, lockedSelectedIndex)));
  }, [interactive, lockedSelectedIndex, items.length]);

  useEffect(() => {
    if (!onSelectionChange || !isRestored) return;
    const item = items.length > 0 ? items[selectedIndex] ?? null : null;
    onSelectionChange(item, selectedIndex);
  }, [items, selectedIndex, onSelectionChange, isRestored]);

  useEffect(() => {
    setSelectedIndex((prev) => Math.max(0, Math.min(items.length - 1, prev)));
  }, [items.length]);

  const stepIndex = useCallback(
    (direction: 1 | -1) => {
      setSelectedIndex((prev) => {
        const next = Math.max(0, Math.min(items.length - 1, prev + direction));
        notifyFixedFocalIndexChange(prev, next, activeSkinWeb.fixedFocalStepSound);
        return next;
      });
    },
    [items.length, activeSkinWeb.fixedFocalStepSound],
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

      const onRestore = (e: Event) => {
        const scrollTop = (e as CustomEvent<{ scrollTop?: number }>).detail?.scrollTop;
        if (scrollTop === undefined || rowHeight <= 0) return;
        const idx = Math.round(scrollTop / rowHeight);
        setSelectedIndex(Math.max(0, Math.min(items.length - 1, idx)));
      };

      scrollHost.addEventListener("wheel", onWheel, { passive: false, capture: true });
      listHost?.addEventListener("wheel", onWheel, { passive: false, capture: true });
      document.addEventListener("mhg:fixed-focal-step", onStep);
      document.addEventListener("mhg:fixed-focal-restore", onRestore);

      cleanupFn = () => {
        scrollHost.removeEventListener("wheel", onWheel, { capture: true });
        listHost?.removeEventListener("wheel", onWheel, { capture: true });
        document.removeEventListener("mhg:fixed-focal-step", onStep);
        document.removeEventListener("mhg:fixed-focal-restore", onRestore);
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
  }, [containerRef, dimensions.width, dimensions.height, items.length, rowHeight, interactive]);

  const visibleIndices = useMemo(() => {
    if (items.length === 0) return [];
    const lo = Math.max(0, selectedIndex - neighborSlots);
    const hi = Math.min(items.length - 1, selectedIndex + neighborSlots);
    const indices: number[] = [];
    for (let i = lo; i <= hi; i++) indices.push(i);
    return indices;
  }, [selectedIndex, items.length, neighborSlots]);

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div className="virtualized-list-fill" />;
  }

  return (
    <div
      ref={listRef}
      className={`fixed-focal-tag-list tag-list-container virtualized-list-fade${
        isRestored ? " virtualized-list-fade--ready" : ""
      }${activationLocked ? " mhg-context-rail-activation-locked" : ""}`}
      style={{
        ["--tag-list-cover-size" as string]: `${coverSize}px`,
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {visibleIndices.map((index) => {
        const item = items[index];
        const offset = index - selectedIndex;
        const isSelected = offset === 0;
        const laneWidth =
          contextRailPeek && dimensions.width > 0
            ? dimensions.width
            : undefined;
        const top = fixedFocalItemTop(
          focalTopPx,
          offset,
          coverHeight,
          TAG_GAP_PX,
          scaleValues.unselected,
          packedRows,
          readLibraryBarBandPx(listRef.current),
        );

        return (
          <div
            key={String(item.id)}
            className={`fixed-focal-tag-item${isSelected ? " mhg-cover-scale-selected" : ""}`}
            style={{
              position: "absolute",
              left: 0,
              top,
              width: laneWidth ?? "min(var(--mhg-tag-vertical-column-width, var(--mhg-vertical-column-width)), calc(100vw - var(--mhg-vertical-column-viewport-margin, 72px)))",
              minWidth:
                laneWidth ??
                "min(var(--mhg-tag-vertical-column-width, var(--mhg-vertical-column-width)), calc(100vw - var(--mhg-vertical-column-viewport-margin, 72px)))",
              maxWidth: laneWidth,
              height: coverHeight,
              minHeight: coverHeight,
              maxHeight: coverHeight,
              overflow: "visible",
              boxSizing: "border-box",
              ["--mhg-cell-scale" as string]: (
                isSelected ? scaleValues.selected : scaleValues.unselected
              ).toFixed(3),
            }}
          >
            <TagListItem
              item={item}
              coverSize={coverSize}
              forceVerticalAlignment={true}
              isSelected={isSelected}
              itemRefs={itemRefs}
              onItemEdit={interactive ? onItemEdit : undefined}
              getDisplayName={getDisplayName}
              getCoverUrl={getCoverUrl}
              getRoute={getRoute}
              navigationDisabled={!interactive || activationLocked}
              onActivate={
                interactive && !activationLocked && onItemActivate
                  ? () => onItemActivate(item, index)
                  : undefined
              }
              viewTransitionName={
                interactive && isSelected && contextRailCoverTransition
                  ? CONTEXT_RAIL_COVER_VIEW_TRANSITION
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
