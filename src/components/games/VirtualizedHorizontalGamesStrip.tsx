import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  /** D-pad target while scrolling — prevents restoreFocusedCover from snapping back. */
  __mhgStripNavigateToIndex?: number | null;
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

  /** Host padding-right is cleared for virtualized rails — restore it as a trailing column. */
  const trailingSpacerPx = useMemo(() => {
    const classic = Math.max(0, END_SCROLL_GUTTER_PX - gap);
    if (scalePadPx <= 0) return classic;
    return Math.max(classic, 64, Math.ceil(coverSize * 0.12) + 40);
  }, [coverSize, gap, scalePadPx]);
  const gridColumnCount = games.length + (trailingSpacerPx > 0 ? 1 : 0);

  const columnWidthForIndex = useCallback(
    (index: number) => {
      if (index >= games.length) return trailingSpacerPx;
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
    [baseColumnWidth, games.length, gap, scalePadPx, trailingSpacerPx],
  );

  const columnOffset = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < index; i++) offset += columnWidthForIndex(i);
      return offset;
    },
    [columnWidthForIndex],
  );

  const totalContentWidth = useMemo(
    () => columnOffset(gridColumnCount),
    [columnOffset, gridColumnCount],
  );

  /** react-window underestimates scrollWidth until its bounds cache fills (~26 cols). */
  const syncGridScrollExtent = useCallback(() => {
    const gridEl = gridRef.current?.element as HTMLElement | null | undefined;
    if (!gridEl || totalContentWidth <= 0) return;
    const hidden =
      (gridEl.lastElementChild as HTMLElement | null)?.getAttribute("aria-hidden") ===
      "true"
        ? (gridEl.lastElementChild as HTMLElement)
        : gridEl.querySelector<HTMLElement>('[aria-hidden="true"]');
    if (hidden) {
      hidden.style.width = `${totalContentWidth}px`;
      hidden.style.minWidth = `${totalContentWidth}px`;
    }
  }, [totalContentWidth]);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    const padLeft = parseFloat(cs.paddingLeft) || 0;
    const padRight = parseFloat(cs.paddingRight) || 0;
    const width = Math.max(0, el.clientWidth - padLeft - padRight);
    const next = width || el.clientWidth;
    setViewportWidth((prev) => (prev === next ? prev : next));
  }, [containerRef]);

  /** Navigation reads column count before react-window finishes mounting. */
  const publishStripColumnCount = useCallback(() => {
    const root = containerRef.current as HorizontalStripScrollHost | null;
    if (!root || games.length <= 0) return;
    root.setAttribute("data-mhg-strip-column-count", String(games.length));
    const container = root.querySelector(".games-list-container--virtualized-strip");
    container?.setAttribute("data-mhg-strip-column-count", String(games.length));
  }, [containerRef, games.length]);

  useEffect(() => {
    publishStripColumnCount();
    measure();
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      measure();
      publishStripColumnCount();
    });
    ro.observe(el);

    const delayedMeasure = [0, 100, 250, 500].map((ms) =>
      window.setTimeout(measure, ms),
    );
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      delayedMeasure.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, measure, games.length, publishStripColumnCount]);

  const scrollToIndex = useCallback(
    (
      index: number,
      align: "auto" | "smart" | "start" | "center" | "end" = "smart",
    ) => {
      const scroller = gridRef.current?.element as HTMLElement | null | undefined;
      if (!scroller) return;
      const clamped = Math.max(0, Math.min(games.length - 1, index));
      const host = containerRef.current as HorizontalStripScrollHost | null;
      focusedIndexRef.current = clamped;
      if (host) host.__mhgStripNavigateToIndex = clamped;

      syncGridScrollExtent();
      const max = Math.max(0, totalContentWidth - scroller.clientWidth);

      if (align === "end" || (align === "smart" && clamped === games.length - 1)) {
        scroller.scrollLeft = max;
        return;
      }

      const pad = scalePadPx > 0 ? scalePadPx : 12;
      const left = columnOffset(clamped);
      const width = columnWidthForIndex(clamped);
      const viewLeft = scroller.scrollLeft;
      const viewRight = viewLeft + scroller.clientWidth;
      let nextScroll = viewLeft;

      if (align === "center") {
        nextScroll = left + width / 2 - scroller.clientWidth / 2;
      } else if (align === "start") {
        nextScroll = left - pad;
      } else if (left + width > viewRight - pad) {
        nextScroll = left + width - scroller.clientWidth + pad;
      } else if (left < viewLeft + pad) {
        nextScroll = left - pad;
      }

      scroller.scrollLeft = Math.max(0, Math.min(max, nextScroll));
    },
    [
      columnOffset,
      columnWidthForIndex,
      containerRef,
      games.length,
      scalePadPx,
      syncGridScrollExtent,
      totalContentWidth,
    ],
  );

  const attachStripScrollApi = useCallback(
    (host: HorizontalStripScrollHost, gridEl: HTMLElement) => {
      host.__mhgStripScroller = gridEl;
      host.__mhgStripScrollToIndex = scrollToIndex;
      host.__mhgStripColumnCount = games.length;
      host.setAttribute("data-mhg-strip-column-count", String(games.length));
      const gridHost = gridEl as HorizontalStripScrollHost;
      gridHost.__mhgStripScroller = gridEl;
      gridHost.__mhgStripScrollToIndex = scrollToIndex;
      gridHost.__mhgStripColumnCount = games.length;
    },
    [games.length, scrollToIndex],
  );

  useLayoutEffect(() => {
    publishStripColumnCount();
  }, [publishStripColumnCount, viewportWidth]);

  useLayoutEffect(() => {
    let cancelled = false;
    let attachedGrid: HTMLElement | null = null;
    let attachedHost: HorizontalStripScrollHost | null = null;

    const ensureScrollExtent = (gridEl: HTMLElement, attempt = 0) => {
      if (cancelled) return;
      syncGridScrollExtent();
      if (gridEl.scrollWidth < totalContentWidth - 2 && attempt < 48) {
        window.requestAnimationFrame(() => ensureScrollExtent(gridEl, attempt + 1));
      }
    };

    const tryAttach = (attempt = 0) => {
      if (cancelled) return;
      const root = containerRef.current as HorizontalStripScrollHost | null;
      const gridEl = gridRef.current?.element as HTMLElement | null | undefined;
      if (root && gridEl) {
        attachStripScrollApi(root, gridEl);
        attachedHost = root;
        attachedGrid = gridEl;
        ensureScrollExtent(gridEl);
        return;
      }
      if (attempt < 120) {
        window.requestAnimationFrame(() => tryAttach(attempt + 1));
      }
    };

    tryAttach();

    return () => {
      cancelled = true;
      if (attachedHost && attachedGrid && attachedHost.__mhgStripScroller === attachedGrid) {
        delete attachedHost.__mhgStripScroller;
        delete attachedHost.__mhgStripScrollToIndex;
        delete attachedHost.__mhgStripColumnCount;
        attachedHost.removeAttribute("data-mhg-strip-column-count");
      }
      if (attachedGrid) {
        const gridHost = attachedGrid as HorizontalStripScrollHost;
        if (gridHost.__mhgStripScroller === attachedGrid) {
          delete gridHost.__mhgStripScroller;
          delete gridHost.__mhgStripScrollToIndex;
          delete gridHost.__mhgStripColumnCount;
        }
      }
    };
  }, [
    attachStripScrollApi,
    containerRef,
    games.length,
    publishStripColumnCount,
    syncGridScrollExtent,
    totalContentWidth,
    viewportWidth,
  ]);

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
      if (idx != null) {
        focusedIndexRef.current = idx;
        const host = root as HorizontalStripScrollHost;
        if (host.__mhgStripNavigateToIndex === idx) {
          host.__mhgStripNavigateToIndex = null;
        }
      }
    };

    const restoreFocusedCover = () => {
      const host = root as HorizontalStripScrollHost;
      const navigateTo = host.__mhgStripNavigateToIndex;
      const idx =
        navigateTo != null ? navigateTo : focusedIndexRef.current;
      if (idx == null) return;

      const active = document.activeElement;
      if (
        navigateTo == null &&
        active instanceof HTMLElement &&
        gridEl.contains(active)
      ) {
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
        scrollToIndex(
          idx,
          idx === games.length - 1 ? "end" : "smart",
        );
        cover = findCoverAt(idx);
      }
      if (!cover || document.activeElement === cover) return;
      try {
        cover.focus({ preventScroll: true });
      } catch {
        cover.focus();
      }
      if (document.activeElement === cover && host.__mhgStripNavigateToIndex === idx) {
        host.__mhgStripNavigateToIndex = null;
      }
    };

    const onScroll = () => {
      syncGridScrollExtent();
      if (!isSmartTvBrowser()) {
        window.requestAnimationFrame(restoreFocusedCover);
      }
    };

    gridEl.addEventListener("focusin", onFocusIn);
    gridEl.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      gridEl.removeEventListener("focusin", onFocusIn);
      gridEl.removeEventListener("scroll", onScroll);
    };
  }, [containerRef, viewportWidth, games.length, scrollToIndex, syncGridScrollExtent]);

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
      columnCount={gridColumnCount}
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
