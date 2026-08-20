import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid } from "react-window";
import type { CollectionInfo, CollectionItem, GameItem } from "../../types";
import type { CollectionLikeResourceType } from "../collections/EditCollectionLikeModal";
import type { ActiveCollectionLikeDetail } from "../../utils/collectionLikePseudoGame";
import { GRID_COVER_TITLE_BLOCK_HEIGHT, portraitCoverHeight } from "../../utils/coverPortrait";
import { isSmartTvBrowser } from "../../utils/smartTv";
import { GameListItem } from "./GamesList";

/** Match plex `.scrollable-section-scroll .games-list-container { gap: 24px }`. */
const DEFAULT_STRIP_GAP = 24;
/** Classic `.scrollable-section-scroll { padding-right: 64px }` end gutter (non-TV). */
const END_SCROLL_GUTTER_PX = 64;
const OVERSCAN_COUNT = 4;
const OVERSCAN_COUNT_TV = 8;

export type HorizontalStripScrollHost = HTMLElement & {
  __mhgStripScroller?: HTMLElement;
  __mhgStripScrollToIndex?: (
    index: number,
    align?: "auto" | "smart" | "start" | "center" | "end",
  ) => void;
  __mhgStripColumnCount?: number;
};

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

type StripCellProps = {
  games: GameItem[];
  coverSize: number;
  coverCacheBustTimestamp?: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (game: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  buildCoverUrl: VirtualizedHorizontalGamesStripProps["buildCoverUrl"];
  allCollections: CollectionItem[];
  collectionId?: string;
  onRemoveFromCollection?: (gameId: string) => void;
  developerId?: string;
  publisherId?: string;
  onRemoveFromDeveloper?: (gameId: string) => void;
  onRemoveFromPublisher?: (gameId: string) => void;
  platformIdForPlay?: string;
  allCollectionLikes: CollectionItem[];
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
  scalePadPx: number;
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

/** Room for TV `scale(1.14)` so focused tiles are not clipped by the strip scroller. */
function readStripScalePadPx(coverSize: number): number {
  if (typeof document === "undefined") return 0;
  if (document.documentElement.getAttribute("data-mhg-tv") !== "1") return 0;
  const fromVar = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--mhg-tv-cover-scale-pad"),
  );
  const fromCover = Math.ceil(coverSize * 0.14);
  if (Number.isFinite(fromVar) && fromVar > 0) return Math.max(fromVar, fromCover);
  return fromCover || 0;
}

/**
 * Stable cell renderer — must stay module-scoped (not inline) so strip re-renders
 * do not remount covers and drop D-pad focus past the first virtualization window.
 */
function StripCell({
  columnIndex,
  style,
  games,
  coverSize,
  coverCacheBustTimestamp,
  itemRefs,
  onGameClick,
  onPlay,
  onEditClick,
  onGameDelete,
  onGameUpdate,
  buildCoverUrl,
  allCollections,
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
  activeCollectionLikeDetail,
  activeGameId,
  scalePadPx,
}: {
  ariaAttributes: {
    "aria-colindex": number;
    role: "gridcell";
  };
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
} & StripCellProps) {
  if (columnIndex < 0 || columnIndex >= games.length) {
    return <div style={style} />;
  }
  const game = games[columnIndex]!;
  // First column is wider by scalePadPx; pad left so scale(1.14) / outline are not
  // clipped by the strip scroller (CSS padding on the Grid does not inset abs cells).
  const leftInset = columnIndex === 0 && scalePadPx > 0 ? scalePadPx : 0;
  return (
    <div
      style={style}
      className="virtualized-horizontal-games-strip-cell"
      data-mhg-strip-index={columnIndex}
    >
      <div
        className="virtualized-horizontal-games-strip-cell-pad"
        style={
          scalePadPx > 0 || leftInset > 0
            ? {
                ...(scalePadPx > 0
                  ? { paddingTop: scalePadPx, paddingBottom: scalePadPx }
                  : null),
                ...(leftInset > 0 ? { paddingLeft: leftInset } : null),
              }
            : undefined
        }
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
  const scalePadPx = useMemo(() => readStripScalePadPx(coverSize), [coverSize]);
  /** Base step between covers (cover + gap). Edge columns grow by scalePadPx. */
  const baseColumnWidth = coverSize + gap;
  const rowHeight =
    portraitCoverHeight(coverSize) + GRID_COVER_TITLE_BLOCK_HEIGHT + scalePadPx * 2;
  const overscanCount = isSmartTvBrowser() ? OVERSCAN_COUNT_TV : OVERSCAN_COUNT;
  const focusedIndexRef = useRef<number | null>(null);

  const columnWidthForIndex = useCallback(
    (index: number) => {
      let width = baseColumnWidth;
      if (scalePadPx > 0) {
        if (index === 0) width += scalePadPx;
        if (index === games.length - 1) width += scalePadPx;
      } else if (index === games.length - 1) {
        // Host padding-right is cleared for virtualized rails so it does not
        // shrink the viewport; keep the classic end gutter in content width.
        width += Math.max(0, END_SCROLL_GUTTER_PX - gap);
      }
      return width;
    },
    [baseColumnWidth, games.length, gap, scalePadPx],
  );

  const columnOffset = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < index; i++) offset += columnWidthForIndex(i);
      return offset;
    },
    [columnWidthForIndex],
  );

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

  const scrollToIndex = useCallback(
    (
      index: number,
      align: "auto" | "smart" | "start" | "center" | "end" = "smart",
    ) => {
      const grid = gridRef.current;
      if (!grid || typeof grid.scrollToColumn !== "function") return;
      const clamped = Math.max(0, Math.min(games.length - 1, index));
      try {
        grid.scrollToColumn({ index: clamped, align, behavior: "instant" });
      } catch {
        const el = grid.element as HTMLElement | null | undefined;
        if (el) {
          el.scrollLeft = Math.max(0, columnOffset(clamped));
        }
      }
    },
    [columnOffset, games.length],
  );

  // Expose grid scroller + imperative index API on the section scroll host.
  useEffect(() => {
    const root = containerRef.current as HorizontalStripScrollHost | null;
    const gridEl = gridRef.current?.element as HTMLElement | null | undefined;
    if (!root || !gridEl) return;
    root.__mhgStripScroller = gridEl;
    root.__mhgStripScrollToIndex = scrollToIndex;
    root.__mhgStripColumnCount = games.length;
    return () => {
      const host = containerRef.current as HorizontalStripScrollHost | null;
      if (host?.__mhgStripScroller === gridEl) {
        delete host.__mhgStripScroller;
        delete host.__mhgStripScrollToIndex;
        delete host.__mhgStripColumnCount;
      }
    };
  }, [containerRef, viewportWidth, games.length, scrollToIndex]);

  // After recycle/scroll, restore focus to the last strip index so D-pad keeps working.
  useEffect(() => {
    const root = containerRef.current;
    const gridEl = gridRef.current?.element as HTMLElement | null | undefined;
    if (!root || !gridEl) return;

    const coverSelector =
      ".games-list-cover[role='button'], .games-list-cover[tabindex]";

    const readIndexFrom = (el: HTMLElement | null): number | null => {
      const cell = el?.closest("[data-mhg-strip-index]") as HTMLElement | null;
      if (!cell) return null;
      const n = parseInt(cell.getAttribute("data-mhg-strip-index") || "", 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };

    const findCoverAt = (index: number): HTMLElement | null => {
      const cell = gridEl.querySelector(
        `[data-mhg-strip-index="${index}"]`,
      ) as HTMLElement | null;
      if (!cell) return null;
      return cell.querySelector<HTMLElement>(coverSelector);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !gridEl.contains(target)) return;
      const idx = readIndexFrom(target);
      if (idx != null) focusedIndexRef.current = idx;
    };

    const restoreFocusedCover = () => {
      const idx = focusedIndexRef.current;
      if (idx == null) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && gridEl.contains(active)) {
        const activeIdx = readIndexFrom(active);
        if (activeIdx != null) {
          focusedIndexRef.current = activeIdx;
          if (
            active.classList.contains("games-list-cover") ||
            active.closest(".games-list-cover")
          ) {
            return;
          }
        }
      }
      let cover = findCoverAt(idx);
      if (!cover) {
        scrollToIndex(idx, "smart");
        cover = findCoverAt(idx);
      }
      if (!cover || document.activeElement === cover) return;
      try {
        cover.focus({ preventScroll: true });
      } catch {
        cover.focus();
      }
    };

    const onScroll = () => {
      window.requestAnimationFrame(restoreFocusedCover);
    };

    gridEl.addEventListener("focusin", onFocusIn);
    gridEl.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      gridEl.removeEventListener("focusin", onFocusIn);
      gridEl.removeEventListener("scroll", onScroll);
    };
  }, [containerRef, viewportWidth, games.length, scrollToIndex]);

  const cellProps: StripCellProps = {
    games,
    coverSize,
    coverCacheBustTimestamp,
    itemRefs,
    onGameClick,
    onPlay,
    onEditClick,
    onGameDelete,
    onGameUpdate,
    buildCoverUrl,
    allCollections,
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
    activeCollectionLikeDetail,
    activeGameId,
    scalePadPx,
  };

  if (viewportWidth <= 0 || games.length === 0) {
    return (
      <div
        className="virtualized-horizontal-games-strip-placeholder"
        style={{ height: rowHeight }}
      />
    );
  }

  return (
    <Grid
      gridRef={gridRef}
      className="virtualized-horizontal-games-strip"
      columnCount={games.length}
      columnWidth={columnWidthForIndex}
      rowCount={1}
      rowHeight={rowHeight}
      defaultHeight={rowHeight}
      defaultWidth={viewportWidth}
      overscanCount={overscanCount}
      cellComponent={StripCell}
      cellProps={cellProps}
      style={{ height: rowHeight, width: viewportWidth }}
    />
  );
}

/** Prefer the react-window strip scroller when present on a section scroll host. */
export function resolveHorizontalStripScroller(
  sectionScrollEl: HTMLElement | null,
): HTMLElement | null {
  if (!sectionScrollEl) return null;
  const tagged = (sectionScrollEl as HorizontalStripScrollHost).__mhgStripScroller;
  if (tagged?.isConnected) return tagged;
  const fromDom = sectionScrollEl.querySelector(
    ".virtualized-horizontal-games-strip",
  ) as HTMLElement | null;
  return fromDom ?? sectionScrollEl;
}

export function getHorizontalStripScrollHost(
  from: HTMLElement,
): HorizontalStripScrollHost | null {
  const direct = from.closest(
    ".scrollable-section-scroll",
  ) as HorizontalStripScrollHost | null;
  if (direct?.__mhgStripScrollToIndex || direct?.__mhgStripScroller) return direct;
  const section = from.closest(".scrollable-section");
  if (!section) return null;
  return section.querySelector(
    ".scrollable-section-scroll",
  ) as HorizontalStripScrollHost | null;
}
