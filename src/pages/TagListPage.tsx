import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import { useTitleFilterQuery } from "../contexts/TitleFilterContext";
import { useSkin } from "../contexts/SkinContext";
import TagList from "../components/lists/TagList";
import EditTagModal from "../components/tags/EditTagModal";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import type { TagItem, GameItem } from "../types";
import { compareTitles } from "../utils/stringUtils";
import { titleMatchesFilter } from "../utils/titleFilter";
import { API_BASE } from "../config";
import { buildApiHeaders, buildApiUrl, buildCoverUrl } from "../utils/api";
import { flushGlobalCoverScales } from "../hooks/useCoverScaleAroundBar";
import {
  applyTagListStepSnap,
  nextTagListStepScrollTop,
  readStepScrollRows,
  type TagListStepScrollSnapOptions,
} from "../utils/stepScrollSnap";

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
    getRouteSegment?: (item: TagItem) => string;
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
  const titleFilterQuery = useTitleFilterQuery();
  const { activeSkinWeb } = useSkin();
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
  const { isScrollRestored } = useScrollRestoration(scrollContainerRef, routeBase);

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
      const label = getDisplayName ? getDisplayName(item.title) : item.title;
      return titleMatchesFilter(item.title, q) || titleMatchesFilter(label, q);
    });
  }, [items, titleFilterQuery, getDisplayName]);

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
          sessionStorage.setItem(scrollStorageKey, saved.toString());
        } catch {
          // Ignore
        }
      }
    }
  }, [editingItem, scrollStorageKey]);

  useEffect(() => {
    if (!activeSkinWeb.verticalCoverAlignment) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const stepRows = readStepScrollRows(container);
    if (stepRows <= 0) return;

    const buildSnapOpts = (): TagListStepScrollSnapOptions | null => {
      const tagItems = container.querySelectorAll<HTMLElement>(".tag-list-container .tag-list-item");
      if (tagItems.length === 0) return null;

      const firstOffset = Math.max(0, tagItems[0].offsetTop);
      let naturalStep = 0;
      if (tagItems.length > 1) {
        naturalStep = Math.max(1, tagItems[1].offsetTop - tagItems[0].offsetTop);
      } else {
        naturalStep = Math.max(1, Math.round(coverSize * 2 * (9 / 16)) + 20);
      }

      const stepPx = Math.max(1, Math.round(naturalStep * stepRows));
      const stopEarlyPx = Math.min(
        Math.max(4, Math.round(naturalStep * 0.12)),
        Math.max(1, Math.floor(stepPx / 3)),
      );
      const max = Math.max(0, container.scrollHeight - container.clientHeight);

      return {
        scrollTop: container.scrollTop,
        maxScrollTop: max,
        firstOffset,
        stepPx,
        stopEarlyPx,
      };
    };

    const runSnap = () => {
      const opts = buildSnapOpts();
      if (!opts || opts.maxScrollTop <= 0) return;
      if (applyTagListStepSnap(container, opts)) {
        flushGlobalCoverScales();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 1) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const opts = buildSnapOpts();
      if (!opts || opts.maxScrollTop <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      const direction: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      const target = nextTagListStepScrollTop(opts, direction);
      if (target !== container.scrollTop) {
        container.scrollTop = target;
        flushGlobalCoverScales();
      }
    };

    const handleScroll = () => {
      runSnap();
    };

    const handleScrollEnd = () => {
      runSnap();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("scrollend", handleScrollEnd, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: false, capture: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("scrollend", handleScrollEnd);
      container.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [activeSkinWeb.verticalCoverAlignment, coverSize, displayItems.length]);

  return (
    <main className="flex-1 home-page-content">
      <div className="home-page-layout">
        <div className={`home-page-content-wrapper home-page-fade-in${isReady && isScrollRestored ? " home-page-fade-in--ready" : ""}`}>
          <div ref={scrollContainerRef} className="home-page-scroll-container">
            {!isLoading && (
              <TagList
                items={displayItems}
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
        {showAlphabetNavigator &&
          !activeSkinWeb.disableAlphabetNavigator &&
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
