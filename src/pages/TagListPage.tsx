import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import TagList from "../components/lists/TagList";
import EditTagModal from "../components/tags/EditTagModal";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import type { CategoryItem, GameItem } from "../types";
import { compareTitles } from "../utils/stringUtils";
import { API_BASE } from "../config";
import { buildApiHeaders, buildApiUrl, buildCoverUrl } from "../utils/api";

type TagListPageProps = {
  coverSize: number;
  routeBase: string;
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
    getRouteSegment?: (item: CategoryItem) => string;
    listResponseKey?: string;
    updateEventName?: string;
    updateEventPayloadKey?: string;
  };
};

export default function TagListPage({
  coverSize,
  routeBase,
  valueExtractor,
  getDisplayName,
  emptyMessage,
  listEndpoint,
  listResponseKey,
  showAlphabetNavigator = false,
  editConfig,
}: TagListPageProps) {
  const { isLoading, setLoading } = useLoading();
  const { games, isLoading: gamesLoading } = useLibraryGames();
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [serverItems, setServerItems] = useState<CategoryItem[] | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pendingScrollRestoreRef = useRef<number | null>(null);

  useEffect(() => {
    setLoading(gamesLoading || listLoading || !isReady);
  }, [gamesLoading, listLoading, isReady, setLoading]);

  useScrollRestoration(scrollContainerRef);

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
        }>;
        const parsed = rawItems.map((item) => ({
          id: String(item.id),
          title: item.title,
          cover: item.cover,
          showTitle: item.showTitle,
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

    const serverMap = new Map<string, CategoryItem>();
    if (serverItems) {
      serverItems.forEach((item) => {
        serverMap.set(String(item.id), item);
      });
    }

    const resolvedItems = Array.from(valueSet).map((id) => {
      const match = serverMap.get(id);
      return match || { id, title: id };
    });

    resolvedItems.sort((a, b) => {
      const left = getDisplayName ? getDisplayName(a.title) : a.title;
      const right = getDisplayName ? getDisplayName(b.title) : b.title;
      return compareTitles(left, right);
    });

    // Skip redundant setItems when modal just closed: items were already updated in handleItemUpdate.
    // This avoids an extra re-render that causes scroll flicker (like library/collections).
    if (pendingScrollRestoreRef.current !== null) return;
    setItems(resolvedItems);
  }, [games, valueExtractor, getDisplayName, serverItems]);

  const getRoute = useMemo(
    () => (item: CategoryItem) => `${routeBase}/${encodeURIComponent(item.id)}`,
    [routeBase]
  );

  const getCoverUrl = useMemo(() => {
    return (item: CategoryItem) => buildCoverUrl(API_BASE, item.cover);
  }, []);

  const handleItemUpdate = (updatedItem: CategoryItem) => {
    const isMatch = (item: CategoryItem) => String(item.id) === String(updatedItem.id);

    setItems((prev) => prev.map((item) => (isMatch(item) ? updatedItem : item)));
    setServerItems((prev) =>
      prev ? prev.map((item) => (isMatch(item) ? updatedItem : item)) : prev
    );
    if (editingItem && isMatch(editingItem)) {
      setEditingItem(updatedItem);
    }
  };

  const handleItemEdit = (item: CategoryItem) => {
    // Save scroll position before opening modal
    const container = scrollContainerRef.current;
    if (container) {
      pendingScrollRestoreRef.current = container.scrollTop;
    }
    setEditingItem(item);
  };

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
    if (!editingItem && pendingScrollRestoreRef.current !== null && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const saved = pendingScrollRestoreRef.current;
      pendingScrollRestoreRef.current = null;
      if (container.scrollHeight > 0) {
        container.scrollTop = saved;
        try {
          sessionStorage.setItem(window.location.pathname, saved.toString());
        } catch {
          // Ignore
        }
      }
    }
  }, [editingItem]);

  return (
    <main className="flex-1 home-page-content">
      <div className="home-page-layout">
        <div
          className="home-page-content-wrapper"
          style={{
            opacity: isReady ? 1 : 0,
            transition: "opacity 0.2s ease-in-out",
          }}
        >
          <div ref={scrollContainerRef} className="home-page-scroll-container">
            {!isLoading && (
              <TagList
                items={items}
                coverSize={coverSize * 2}
                itemRefs={itemRefs}
                onItemEdit={editConfig ? handleItemEdit : undefined}
                getDisplayName={(item) =>
                  getDisplayName ? getDisplayName(item.title) : item.title
                }
                getRoute={getRoute}
                getCoverUrl={getCoverUrl}
                emptyMessage={emptyMessage}
              />
            )}
          </div>
        </div>
        {showAlphabetNavigator && isReady && items.length > 0 && (
          <AlphabetNavigator
            games={items as { id: string; title: string }[]}
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
