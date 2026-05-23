import type { NavigateFunction } from "react-router-dom";
import type { CollectionItem, TagItem } from "../types";
import type { GamesPathType } from "../components/lists/CollectionsList";

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
};

export type ContextRailNavState = {
  contextRailIndexPeek?: ContextRailIndexPeekSnapshot;
  contextRailMotion?: boolean;
};

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
): ContextRailIndexPeekSnapshot {
  return {
    kind: "tag",
    items: toContextRailPeekItemsFromTags(items),
    selectedIndex: Math.max(0, Math.min(items.length - 1, selectedIndex)),
    coverSize,
  };
}

export function buildCollectionIndexPeekSnapshot(
  items: CollectionItem[],
  selectedIndex: number,
  coverSize: number,
  gamesPath: GamesPathType,
): ContextRailIndexPeekSnapshot {
  return {
    kind: "collection",
    items: toContextRailPeekItemsFromCollections(items),
    selectedIndex: Math.max(0, Math.min(items.length - 1, selectedIndex)),
    coverSize,
    gamesPath,
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
  const go = () => navigate(to, { state });

  if (typeof document !== "undefined" && "startViewTransition" in document) {
    (
      document as Document & { startViewTransition: (cb: () => void) => void }
    ).startViewTransition(go);
  } else {
    go();
  }
}
