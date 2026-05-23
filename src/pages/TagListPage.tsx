import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import { useTitleFilterQuery } from "../contexts/TitleFilterContext";
import { useSkin } from "../contexts/SkinContext";
import { useTagLists } from "../contexts/TagListsContext";
import TagList from "../components/lists/TagList";
import EditTagModal from "../components/tags/EditTagModal";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import type { TagItem, GameItem } from "../types";
import { compareTitles } from "../utils/stringUtils";
import { titleMatchesFilter } from "../utils/titleFilter";
import { resolveTagDisplayLabel } from "../utils/resolveTagDisplayLabel";
import type { TagKey } from "../utils/tagPages";
import { API_BASE } from "../config";
import { buildApiHeaders, buildApiUrl, buildCoverUrl } from "../utils/api";
import {
  buildTagIndexPeekSnapshot,
  captureIndexListLayoutAnchor,
  clearContextRailReturnSession,
  navigateWithContextRailPeek,
  resolveContextRailReturnPeek,
  resolveSnapshotSelectedIndex,
} from "../utils/contextRailIndexPeek";

type TagListPageProps = {
  coverSize: number;
  routeBase: string;
  tagKey?: TagKey;
  valueExtractor: (game: GameItem) => string[] | null | undefined;
  getDisplayName?: (value: string) => string;
  emptyMessage?: string;
  listEndpoint?: string;
  listResponseKey?: string;
  /** Show alphabet navigator (e.g. for series, franchise, gameEngines) */
  showAlphabetNavigator?: boolean;
  editConfig?: {
    title: string;
    coverDescription?: string;
    routeBase?: string;
    responseKey: string;
    localCoverPrefix: string;
    removeResourceType:
      | "games"
      | "collections"
      | "categories"
      | "themes"
      | "platforms"
      | "game-engines"
      | "game-modes"
      | "player-perspectives"
      | "series"
      | "franchise";
    getRouteSegment?: (item: TagItem) => string;
    listResponseKey?: string;
    updateEventName?: string;
    updateEventPayloadKey?: string;
  };
};

export default function TagListPage({
  coverSize,
  routeBase,
  tagKey,
  valueExtractor,
  getDisplayName,
  emptyMessage,
  listEndpoint,
  listResponseKey,
  showAlphabetNavigator = false,
  editConfig,
}: TagListPageProps) {
  const { t } = useTranslation();
  const { isLoading, setLoading } = useLoading();
  const titleFilterQuery = useTitleFilterQuery();
  const { activeSkinWeb } = useSkin();
  const navigate = useNavigate();
  const location = useLocation();
  const contextRailPeekEnabled =
    activeSkinWeb.verticalCoverAlignment && activeSkinWeb.compactCollectionLikeDetail;
  const tagListCoverSize = coverSize * 2;
  const { tagLabels } = useTagLists();
  const { games, isLoading: gamesLoading } = useLibraryGames();
  const [items, setItems] = useState<TagItem[]>([]);
  const [serverItems, setServerItems] = useState<TagItem[] | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [editingItem, setEditingItem] = useState<TagItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pendingScrollRestoreRef = useRef<number | null>(null);

  useEffect(() => {
    setLoading(gamesLoading || listLoading || !isReady);
  }, [gamesLoading, listLoading, isReady, setLoading]);

  const scrollStorageKey = `${window.location.pathname}:${routeBase}`;
  const fixedFocalTags = activeSkinWeb.verticalCoverAlignment;
  const resolveItemLabel = useCallback(
    (item: TagItem) =>
      resolveTagDisplayLabel({
        tagKey,
        tagId: item.id,
        preferredName: item.title,
        tagLabels,
        t,
        getDisplayName,
      }),
    [tagKey, tagLabels, t, getDisplayName]
  );
  const { isScrollRestored } = useScrollRestoration(
    scrollContainerRef,
    routeBase,
    !fixedFocalTags,
  );

  useEffect(() => {
    if (!fixedFocalTags) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const pinOuterScroll = () => {
      if (el.scrollTop !== 0) el.scrollTop = 0;
    };
    pinOuterScroll();
    el.addEventListener("scroll", pinOuterScroll, { passive: true });
    return () => el.removeEventListener("scroll", pinOuterScroll);
  }, [fixedFocalTags, isReady, items.length]);

  useEffect(() => {
    if (!listResponseKey) {
      setServerItems(null);
      return;
    }

    let isActive = true;
    const endpoint = listEndpoint || routeBase;

    let controller: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const fetchItems = async (attempt = 0) => {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller!.abort(), 90000);
      setListLoading(true);
      try {
        const url = buildApiUrl(API_BASE, endpoint);
        const res = await fetch(url, {
          headers: buildApiHeaders({ Accept: "application/json" }),
          signal: controller.signal,
        });
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const rawItems = (json?.[listResponseKey] || []) as Array<{
          id: string | number;
          title: string;
          cover?: string;
          showTitle?: boolean;
          hasCover?: boolean;
        }>;
        const parsed = rawItems.map((item) => ({
          id: String(item.id),
          title: item.title,
          cover: item.cover,
          showTitle: item.showTitle,
          hasCover: item.hasCover,
        }));
        if (isActive) {
          setServerItems(parsed);
        }
      } catch (err: any) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        if (isActive && attempt < 1) {
          setTimeout(() => fetchItems(attempt + 1), 2000);
          return;
        }
        if (err?.name === "AbortError") {
          console.debug("Tag list request timed out, using empty list.");
        } else {
          console.error("Error fetching tag list:", String(err.message || err));
        }
        if (isActive) {
          setServerItems([]);
        }
      } finally {
        if (isActive) {
          setListLoading(false);
        }
      }
    };

    fetchItems();
    return () => {
      isActive = false;
      if (controller) controller.abort();
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [listEndpoint, listResponseKey, routeBase]);

  useEffect(() => {
    if (games.length === 0) {
      setItems([]);
      return;
    }

    const valueSet = new Set<string>();
    games.forEach((game) => {
      const values = valueExtractor(game);
      if (!values) return;
      values.forEach((value) => {
        const id = String(value).trim();
        if (id) valueSet.add(id);
      });
    });

    const serverMap = new Map<string, TagItem>();
    if (serverItems) {
      serverItems.forEach((item) => {
        serverMap.set(String(item.id), item);
      });
    }

    const resolvedItems = Array.from(valueSet).map((id) => {
      const match = serverMap.get(String(id));
      return match || { id, title: id };
    });

    resolvedItems.sort((a, b) => {
      const left = resolveItemLabel(a);
      const right = resolveItemLabel(b);
      return compareTitles(left, right);
    });

    // Skip redundant setItems when modal just closed: items were already updated in handleItemUpdate.
    // This avoids an extra re-render that causes scroll flicker (like library/collections).
    if (pendingScrollRestoreRef.current !== null) return;
    setItems(resolvedItems);
  }, [games, valueExtractor, resolveItemLabel, serverItems]);

  const getRoute = useMemo(
    () => (item: TagItem) => `${routeBase}/${encodeURIComponent(item.id)}`,
    [routeBase]
  );

  const getCoverUrl = useMemo(() => {
    return (item: TagItem) => buildCoverUrl(API_BASE, item.cover);
  }, []);

  const displayItems = useMemo(() => {
    const q = titleFilterQuery.trim();
    if (!q) return items;
    return items.filter((item) => {
      const label = resolveItemLabel(item);
      return titleMatchesFilter(item.title, q) || titleMatchesFilter(label, q);
    });
  }, [items, titleFilterQuery, resolveItemLabel]);

  const handleItemActivate = useCallback(
    (item: TagItem, index: number) => {
      const route = `${routeBase}/${encodeURIComponent(item.id)}`;
      if (contextRailPeekEnabled && tagKey) {
        navigateWithContextRailPeek(
          navigate,
          route,
          buildTagIndexPeekSnapshot(
            displayItems,
            index,
            tagListCoverSize,
            captureIndexListLayoutAnchor(scrollContainerRef.current),
          ),
          tagKey,
        );
        return;
      }
      navigate(route);
    },
    [contextRailPeekEnabled, displayItems, navigate, routeBase, tagKey, tagListCoverSize],
  );

  const contextRailReturnPeek = useMemo(() => {
    if (!contextRailPeekEnabled || !tagKey) return null;
    return resolveContextRailReturnPeek(tagKey, location.state);
  }, [contextRailPeekEnabled, tagKey, location.state]);

  const contextRailMotionReturn = contextRailReturnPeek != null;

  const restoreSelectedIndex = useMemo(() => {
    if (!contextRailReturnPeek || displayItems.length === 0) return undefined;
    return resolveSnapshotSelectedIndex(displayItems, contextRailReturnPeek);
  }, [contextRailReturnPeek, displayItems]);

  useEffect(() => {
    if (contextRailReturnPeek) {
      clearContextRailReturnSession();
    }
  }, [contextRailReturnPeek]);

  const handleItemUpdate = (updatedItem: TagItem) => {
    const isMatch = (item: TagItem) => String(item.id) === String(updatedItem.id);

    setItems((prev) =>
      prev.map((item) => {
        if (!isMatch(item)) return item;
        const merged = { ...item, ...updatedItem };
        // Never show raw id as title: keep existing title if payload title is missing or equals id
        if (merged.title === undefined || merged.title === String(merged.id)) {
          merged.title = item.title;
        }
        return merged;
      })
    );
    setServerItems((prev) => {
      if (!prev) return prev;
      return prev.map((item) => {
        if (!isMatch(item)) return item;
        const merged = { ...item, ...updatedItem };
        if (merged.title === undefined || merged.title === String(merged.id)) {
          merged.title = item.title;
        }
        return merged;
      });
    });
    if (editingItem && isMatch(editingItem)) {
      setEditingItem((prev) => {
        if (!prev) return prev;
        const merged = { ...prev, ...updatedItem };
        if (merged.title === undefined || merged.title === String(merged.id)) {
          merged.title = prev.title;
        }
        return merged;
      });
    }
  };

  const handleItemEdit = (item: TagItem) => {
    if (fixedFocalTags) {
      pendingScrollRestoreRef.current = getSavedScrollTopForModal();
    } else {
      const container = scrollContainerRef.current;
      if (container) {
        pendingScrollRestoreRef.current = container.scrollTop;
      }
    }
    setEditingItem(item);
  };

  function getSavedScrollTopForModal(): number {
    try {
      const stored = sessionStorage.getItem(scrollStorageKey);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  }

  const handleCloseModal = () => {
    setEditingItem(null);
  };

  useLayoutEffect(() => {
    if (!gamesLoading && !listLoading) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    } else {
      setIsReady(false);
    }
  }, [gamesLoading, listLoading, items.length]);

  // Restore scroll position when modal closes (items already updated in handleItemUpdate).
  // useLayoutEffect so we restore before paint and avoid visible flicker like library/collections.
  useLayoutEffect(() => {
    if (!editingItem && pendingScrollRestoreRef.current !== null) {
      const saved = pendingScrollRestoreRef.current;
      pendingScrollRestoreRef.current = null;
      if (fixedFocalTags) {
        try {
          sessionStorage.setItem(scrollStorageKey, saved.toString());
        } catch {
          // Ignore
        }
        document.dispatchEvent(
          new CustomEvent("mhg:fixed-focal-restore", { detail: { scrollTop: saved } }),
        );
        return;
      }
      const container = scrollContainerRef.current;
      if (container && container.scrollHeight > 0) {
        container.scrollTop = saved;
        try {
          sessionStorage.setItem(scrollStorageKey, saved.toString());
        } catch {
          // Ignore
        }
      }
    }
  }, [editingItem, scrollStorageKey, fixedFocalTags]);

  return (
    <main className="flex-1 home-page-content">
      <div className="home-page-layout">
        <div
          className={`home-page-content-wrapper home-page-fade-in${isReady && isScrollRestored ? " home-page-fade-in--ready" : ""}${contextRailMotionReturn ? " mhg-context-rail-motion-return" : ""}`}
        >
          <div ref={scrollContainerRef} className="home-page-scroll-container">
            {!isLoading && (
              <TagList
                items={displayItems}
                coverSize={tagListCoverSize}
                itemRefs={itemRefs}
                scrollContainerRef={scrollContainerRef}
                routeBase={routeBase}
                onItemEdit={editConfig ? handleItemEdit : undefined}
                getDisplayName={resolveItemLabel}
                getRoute={getRoute}
                getCoverUrl={getCoverUrl}
                emptyMessage={emptyMessage}
                onItemActivate={fixedFocalTags ? handleItemActivate : undefined}
                restoreSelectedIndex={restoreSelectedIndex}
              />
            )}
          </div>
        </div>
        {showAlphabetNavigator &&
          !activeSkinWeb.disableAlphabetNavigator &&
          !activeSkinWeb.verticalCoverAlignment &&
          isReady &&
          displayItems.length > 0 && (
          <AlphabetNavigator
            games={displayItems as { id: string; title: string }[]}
            scrollContainerRef={scrollContainerRef}
            itemRefs={itemRefs}
            ascending={true}
            viewMode="grid"
            coverSize={coverSize * 2}
          />
        )}
      </div>
      {editConfig && editingItem && (
        <EditTagModal
          isOpen={!!editingItem}
          onClose={handleCloseModal}
          item={editingItem}
          onItemUpdate={handleItemUpdate}
          title={editConfig.title}
          coverDescription={editConfig.coverDescription}
          routeBase={editConfig.routeBase || routeBase}
          responseKey={editConfig.responseKey}
          localCoverPrefix={editConfig.localCoverPrefix}
          removeResourceType={editConfig.removeResourceType}
          getRouteSegment={editConfig.getRouteSegment}
          listResponseKey={editConfig.listResponseKey}
          updateEventName={editConfig.updateEventName}
          updateEventPayloadKey={editConfig.updateEventPayloadKey}
          coverSize={coverSize * 2}
          getDisplayName={getDisplayName}
        />
      )}
    </main>
  );
}
