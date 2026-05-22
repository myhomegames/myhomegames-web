import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSkin } from "../../contexts/SkinContext";
import {
  readActiveLibraryIconBandPx,
  readActiveLibraryIconLeftXPx,
  readRecommendedStripFocalTopPx,
  readRecommendedStripTitleAnchorInsetLeftPx,
} from "../../utils/readGridTopInsetPx";
import { notifyFixedFocalIndexChange } from "../../utils/fixedFocalStepSound";
import { applyWheelDeltaStep, readWheelStepThresholdPx } from "../../utils/stepScrollSnap";
import {
  fixedFocalRecommendedStripTitleTop,
  readFixedFocalNeighborSlots,
  readFixedFocalPackedRows,
} from "../../utils/fixedFocalLayout";

export type RecommendedSectionRow = {
  id: string;
  title: string;
};

function readRecommendedSectionGapPx(fallback = 40): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--mhg-recommended-section-gap"),
  );
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

function readRecommendedSectionRowHeightPx(fallback = 72): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--mhg-recommended-section-row-height"),
  );
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
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

function getSavedSectionIndex(key: string): number {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function saveSectionIndex(key: string, index: number): void {
  try {
    sessionStorage.setItem(key, index.toString());
  } catch {
    // Ignore
  }
}

export type FixedFocalRecommendedSectionsListProps = {
  sections: RecommendedSectionRow[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSectionClick: (section: RecommendedSectionRow) => void;
};

/**
 * Recommended index: fixed Y slots for section titles; wheel changes selection only.
 */
export default function FixedFocalRecommendedSectionsList({
  sections,
  containerRef,
  onSectionClick,
}: FixedFocalRecommendedSectionsListProps) {
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);
  const storageKey = `${location.pathname}:recommended-strip`;
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [focalTopPx, setFocalTopPx] = useState(() => readRecommendedStripFocalTopPx(listRef.current));
  const [iconAnchorLeftPx, setIconAnchorLeftPx] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRestored, setIsRestored] = useState(false);
  const { activeSkinId, activeSkinWeb } = useSkin();

  const rowHeightPx = readRecommendedSectionRowHeightPx();
  const sectionGapPx = readRecommendedSectionGapPx();
  const scaleValues = readScaleValues();
  const packedRows = readFixedFocalPackedRows();
  const neighborSlots = readFixedFocalNeighborSlots(18);

  const syncIconAnchorLeft = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const iconLeftX = readActiveLibraryIconLeftXPx();
    if (iconLeftX == null) return;
    const listLeft = list.getBoundingClientRect().left;
    const inset = readRecommendedStripTitleAnchorInsetLeftPx();
    setIconAnchorLeftPx(iconLeftX - listLeft + inset);
  }, []);

  useEffect(() => {
    setFocalTopPx(readRecommendedStripFocalTopPx(listRef.current));
    syncIconAnchorLeft();
    const t = window.setTimeout(() => {
      setFocalTopPx(readRecommendedStripFocalTopPx(listRef.current));
      syncIconAnchorLeft();
    }, 50);
    return () => window.clearTimeout(t);
  }, [activeSkinId, syncIconAnchorLeft]);

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
      setFocalTopPx(readRecommendedStripFocalTopPx(listRef.current));
      syncIconAnchorLeft();
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (listRef.current) resizeObserver.observe(listRef.current);
    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, [containerRef, activeSkinId, syncIconAnchorLeft]);

  useLayoutEffect(() => {
    setIsRestored(false);
    if (sections.length === 0) {
      setSelectedIndex(0);
      setIsRestored(true);
      return;
    }
    const saved = getSavedSectionIndex(storageKey);
    setSelectedIndex(Math.max(0, Math.min(sections.length - 1, saved)));
    setIsRestored(true);
  }, [location.pathname, sections.length, storageKey]);

  useEffect(() => {
    if (!isRestored) return;
    saveSectionIndex(storageKey, selectedIndex);
  }, [selectedIndex, isRestored, storageKey]);

  useEffect(() => {
    setSelectedIndex((prev) => Math.max(0, Math.min(sections.length - 1, prev)));
  }, [sections.length]);

  const stepIndex = useCallback(
    (direction: 1 | -1) => {
      setSelectedIndex((prev) => {
        const next = Math.max(0, Math.min(sections.length - 1, prev + direction));
        notifyFixedFocalIndexChange(prev, next, activeSkinWeb.fixedFocalStepSound);
        return next;
      });
    },
    [sections.length, activeSkinWeb.fixedFocalStepSound],
  );
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const wheelAccumRef = useRef({ accumulated: 0 });

  useEffect(() => {
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
        if (direction === 1 || direction === -1) stepIndexRef.current(direction);
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
      if (attempt < 60) attachTimers.push(window.setTimeout(() => tryAttach(attempt + 1), 50));
    };

    tryAttach(0);
    return () => {
      cancelled = true;
      attachTimers.forEach((id) => window.clearTimeout(id));
      cleanupFn?.();
    };
  }, [containerRef, dimensions.width, dimensions.height, sections.length]);

  const visibleIndices = useMemo(() => {
    if (sections.length === 0) return [];
    const lo = Math.max(0, selectedIndex - neighborSlots);
    const hi = Math.min(sections.length - 1, selectedIndex + neighborSlots);
    const indices: number[] = [];
    for (let i = lo; i <= hi; i++) indices.push(i);
    return indices;
  }, [selectedIndex, sections.length, neighborSlots]);

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div className="virtualized-list-fill" />;
  }

  return (
    <div
      ref={listRef}
      className={`fixed-focal-recommended-strips-list recommended-strips-list virtualized-list-fade${
        isRestored ? " virtualized-list-fade--ready" : ""
      }`}
      style={{
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        height: dimensions.height,
      }}
      tabIndex={-1}
    >
      {visibleIndices.map((index) => {
        const section = sections[index];
        const offset = index - selectedIndex;
        const isSelected = offset === 0;
        const top = fixedFocalRecommendedStripTitleTop(
          focalTopPx,
          offset,
          rowHeightPx,
          sectionGapPx,
          scaleValues.unselected,
          packedRows,
          readActiveLibraryIconBandPx(listRef.current),
          scaleValues.selected,
        );

        return (
          <div
            key={section.id}
            className={`fixed-focal-recommended-strip-item${isSelected ? " mhg-cover-scale-selected" : ""}`}
            style={{
              position: "absolute",
              left: iconAnchorLeftPx,
              top,
              width: "max-content",
              maxWidth:
                "min(var(--mhg-tag-vertical-column-width, var(--mhg-vertical-column-width)), calc(100vw - var(--mhg-active-library-icon-left-x, 0px) - var(--mhg-vertical-column-viewport-margin, 72px) - var(--mhg-recommended-strip-title-anchor-inset-left, 0px)))",
              boxSizing: "border-box",
              minHeight: rowHeightPx,
              ["--mhg-cell-scale" as string]: (
                isSelected ? scaleValues.selected : scaleValues.unselected
              ).toFixed(3),
            }}
          >
            <button
              type="button"
              className="recommended-strip-title-button scrollable-section-title recommended-strip-title"
              onClick={() => onSectionClick(section)}
            >
              {section.title}
            </button>
          </div>
        );
      })}
    </div>
  );
}
