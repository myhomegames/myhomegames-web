import { useEffect } from "react";
import GamesList from "./GamesList";
import GamesListDetail from "./GamesListDetail";
import GamesListTable from "./GamesListTable";
import GamesListTableHeader from "./GamesListTableHeader";
import GamesListToolbar from "./GamesListToolbar";
import type { ViewMode, GameItem, CollectionItem } from "../../types";
import { buildCoverUrl } from "../../utils/api";
import type { UseGamesListPageReturn } from "../../hooks/useGamesListPage";

type GamesListPageContentProps = {
  // Hook return values
  hook: UseGamesListPageReturn;
  
  // Page-specific props
  viewMode: ViewMode;
  coverSize: number;
  isLoading: boolean;
  isReady: boolean;
  allCollections?: CollectionItem[];
  
  // Callbacks
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  
  // Custom buildCoverUrl function (optional, for CategoryPage)
  buildCoverUrlFn?: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
};

export default function GamesListPageContent({
  hook,
  viewMode,
  coverSize,
  isLoading,
  isReady,
  allCollections = [],
  onGameClick,
  onGamesLoaded,
  onPlay,
  buildCoverUrlFn,
}: GamesListPageContentProps) {
  const {
    games,
    filterField,
    setFilterField,
    selectedYear,
    setSelectedYear,
    selectedDecade,
    setSelectedDecade,
    selectedCollection,
    setSelectedCollection,
    selectedAgeRating,
    setSelectedAgeRating,
    selectedGenre,
    setSelectedGenre,
    selectedThemes,
    setSelectedThemes,
    selectedKeywords,
    setSelectedKeywords,
    selectedPlatforms,
    setSelectedPlatforms,
    selectedGameModes,
    setSelectedGameModes,
    selectedPublishers,
    setSelectedPublishers,
    selectedDevelopers,
    setSelectedDevelopers,
    selectedPlayerPerspectives,
    setSelectedPlayerPerspectives,
    selectedGameEngines,
    setSelectedGameEngines,
    sortField,
    setSortField,
    sortAscending,
    setSortAscending,
    columnVisibility,
    toggleColumn,
    handleTableSort,
    filteredAndSortedGames,
    scrollContainerRef,
    tableScrollRef,
    itemRefs,
    handleGameUpdate,
    handleGameDelete,
    availableGenres,
    availableCollections,
  } = hook;

  // Call onGamesLoaded when games change (only when games actually change, not on every render)
  useEffect(() => {
    if (games.length > 0) {
      onGamesLoaded(games);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length]); // Only depend on games.length to avoid infinite loops

  // Use custom buildCoverUrl function if provided, otherwise use default
  const coverUrlBuilder = buildCoverUrlFn || buildCoverUrl;

  return (
    <div 
      className={`home-page-content-wrapper ${!isLoading && games.length > 0 ? "has-toolbar" : ""}`}
      style={{
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      {/* Toolbar with filter and sort */}
      {!isLoading && games.length > 0 && (
        <GamesListToolbar
          gamesCount={filteredAndSortedGames.length}
          games={games}
          onFilterChange={setFilterField}
          onYearFilterChange={setSelectedYear}
          onGenreFilterChange={setSelectedGenre}
          onThemesFilterChange={setSelectedThemes}
          onKeywordsFilterChange={setSelectedKeywords}
          onPlatformsFilterChange={setSelectedPlatforms}
          onGameModesFilterChange={setSelectedGameModes}
          onPublishersFilterChange={setSelectedPublishers}
          onDevelopersFilterChange={setSelectedDevelopers}
          onPlayerPerspectivesFilterChange={setSelectedPlayerPerspectives}
          onGameEnginesFilterChange={setSelectedGameEngines}
          onDecadeFilterChange={setSelectedDecade}
          onSortChange={setSortField}
          onSortDirectionChange={setSortAscending}
          currentFilter={filterField}
          selectedYear={selectedYear}
          selectedGenre={selectedGenre}
          selectedDecade={selectedDecade}
          selectedCollection={selectedCollection}
          onCollectionFilterChange={setSelectedCollection}
          selectedAgeRating={selectedAgeRating}
          onAgeRatingFilterChange={setSelectedAgeRating}
          selectedThemes={selectedThemes}
          selectedKeywords={selectedKeywords}
          selectedPlatforms={selectedPlatforms}
          selectedGameModes={selectedGameModes}
          selectedPublishers={selectedPublishers}
          selectedDevelopers={selectedDevelopers}
          selectedPlayerPerspectives={selectedPlayerPerspectives}
          selectedGameEngines={selectedGameEngines}
          currentSort={sortField}
          sortAscending={sortAscending}
          viewMode={viewMode}
          availableGenres={availableGenres}
          availableCollections={availableCollections}
        />
      )}
      {/* Table header section */}
      {viewMode === "table" && !isLoading && games.length > 0 && (
        <GamesListTableHeader
          columnVisibility={columnVisibility}
          onToggleColumn={toggleColumn}
          sortField={sortField}
          sortAscending={sortAscending}
          onSort={handleTableSort}
        />
      )}
      {/* Scrollable lists container */}
      <div
        ref={scrollContainerRef}
        className={`home-page-scroll-container ${
          viewMode === "table" ? "table-view" : ""
        } ${!isLoading && filteredAndSortedGames.length === 0 ? "centered-content min-h-[400px]" : ""}`}
      >
        {!isLoading && (
          <>
            {viewMode === "grid" && (
              <GamesList
                games={filteredAndSortedGames}
                onGameClick={onGameClick}
                onPlay={onPlay}
                onGameUpdate={handleGameUpdate}
                onGameDelete={handleGameDelete}
                buildCoverUrl={coverUrlBuilder}
                coverSize={coverSize}
                itemRefs={itemRefs}
                viewMode={viewMode}
                allCollections={allCollections}
                scrollContainerRef={scrollContainerRef}
              />
            )}
            {viewMode === "detail" && (
              <GamesListDetail
                games={filteredAndSortedGames}
                onGameClick={onGameClick}
                onPlay={onPlay}
                onGameUpdate={handleGameUpdate}
                onGameDelete={handleGameDelete}
                buildCoverUrl={coverUrlBuilder}
                itemRefs={itemRefs}
                allCollections={allCollections}
                scrollContainerRef={scrollContainerRef}
              />
            )}
            {viewMode === "table" && (
              <GamesListTable
                games={filteredAndSortedGames}
                onGameClick={onGameClick}
                onPlay={onPlay}
                onGameUpdate={handleGameUpdate}
                onGameDelete={handleGameDelete}
                itemRefs={itemRefs}
                scrollContainerRef={tableScrollRef}
                allCollections={allCollections}
                columnVisibility={columnVisibility}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
