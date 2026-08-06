import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid } from "react-window";
import type { CollectionInfo, CollectionItem, GameItem } from "../../types";
import type { CollectionLikeResourceType } from "../collections/EditCollectionLikeModal";
import type { ActiveCollectionLikeDetail } from "../../utils/collectionLikePseudoGame";
import { GRID_COVER_TITLE_BLOCK_HEIGHT, portraitCoverHeight } from "../../utils/coverPortrait";
import { GameListItem } from "./GamesList";

/** Match plex `.scrollable-section-scroll .games-list-container { gap: 24px }`. */
const DEFAULT_STRIP_GAP = 24;
const OVERSCAN_COUNT = 3;

type VirtualizedHorizontalGamesStripProps = {
  games: GameItem[];
  coverSize: number;
  coverCacheBustTimestamp?: number;
  /** Scrollport that wraps this strip (`.scrollable-section-scroll`). */
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (game: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  buildCoverUrl: (
    apiBase: string,
    cover?: string,
    addTimestamp?: boolean,
    customTimestamp?: number,
  ) => string;
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
  onCollectionLikePseudoAddToParent?: (
    source: CollectionItem,
    parentId?: string,
  ) => void | Promise<void>;
  onCollectionLikePseudoUpdated?: (updated: CollectionInfo) => void;
  activeCollectionLikeDetail?: ActiveCollectionLikeDetail | null;
  activeGameId?: string | null;
};

function readStripGapPx(): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return DEFAULT_STRIP_GAP;
  }
  const raw = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--mhg-strip-gap"),
  );
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_STRIP_GAP;
}

/**
 * Single-row react-window Grid for horizontal cover rails (Recommended, detail
 * collection sliders). Only viewport + overscan covers mount — full `games.map`
 * was laggy on Smart TV once IGDB appends grew each strip.
 */
export default function VirtualizedHorizontalGamesStrip({
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
  allCollectionLikes = [],
  collectionLikeResourceType,
  sliderParentCollectionLikeId,
  onRemoveChildFromSliderParent,
  onCollectionLikePseudoEdit,
  onPlayFirstInCollectionLike,
  onCollectionLikePseudoAddToParent,
  onCollectionLikePseudoUpdated,
  activeCollectionLikeDetail,
  activeGameId,
}: VirtualizedHorizontalGamesStripProps) {
  const gridRef = useRef<any>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const gap = useMemo(() => readStripGapPx(), []);
  const columnWidth = coverSize + gap;
  const rowHeight = portraitCoverHeight(coverSize) + GRID_COVER_TITLE_BLOCK_HEIGHT;

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    const padLeft = parseFloat(cs.paddingLeft) || 0;
    const padRight = parseFloat(cs.paddingRight) || 0;
    const width = Math.max(0, el.clientWidth - padLeft - padRight);
    setViewportWidth(width || el.clientWidth);
  }, [containerRef]);

  useEffect(() => {
    measure();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, measure, games.length]);

  // Expose grid scroller on the section scroll host for restore / wheel / TV nudge.
  useEffect(() => {
    const root = containerRef.current;
    const gridEl = gridRef.current?.element as HTMLElement | null | undefined;
    if (!root || !gridEl) return;
    (root as HTMLElement & { __mhgStripScroller?: HTMLElement }).__mhgStripScroller = gridEl;
    return () => {
      const host = containerRef.current as
        | (HTMLElement & { __mhgStripScroller?: HTMLElement })
        | null;
      if (host?.__mhgStripScroller === gridEl) {
        delete host.__mhgStripScroller;
      }
    };
  }, [containerRef, viewportWidth, games.length]);

  const Cell = ({
    columnIndex,
    style,
  }: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
  }) => {
    if (columnIndex < 0 || columnIndex >= games.length) {
      return <div style={style} />;
    }
    const game = games[columnIndex]!;
    return (
      <div style={style} className="virtualized-horizontal-games-strip-cell">
        <div className="virtualized-horizontal-games-strip-cell-pad">
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
            index={columnIndex}
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
            activeCollectionLikeDetail={activeCollectionLikeDetail}
            activeGameId={activeGameId}
          />
        </div>
      </div>
    );
  };

  if (viewportWidth <= 0 || games.length === 0) {
    return <div className="virtualized-horizontal-games-strip-placeholder" style={{ height: rowHeight }} />;
  }

  return (
    <Grid
      gridRef={gridRef}
      className="virtualized-horizontal-games-strip"
      columnCount={games.length}
      columnWidth={columnWidth}
      rowCount={1}
      rowHeight={rowHeight}
      defaultHeight={rowHeight}
      defaultWidth={viewportWidth}
      overscanCount={OVERSCAN_COUNT}
      cellComponent={Cell}
      cellProps={{} as any}
      style={{ height: rowHeight, width: viewportWidth }}
    />
  );
}

/** Prefer the react-window strip scroller when present on a section scroll host. */
export function resolveHorizontalStripScroller(
  sectionScrollEl: HTMLElement | null,
): HTMLElement | null {
  if (!sectionScrollEl) return null;
  const tagged = (sectionScrollEl as HTMLElement & { __mhgStripScroller?: HTMLElement })
    .__mhgStripScroller;
  if (tagged?.isConnected) return tagged;
  const fromDom = sectionScrollEl.querySelector(
    ".virtualized-horizontal-games-strip",
  ) as HTMLElement | null;
  return fromDom ?? sectionScrollEl;
}
