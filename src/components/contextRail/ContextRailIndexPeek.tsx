import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Cover from "../games/Cover";
import type { ContextRailIndexPeekSnapshot } from "../../utils/contextRailIndexPeek";
import { buildCoverUrl } from "../../utils/api";
import { API_BASE } from "../../config";
import { useSkin } from "../../contexts/SkinContext";
import {
  readFixedFocalTopPx,
  readLibraryBarBandPx,
  type LibraryBarBandPx,
} from "../../utils/readGridTopInsetPx";
import {
  fixedFocalCoverHeight,
  fixedFocalItemTop,
  fixedFocalVirtualRowStep,
  readFixedFocalNeighborSlots,
  readFixedFocalPackedRows,
} from "../../utils/fixedFocalLayout";

/** Shift the peek column up by this many index fixed-focal rows. */
const PEEK_LIFT_COVER_ROWS_COLLECTION = 3;
const PEEK_LIFT_COVER_ROWS_TAG = 2;

type ContextRailIndexPeekProps = {
  snapshot: ContextRailIndexPeekSnapshot;
};

const TAG_GAP_PX = 20;
const COLLECTION_GAP_PX = 40;

type PeekLayout = {
  yShift: number;
  topPad: number;
  minHeight: number;
};

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

function computePeekLiftPx(
  focalTopPx: number,
  coverHeight: number,
  gap: number,
  unselected: number,
  packed: boolean,
  librariesStripBand: LibraryBarBandPx | null,
  liftRows: number,
): number {
  const step = fixedFocalVirtualRowStep(coverHeight, gap, unselected, packed);
  const top0 = fixedFocalItemTop(
    focalTopPx,
    0,
    coverHeight,
    gap,
    unselected,
    packed,
    librariesStripBand,
  );
  const topBefore = fixedFocalItemTop(
    focalTopPx,
    -liftRows,
    coverHeight,
    gap,
    unselected,
    packed,
    librariesStripBand,
  );
  const fromLayout = top0 - topBefore;
  if (Number.isFinite(fromLayout) && fromLayout > 0) {
    return Math.round(fromLayout);
  }
  return Math.round(liftRows * step);
}

/**
 * Blurred neighbor covers from the index column (between arrow and games).
 * Positions match the index fixed-focal list using a captured layout anchor.
 */
export default function ContextRailIndexPeek({ snapshot }: ContextRailIndexPeekProps) {
  const { selectedIndex, coverSize, kind, items, focalTopPx, listViewportTop } = snapshot;
  const stackRef = useRef<HTMLDivElement>(null);
  const [peekLayout, setPeekLayout] = useState<PeekLayout>({
    yShift: 0,
    topPad: 0,
    minHeight: 0,
  });
  const { activeSkinId } = useSkin();

  const isTag = kind === "tag";
  const gap = isTag ? TAG_GAP_PX : COLLECTION_GAP_PX;
  const scaleValues = readScaleValues();
  const packedRows = readFixedFocalPackedRows();
  const coverHeight = fixedFocalCoverHeight(coverSize, !isTag);
  const neighborSlots = readFixedFocalNeighborSlots(18);
  const tileHeight = isTag ? Math.round(coverSize * (9 / 16)) : Math.round(coverSize * 1.3325);

  const neighborEntries = useMemo(() => {
    if (items.length === 0) return [];
    const lo = Math.max(0, selectedIndex - neighborSlots);
    const hi = Math.min(items.length - 1, selectedIndex + neighborSlots);
    const entries: { index: number; offset: number }[] = [];
    for (let index = lo; index <= hi; index++) {
      const offset = index - selectedIndex;
      if (offset === 0) continue;
      entries.push({ index, offset });
    }
    return entries;
  }, [items.length, selectedIndex, neighborSlots]);

  const resolvedFocalTopPx = useMemo(() => {
    if (Number.isFinite(focalTopPx) && focalTopPx > 0) return focalTopPx;
    return readFixedFocalTopPx(stackRef.current, null);
  }, [focalTopPx]);

  const librariesStripBand = readLibraryBarBandPx(stackRef.current);
  const peekLiftRows = isTag ? PEEK_LIFT_COVER_ROWS_TAG : PEEK_LIFT_COVER_ROWS_COLLECTION;

  const peekLiftPx = useMemo(
    () =>
      computePeekLiftPx(
        resolvedFocalTopPx,
        coverHeight,
        gap,
        scaleValues.unselected,
        packedRows,
        librariesStripBand,
        peekLiftRows,
      ),
    [
      resolvedFocalTopPx,
      coverHeight,
      gap,
      scaleValues.unselected,
      packedRows,
      librariesStripBand,
      peekLiftRows,
    ],
  );

  const layoutFocalTopPx = Math.max(0, resolvedFocalTopPx - peekLiftPx);

  const peekRootStyle = {
    ["--mhg-context-rail-peek-lift" as string]: `${peekLiftPx}px`,
  } as CSSProperties;

  useLayoutEffect(() => {
    const stack = stackRef.current;
    if (!stack || neighborEntries.length === 0) {
      setPeekLayout({ yShift: 0, topPad: 0, minHeight: 0 });
      return;
    }

    const measure = () => {
      const stackTop = stack.getBoundingClientRect().top;
      const yShift = listViewportTop - stackTop;
      const band = readLibraryBarBandPx(stack);
      let minTop = Infinity;
      let maxBottom = 0;

      for (const { offset } of neighborEntries) {
        const rawTop = fixedFocalItemTop(
          layoutFocalTopPx,
          offset,
          coverHeight,
          gap,
          scaleValues.unselected,
          packedRows,
          band,
        );
        const top = rawTop + yShift;
        minTop = Math.min(minTop, top);
        maxBottom = Math.max(
          maxBottom,
          top + coverHeight * scaleValues.unselected + gap,
        );
      }

      const topPad = Number.isFinite(minTop) && minTop < 0 ? -minTop : 0;
      const minHeight =
        Number.isFinite(maxBottom) && Number.isFinite(minTop)
          ? Math.max(0, maxBottom + topPad)
          : 0;

      setPeekLayout({ yShift, topPad, minHeight });
    };

    measure();
    window.addEventListener("resize", measure);
    const t = window.setTimeout(measure, 50);
    return () => {
      window.removeEventListener("resize", measure);
      window.clearTimeout(t);
    };
  }, [
    activeSkinId,
    selectedIndex,
    coverSize,
    kind,
    neighborEntries,
    layoutFocalTopPx,
    listViewportTop,
    coverHeight,
    gap,
    scaleValues.unselected,
    packedRows,
  ]);

  if (neighborEntries.length === 0) {
    return null;
  }

  const bandForRender = readLibraryBarBandPx(stackRef.current);

  return (
    <div
      className="mhg-context-rail-index-peek"
      aria-hidden="true"
      data-mhg-context-rail-index-peek={kind}
      style={peekRootStyle}
    >
      <div className="mhg-context-rail-index-peek-host">
        <div
          ref={stackRef}
          className="mhg-context-rail-index-peek-stack"
          style={{
            minHeight: peekLayout.minHeight > 0 ? peekLayout.minHeight : undefined,
          }}
        >
          {neighborEntries.map(({ index, offset }) => {
            const item = items[index];
            const coverUrl = item.cover ? buildCoverUrl(API_BASE, item.cover) : "";
            const rawTop = fixedFocalItemTop(
              layoutFocalTopPx,
              offset,
              coverHeight,
              gap,
              scaleValues.unselected,
              packedRows,
              bandForRender,
            );
            const top = rawTop + peekLayout.yShift + peekLayout.topPad;

            return (
              <div
                key={item.id}
                className="mhg-context-rail-index-peek-tile"
                data-offset={String(offset)}
                style={{
                  top,
                  ["--mhg-cell-scale" as string]: scaleValues.unselected.toFixed(3),
                }}
              >
                <Cover
                  title={item.title}
                  coverUrl={coverUrl}
                  width={coverSize}
                  height={tileHeight}
                  aspectRatio={isTag ? "16/9" : "3/4"}
                  imageFit="cover"
                  showTitle={false}
                  showBorder={true}
                  detail={false}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
