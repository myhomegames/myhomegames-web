import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useLoading } from "../contexts/LoadingContext";
import { useGamesListPage } from "../hooks/useGamesListPage";
import GamesListPageContent from "../components/games/GamesListPageContent";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import LibrariesBar from "../components/layout/LibrariesBar";
import type { ViewMode } from "../types";
import type { GameItem, CollectionItem } from "../types";
import { buildCoverUrl } from "../utils/api";

type CategoryPageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  allCollections?: CollectionItem[];
};

export default function CategoryPage({
  onGameClick,
  onGamesLoaded,
  onPlay,
  allCollections = [],
}: CategoryPageProps) {
  const { isLoading } = useLoading();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("viewMode_category");
    return (saved as ViewMode) || "grid";
  });
  const coverSize = (() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  })();

  // Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem("viewMode_category", viewMode);
  }, [viewMode]);

  const hook = useGamesListPage({
    defaultFilterField: "genre",
    categoryId: categoryId || null,
    listenToGameDeleted: true,
    gameEvents: ["gameUpdated", "gameDeleted"],
    scrollRestorationMode: viewMode === "table" ? undefined : viewMode,
  });

  // Custom buildCoverUrl with timestamp for CategoryPage
  const buildCoverUrlFn = useCallback((apiBase: string, cover?: string, addTimestamp?: boolean) => {
    return buildCoverUrl(apiBase, cover, addTimestamp ?? true);
  }, []);

  // Memoize onGamesLoaded to prevent infinite loop
  const handleGamesLoaded = useCallback((games: GameItem[]) => {
    onGamesLoaded(games);
  }, [onGamesLoaded]);

  return (
    <>
      <LibrariesBar
        libraries={[]}
        activeLibrary={null}
        onSelectLibrary={() => {}}
        loading={false}
        error={null}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <div className="bg-[#1a1a1a] home-page-main-container">
        <main className="flex-1 home-page-content">
          <div className="home-page-layout">
            <GamesListPageContent
              hook={hook}
              viewMode={viewMode}
              coverSize={coverSize}
              isLoading={isLoading}
              isReady={hook.isReady}
              allCollections={allCollections}
              onGameClick={onGameClick}
              onGamesLoaded={handleGamesLoaded}
              onPlay={onPlay}
              buildCoverUrlFn={buildCoverUrlFn}
            />
            {hook.sortField === "title" && hook.isReady && (
              <AlphabetNavigator
                games={hook.filteredAndSortedGames}
                scrollContainerRef={
                  viewMode === "table" ? hook.tableScrollRef : hook.scrollContainerRef
                }
                itemRefs={hook.itemRefs}
                ascending={hook.sortAscending}
                virtualizedGridRef={
                  viewMode === "grid" && hook.scrollContainerRef.current
                    ? (hook.scrollContainerRef.current as any).__virtualizedGridRef
                    : undefined
                }
                virtualizedListRef={
                  viewMode === "detail" && hook.scrollContainerRef.current
                    ? (hook.scrollContainerRef.current as any).__virtualizedListRef
                    : undefined
                }
                viewMode={viewMode}
                coverSize={coverSize}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
}
