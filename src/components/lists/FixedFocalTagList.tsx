import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { TagItem } from "../../types";
import { useSkin } from "../../contexts/SkinContext";
import { readGridTopInsetPx } from "../../utils/readGridTopInsetPx";
import { notifyFixedFocalIndexChange } from "../../utils/fixedFocalStepSound";
import { TagListItem } from "./TagList";

const TAG_GAP_PX = 20;
const RENDER_RADIUS = 18;

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
}: FixedFocalTagListProps) {
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);
  const storageKey = `${location.pathname}:${routeBase}`;
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [focalTopPx, setFocalTopPx] = useState(() => readGridTopInsetPx(containerRef.current));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRestored, setIsRestored] = useState(false);
  const { activeSkinId, activeSkinWeb } = useSkin();

  const coverHeight = coverSize * (9 / 16);
  const rowHeight = coverHeight + TAG_GAP_PX;
  const scaleValues = readScaleValues();

  useEffect(() => {
    setFocalTopPx(readGridTopInsetPx(containerRef.current));
    const t = window.setTimeout(() => {
      setFocalTopPx(readGridTopInsetPx(containerRef.current));
    }, 50);
    return () => window.clearTimeout(t);
  }, [activeSkinId, containerRef]);

  useEffect(() => {
    const updateDimensions = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const padLeft = parseFloat(cs.paddingLeft) || 0;
      const padRight = parseFloat(cs.paddingRight) || 0;
      setDimensions({
        width: Math.max(0, rect.width - padLeft - padRight) || rect.width,
        height: rect.height || window.innerHeight - 200,
      });
      setFocalTopPx(readGridTopInsetPx(containerRef.current));
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, [containerRef, activeSkinId]);

  useLayoutEffect(() => {
    setIsRestored(false);
    if (items.length === 0) {
      setSelectedIndex(0);
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
  }, [location.pathname, items.length, rowHeight, storageKey]);

  useEffect(() => {
    if (!isRestored || rowHeight <= 0) return;
    saveScrollTop(storageKey, selectedIndex * rowHeight);
  }, [selectedIndex, rowHeight, isRestored, storageKey]);

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
  }, [containerRef, dimensions.width, dimensions.height, items.length, rowHeight]);

  const visibleIndices = useMemo(() => {
    if (items.length === 0) return [];
    const lo = Math.max(0, selectedIndex - RENDER_RADIUS);
    const hi = Math.min(items.length - 1, selectedIndex + RENDER_RADIUS);
    const indices: number[] = [];
    for (let i = lo; i <= hi; i++) indices.push(i);
    return indices;
  }, [selectedIndex, items.length]);

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div className="virtualized-list-fill" />;
  }

  return (
    <div
      ref={listRef}
      className={`fixed-focal-tag-list tag-list-container virtualized-list-fade${
        isRestored ? " virtualized-list-fade--ready" : ""
      }`}
      style={{
        ["--tag-list-cover-size" as string]: `${coverSize}px`,
        height: dimensions.height,
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {visibleIndices.map((index) => {
        const item = items[index];
        const offset = index - selectedIndex;
        const isSelected = offset === 0;
        const top = focalTopPx + offset * rowHeight;

        return (
          <div
            key={String(item.id)}
            className={`fixed-focal-tag-item${isSelected ? " mhg-cover-scale-selected" : ""}`}
            style={{
              position: "absolute",
              left: 0,
              top,
              width: "min(var(--mhg-vertical-column-width), calc(100vw - 140px))",
              minWidth: "min(var(--mhg-vertical-column-width), calc(100vw - 140px))",
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
              itemRefs={itemRefs}
              onItemEdit={onItemEdit}
              getDisplayName={getDisplayName}
              getCoverUrl={getCoverUrl}
              getRoute={getRoute}
            />
          </div>
        );
      })}
    </div>
  );
}
