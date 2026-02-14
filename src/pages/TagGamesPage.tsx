import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useLoading } from "../contexts/LoadingContext";
import { useGamesListPage } from "../hooks/useGamesListPage";
import GamesListPageContent from "../components/games/GamesListPageContent";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import LibrariesBar from "../components/layout/LibrariesBar";
import type { ViewMode } from "../types";
import type { GameItem, CollectionItem } from "../types";
import type { FilterField } from "../components/filters/types";
import { buildCoverUrl } from "../utils/api";

type TagGamesPageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  allCollections?: CollectionItem[];
  tagField: FilterField;
  paramName: string;
  storageKey: string;
};

export default function TagGamesPage({
  onGameClick,
  onGamesLoaded,
  onPlay,
  allCollections = [],
  tagField,
  paramName,
  storageKey,
}: TagGamesPageProps) {
  const { isLoading } = useLoading();
  const params = useParams<Record<string, string>>();
  const rawParam = params[paramName];
  const tagValue = useMemo(
    () => (rawParam ? decodeURIComponent(rawParam) : null),
    [rawParam]
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(`viewMode_${storageKey}`);
    return (saved as ViewMode) || "grid";
  });
  const coverSize = (() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  })();

  useEffect(() => {
    localStorage.setItem(`viewMode_${storageKey}`, viewMode);
  }, [viewMode, storageKey]);

  const hook = useGamesListPage({
    defaultFilterField: tagField,
    listenToGameDeleted: true,
    gameEvents: ["gameUpdated", "gameDeleted"],
    scrollRestorationMode: viewMode === "table" ? undefined : viewMode,
  });

  const {
    setFilterField,
    setSelectedThemes,
    setSelectedKeywords,
    setSelectedPlatforms,
    setSelectedGameModes,
    setSelectedPublishers,
    setSelectedDevelopers,
    setSelectedPlayerPerspectives,
    setSelectedGameEngines,
    setSelectedGenre,
    setSelectedSeries,
    setSelectedFranchise,
  } = hook;

  useEffect(() => {
    if (!tagValue) return;
    setFilterField(tagField);
    switch (tagField) {
      case "themes":
        setSelectedThemes(tagValue);
        break;
      case "keywords":
        setSelectedKeywords(tagValue);
        break;
      case "platforms":
        setSelectedPlatforms(tagValue);
        break;
      case "gameModes":
        setSelectedGameModes(tagValue);
        break;
      case "publishers":
        setSelectedPublishers(tagValue);
        break;
      case "developers":
        setSelectedDevelopers(tagValue);
        break;
      case "playerPerspectives":
        setSelectedPlayerPerspectives(tagValue);
        break;
      case "gameEngines":
        setSelectedGameEngines(tagValue);
        break;
      case "genre":
        setSelectedGenre(tagValue);
        break;
      case "series":
        setSelectedSeries(tagValue);
        break;
      case "franchise":
        setSelectedFranchise(tagValue);
        break;
      default:
        break;
    }
  }, [
    tagValue,
    tagField,
    setFilterField,
    setSelectedThemes,
    setSelectedKeywords,
    setSelectedPlatforms,
    setSelectedGameModes,
    setSelectedPublishers,
    setSelectedDevelopers,
    setSelectedPlayerPerspectives,
    setSelectedGameEngines,
    setSelectedGenre,
    setSelectedSeries,
    setSelectedFranchise,
  ]);

  const buildCoverUrlFn = useCallback(
    (apiBase: string, cover?: string, addTimestamp?: boolean) => {
      return buildCoverUrl(apiBase, cover, addTimestamp ?? true);
    },
    []
  );

  const handleGamesLoaded = useCallback(
    (games: GameItem[]) => {
      onGamesLoaded(games);
    },
    [onGamesLoaded]
  );

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
                  (viewMode === "detail" && hook.scrollContainerRef.current
                    ? (hook.scrollContainerRef.current as any).__virtualizedListRef
                    : undefined) ||
                  (viewMode === "table" && hook.tableScrollRef.current
                    ? (hook.tableScrollRef.current as any).__virtualizedListRef
                    : undefined)
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
