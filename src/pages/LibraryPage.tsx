import { useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLoading } from "../contexts/LoadingContext";
import { useGamesListPage } from "../hooks/useGamesListPage";
import GamesListPageContent from "../components/games/GamesListPageContent";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import type { ViewMode } from "../types";
import type { GameItem, CollectionItem } from "../types";
import { buildCoverUrl } from "../utils/api";

type LibraryPageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  coverSize: number;
  viewMode: ViewMode;
  allCollections?: CollectionItem[];
};

export default function LibraryPage({
  onGameClick,
  onGamesLoaded,
  onPlay,
  coverSize,
  viewMode,
  allCollections = [],
}: LibraryPageProps) {
  const { isLoading } = useLoading();
  const { isLoading: authLoading } = useAuth();

  const hook = useGamesListPage({
    localStoragePrefix: "library",
    defaultFilterField: "all",
    waitForAuth: true,
    listenToMetadataReload: true,
    gameEvents: ["gameUpdated"],
    scrollRestorationMode: viewMode === "table" ? undefined : viewMode,
  });

  // Initialize data fetching when auth is ready
  useEffect(() => {
    if (!authLoading) {
      hook.fetchLibraryGames();
      hook.fetchCategories();
      hook.fetchCollections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Memoize onGamesLoaded to prevent infinite loop
  const handleGamesLoaded = useCallback((games: GameItem[]) => {
    onGamesLoaded(games);
  }, [onGamesLoaded]);

  return (
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
          buildCoverUrlFn={buildCoverUrl}
        />
        {hook.sortField === "title" && hook.isReady && (
          <AlphabetNavigator
            games={hook.filteredAndSortedGames}
            scrollContainerRef={
              viewMode === "table" ? hook.tableScrollRef : hook.scrollContainerRef
            }
            itemRefs={hook.itemRefs}
            ascending={hook.sortAscending}
          />
        )}
      </div>
    </main>
  );
}
