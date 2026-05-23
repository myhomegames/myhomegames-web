import { flushSync } from "react-dom";
import type { NavigateFunction } from "react-router-dom";
import type { CollectionItem, TagItem } from "../types";
import type { GamesPathType } from "../components/lists/CollectionsList";
import { readFixedFocalTopPx } from "./readGridTopInsetPx";

export type ContextRailIndexPeekItem = {
  id: string;
  title: string;
  cover?: string;
  showTitle?: boolean;
  gameCount?: number;
  background?: string;
};

export type ContextRailIndexPeekSnapshot = {
  kind: "tag" | "collection";
  items: ContextRailIndexPeekItem[];
  selectedIndex: number;
  coverSize: number;
  gamesPath?: GamesPathType;
  /** Fixed-focal Y of the selected tile, from the index list at navigation time. */
  focalTopPx: number;
  /** Viewport top of the index fixed-focal list root at navigation time. */
  listViewportTop: number;
};

export type IndexListLayoutAnchor = {
  focalTopPx: number;
  listViewportTop: number;
};

/** Capture index list geometry so the detail peek column can match original spacing. */
export function captureIndexListLayoutAnchor(
  scrollContainer: HTMLElement | null,
): IndexListLayoutAnchor {
  if (typeof document === "undefined") {
    return { focalTopPx: 0, listViewportTop: 0 };
  }
  const listEl = scrollContainer?.querySelector(
    ".fixed-focal-tag-list, .fixed-focal-collections-list",
  );
  const list = listEl instanceof HTMLElement ? listEl : null;
  const listViewportTop =
    list?.getBoundingClientRect().top ??
    scrollContainer?.getBoundingClientRect().top ??
    0;
  return {
    focalTopPx: readFixedFocalTopPx(list, scrollContainer),
    listViewportTop,
  };
}

export type ContextRailNavState = {
  contextRailIndexPeek?: ContextRailIndexPeekSnapshot;
  contextRailMotion?: boolean;
};

/** Shared element names for index → detail context-rail transition. */
export const CONTEXT_RAIL_COVER_VIEW_TRANSITION = "mhg-context-rail-cover";
export const CONTEXT_RAIL_LIBRARY_VIEW_TRANSITION = "mhg-context-rail-library";

export function contextRailViewTransitionsEnabled(skin: {
  compactCollectionLikeDetail?: boolean;
  verticalCoverAlignment?: boolean;
}): boolean {
  return !!(skin.compactCollectionLikeDetail && skin.verticalCoverAlignment);
}

/** Detail routes that render the left context rail (icon + cover). */
export function isContextRailDetailPathname(pathname: string): boolean {
  return (
    /^\/collections\/[^/]+/.test(pathname) ||
    /^\/category\/[^/]+/.test(pathname) ||
    /^\/series\/[^/]+/.test(pathname) ||
    /^\/franchise\/[^/]+/.test(pathname) ||
    /^\/platforms\/[^/]+/.test(pathname) ||
    /^\/themes\/[^/]+/.test(pathname) ||
    /^\/developers\/[^/]+/.test(pathname) ||
    /^\/publishers\/[^/]+/.test(pathname) ||
    /^\/game-engines\/[^/]+/.test(pathname) ||
    /^\/game-modes\/[^/]+/.test(pathname) ||
    /^\/player-perspectives\/[^/]+/.test(pathname)
  );
}

export function toContextRailPeekItemsFromTags(items: TagItem[]): ContextRailIndexPeekItem[] {
  return items.map((item) => ({
    id: String(item.id),
    title: item.title,
    cover: item.cover,
    showTitle: item.showTitle,
  }));
}

export function toContextRailPeekItemsFromCollections(
  items: CollectionItem[],
): ContextRailIndexPeekItem[] {
  return items.map((item) => ({
    id: String(item.id),
    title: item.title,
    cover: item.cover,
    showTitle: item.showTitle,
    gameCount: item.gameCount,
    background: item.background,
  }));
}

export function buildTagIndexPeekSnapshot(
  items: TagItem[],
  selectedIndex: number,
  coverSize: number,
  layoutAnchor: IndexListLayoutAnchor,
): ContextRailIndexPeekSnapshot {
  return {
    kind: "tag",
    items: toContextRailPeekItemsFromTags(items),
    selectedIndex: Math.max(0, Math.min(items.length - 1, selectedIndex)),
    coverSize,
    focalTopPx: layoutAnchor.focalTopPx,
    listViewportTop: layoutAnchor.listViewportTop,
  };
}

export function buildCollectionIndexPeekSnapshot(
  items: CollectionItem[],
  selectedIndex: number,
  coverSize: number,
  gamesPath: GamesPathType,
  layoutAnchor: IndexListLayoutAnchor,
): ContextRailIndexPeekSnapshot {
  return {
    kind: "collection",
    items: toContextRailPeekItemsFromCollections(items),
    selectedIndex: Math.max(0, Math.min(items.length - 1, selectedIndex)),
    coverSize,
    gamesPath,
    focalTopPx: layoutAnchor.focalTopPx,
    listViewportTop: layoutAnchor.listViewportTop,
  };
}

export function readContextRailNavState(state: unknown): ContextRailNavState | null {
  if (!state || typeof state !== "object") return null;
  const peek = (state as ContextRailNavState).contextRailIndexPeek;
  if (!peek || !Array.isArray(peek.items) || peek.items.length === 0) return null;
  return state as ContextRailNavState;
}

export function navigateWithContextRailPeek(
  navigate: NavigateFunction,
  to: string,
  snapshot: ContextRailIndexPeekSnapshot,
): void {
  const state: ContextRailNavState = {
    contextRailIndexPeek: snapshot,
    contextRailMotion: true,
  };
  const go = () => {
    flushSync(() => {
      navigate(to, { state });
    });
  };

  if (typeof document !== "undefined" && "startViewTransition" in document) {
    (
      document as Document & { startViewTransition: (cb: () => void) => void }
    ).startViewTransition(go);
  } else {
    go();
  }
}
