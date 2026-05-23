import { useMemo } from "react";
import Cover from "../games/Cover";
import type { ContextRailIndexPeekSnapshot } from "../../utils/contextRailIndexPeek";
import { buildCoverUrl } from "../../utils/api";
import { API_BASE } from "../../config";

type ContextRailIndexPeekProps = {
  snapshot: ContextRailIndexPeekSnapshot;
};

const PEEK_NEIGHBOR_OFFSETS = [-2, -1, 1, 2] as const;

/**
 * Blurred neighbor covers from the index column (between arrow and games).
 * Lightweight stack — avoids fixed-focal measurement / fade issues in a narrow lane.
 */
export default function ContextRailIndexPeek({ snapshot }: ContextRailIndexPeekProps) {
  const { selectedIndex, coverSize, kind, items } = snapshot;

  const neighborEntries = useMemo(() => {
    if (items.length === 0) return [];
    const entries: { index: number; offset: number }[] = [];
    for (const offset of PEEK_NEIGHBOR_OFFSETS) {
      const index = selectedIndex + offset;
      if (index < 0 || index >= items.length) continue;
      entries.push({ index, offset });
    }
    return entries;
  }, [items, selectedIndex]);

  const tileCoverSize = Math.max(64, Math.min(120, Math.round(coverSize * 0.4)));
  const isTag = kind === "tag";
  const tileHeight = isTag ? Math.round(tileCoverSize * (9 / 16)) : Math.round(tileCoverSize * 1.3325);

  if (neighborEntries.length === 0) {
    return null;
  }

  return (
    <div
      className="mhg-context-rail-index-peek"
      aria-hidden="true"
      data-mhg-context-rail-index-peek={kind}
    >
      <div className="mhg-context-rail-index-peek-host">
        <div className="mhg-context-rail-index-peek-stack">
          {neighborEntries.map(({ index, offset }) => {
            const item = items[index];
            const coverUrl = item.cover ? buildCoverUrl(API_BASE, item.cover) : "";
            return (
              <div
                key={item.id}
                className="mhg-context-rail-index-peek-tile"
                data-offset={String(offset)}
              >
                <Cover
                  title={item.title}
                  coverUrl={coverUrl}
                  width={tileCoverSize}
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
