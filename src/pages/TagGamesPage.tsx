import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useLoading } from "../contexts/LoadingContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import { useGamesListPage } from "../hooks/useGamesListPage";
import { useIgdbGamesForSeriesFranchise } from "../hooks/useIgdbGamesForSeriesFranchise";
import GamesListPageContent from "../components/games/GamesListPageContent";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import LibrariesBar from "../components/layout/LibrariesBar";
import type { ViewMode } from "../types";
import type { GameItem, CollectionItem } from "../types";
import type { FilterField } from "../components/filters/types";
import type { TagKey } from "../utils/tagPages";
import { buildCoverUrl } from "../utils/api";

type TagGamesPageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  allCollections?: CollectionItem[];
  tagField: FilterField;
  paramName: string;
  storageKey: string;
  tagKey?: TagKey;
  onIgdbGameClick?: (igdbId: number) => void;
};

export default function TagGamesPage({
  onGameClick,
  onGamesLoaded,
  onPlay,
  allCollections = [],
  tagField,
  paramName,
  storageKey,
  tagKey,
  onIgdbGameClick,
}: TagGamesPageProps) {
  const { games: libraryGames } = useLibraryGames();
  const { isLoading, setLoading } = useLoading();
  const params = useParams<Record<string, string>>();
  const rawParam = params[paramName];
  const tagValue = useMemo(
    () => (rawParam ? decodeURIComponent(rawParam) : null),
    [rawParam]
  );
  const libraryGameIds = useMemo(
    () => libraryGames.map((g) => (typeof g.id === "number" ? g.id : parseInt(String(g.id), 10))).filter((id) => !Number.isNaN(id)),
    [libraryGames]
  );

  const isSeriesOrFranchise = tagKey === "series" || tagKey === "franchise";
  const { igdbGames, loading: igdbLoading } = useIgdbGamesForSeriesFranchise(
    isSeriesOrFranchise ? tagKey : null,
    tagValue,
    libraryGameIds,
    true
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

  const mergedGamesForSeriesFranchise = useMemo(() => {
    if (!isSeriesOrFranchise || !onIgdbGameClick) return null;
    const libraryGamesInSeries = hook.filteredAndSortedGames;
    const libraryById = new Map(libraryGamesInSeries.map((g) => [String(g.id), g]));
    const seenIds = new Set<string>();
    const merged: GameItem[] = [];
    for (const ig of igdbGames) {
      seenIds.add(String(ig.id));
      const lib = libraryById.get(String(ig.id));
      if (lib) {
        merged.push(lib);
      } else {
        merged.push({
          id: String(ig.id),
          title: ig.name,
          cover: ig.cover || undefined,
          year: ig.releaseDate ?? undefined,
          isIgdbOnly: true,
        });
      }
    }
    for (const lib of libraryGamesInSeries) {
      if (!seenIds.has(lib.id)) {
        merged.push(lib);
      }
    }
    merged.sort((a, b) => {
      const aYear = a.year ?? 9999;
      const bYear = b.year ?? 9999;
      return aYear - bYear;
    });
    return merged;
  }, [isSeriesOrFranchise, onIgdbGameClick, hook.filteredAndSortedGames, igdbGames]);

  const { libraryGamesLoading, setFilterField, setSelectedThemes,
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
    setSortField,
    setSortAscending,
  } = hook;

  useEffect(() => {
    setLoading(libraryGamesLoading);
  }, [libraryGamesLoading, setLoading]);

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
        setSortField("releaseDate");
        setSortAscending(true); /* true = ascending, oldest first (chronological) */
        break;
      case "franchise":
        setSelectedFranchise(tagValue);
        setSortField("releaseDate");
        setSortAscending(true); /* true = ascending, oldest first (chronological) */
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
    setSortField,
    setSortAscending,
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
              isLoading={isLoading || igdbLoading}
              isReady={hook.isReady}
              allCollections={allCollections}
              onGameClick={onGameClick}
              onGamesLoaded={handleGamesLoaded}
              onPlay={onPlay}
              buildCoverUrlFn={buildCoverUrlFn}
              gamesOverride={mergedGamesForSeriesFranchise}
              onIgdbGameClick={onIgdbGameClick}
            />
            {hook.sortField === "title" && hook.isReady && (
              <AlphabetNavigator
                games={mergedGamesForSeriesFranchise ?? hook.filteredAndSortedGames}
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
