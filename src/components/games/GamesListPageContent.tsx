import { useCallback, useEffect, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import GamesList from "./GamesList";
import GamesListDetail from "./GamesListDetail";
import GamesListTable from "./GamesListTable";
import GamesListTableHeader from "./GamesListTableHeader";
import GamesListToolbar from "./GamesListToolbar";
import type { ViewMode, GameItem, CollectionItem } from "../../types";
import { buildCoverUrl } from "../../utils/api";
import type { UseGamesListPageReturn } from "../../hooks/useGamesListPage";
import { useSkin } from "../../contexts/SkinContext";
import { useTopDockSlot } from "../../contexts/TopDockSlotContext";
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
  
  // Series/franchise: merged library + IGDB games in one list
  gamesOverride?: GameItem[] | null;
  onIgdbGameClick?: (igdbId: number) => void;
  /** When on a tag page with an IGDB id, override the filter value label (e.g. show "Action" instead of "1") */
  selectedFilterValueLabel?: string;
  disableGridVirtualization?: boolean;
  forceSingleColumnGrid?: boolean;
  /** Tag PS3 column: parent `.tag-games-ps3-games` is the scroll container. */
  ps3GamesColumnMode?: boolean;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
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
  gamesOverride,
  onIgdbGameClick,
  selectedFilterValueLabel,
  disableGridVirtualization = false,
  forceSingleColumnGrid = false,
  ps3GamesColumnMode = false,
  scrollContainerRef: scrollContainerRefProp,
}: GamesListPageContentProps) {
  const { t } = useTranslation();
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
    selectedSeries,
    setSelectedSeries,
    selectedFranchise,
    setSelectedFranchise,
    selectedAgeRating,
    setSelectedAgeRating,
    selectedGameType,
    setSelectedGameType,
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
    mainGamesOnly,
    scrollContainerRef: hookScrollContainerRef,
    tableScrollRef,
    itemRefs,
    handleGameUpdate,
    handleGameDelete,
    saveScrollBeforeEdit,
    clearScrollAfterEditRef,
    availableGenres,
    availableCollections,
    availableSeries,
    availableFranchises,
    availableDevelopers,
    availablePublishers,
  } = hook;

  /** Restrict Play/dropdown to platform executables only when platform filter is selected; when filter is cleared, show all */
  const platformIdForPlay =
    filterField === "platforms" && selectedPlatforms ? selectedPlatforms : undefined;

  const handleFilterChange = useCallback(
    (field: import("../filters/types").FilterField) => {
      if (field === "all") {
        setSelectedYear(null);
        setSelectedDecade(null);
        setSelectedCollection(null);
        setSelectedSeries(null);
        setSelectedFranchise(null);
        setSelectedGenre(null);
        setSelectedThemes(null);
        setSelectedKeywords(null);
        setSelectedPlatforms(null);
        setSelectedGameModes(null);
        setSelectedPublishers(null);
        setSelectedDevelopers(null);
        setSelectedPlayerPerspectives(null);
        setSelectedGameEngines(null);
        setSelectedAgeRating(null);
        setSelectedGameType(null);
      }
      setFilterField(field);
    },
    [
      setFilterField,
      setSelectedYear,
      setSelectedDecade,
      setSelectedCollection,
      setSelectedSeries,
      setSelectedFranchise,
      setSelectedGenre,
      setSelectedThemes,
      setSelectedKeywords,
      setSelectedPlatforms,
      setSelectedGameModes,
      setSelectedPublishers,
      setSelectedDevelopers,
      setSelectedPlayerPerspectives,
      setSelectedGameEngines,
      setSelectedAgeRating,
      setSelectedGameType,
    ]
  );

  // Call onGamesLoaded when games change (only when games actually change, not on every render)
  useEffect(() => {
    if (games.length > 0) {
      onGamesLoaded(games);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length]); // Only depend on games.length to avoid infinite loops

  // Use custom buildCoverUrl function if provided, otherwise use default
  const coverUrlBuilder = buildCoverUrlFn || buildCoverUrl;

  const displayGames = gamesOverride ?? filteredAndSortedGames;
  const { activeSkinWeb } = useSkin();
  const forceVerticalCoversPage = activeSkinWeb.verticalCoverAlignment;
  const listScrollContainerRef = scrollContainerRefProp ?? hookScrollContainerRef;
  const singleColumnGrid =
    forceSingleColumnGrid || forceVerticalCoversPage || ps3GamesColumnMode;
  const { slotEl: topDockToolbarSlot } = useTopDockSlot();
  /**
   * The top-right tool dock skin option promotes the page toolbar (filter,
   * sort, games count) into the dock alongside the view/slider/menu controls.
   * We portal the existing JSX into the slot exposed by `LibrariesBar` instead
   * of duplicating state, so all handlers and selection still live here.
   *
   * When the dock skin option is active we ONLY render via the portal — never
   * inline — even if the slot has not been registered yet on the very first
   * render, to avoid the toolbar flashing in the page body before snapping
   * into the dock.
   */
  const toolbarInDock = Boolean(activeSkinWeb.topRightToolDock);
  const hasInlineToolbar = !isLoading && displayGames.length > 0 && !toolbarInDock;
  const handleGameClick = useCallback(
    (game: GameItem) => {
      const g = game as GameItem & { isIgdbOnly?: boolean };
      if (g.isIgdbOnly && onIgdbGameClick) {
        onIgdbGameClick(Number(game.id));
      } else {
        onGameClick(game);
      }
    },
    [onGameClick, onIgdbGameClick]
  );

  const toolbarNode =
    !isLoading && displayGames.length > 0 ? (
      <GamesListToolbar
        gamesCount={displayGames.length}
        games={games}
        onFilterChange={handleFilterChange}
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
        selectedSeries={selectedSeries}
        selectedFranchise={selectedFranchise}
        onSeriesFilterChange={setSelectedSeries}
        onFranchiseFilterChange={setSelectedFranchise}
        selectedAgeRating={selectedAgeRating}
        onAgeRatingFilterChange={setSelectedAgeRating}
        selectedGameType={selectedGameType}
        onGameTypeFilterChange={setSelectedGameType}
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
        availableSeries={availableSeries}
        availableFranchises={availableFranchises}
        availableDevelopers={availableDevelopers}
        availablePublishers={availablePublishers}
        selectedFilterValueLabel={selectedFilterValueLabel}
        dockToolbarPopups={toolbarInDock}
      />
    ) : null;

  return (
    <div
      className={`home-page-content-wrapper games-list-page-fade${isReady ? " games-list-page-fade--ready" : ""} ${hasInlineToolbar ? "has-toolbar" : ""}${forceVerticalCoversPage ? " mhg-vertical-covers-page" : ""}`}
    >
      {toolbarInDock
        ? topDockToolbarSlot && toolbarNode
          ? createPortal(toolbarNode, topDockToolbarSlot)
          : null
        : toolbarNode}
      {/* Table header section */}
      {viewMode === "table" && !isLoading && displayGames.length > 0 && (
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
        ref={ps3GamesColumnMode ? undefined : listScrollContainerRef}
        className={`home-page-scroll-container ${
          viewMode === "table" ? "table-view" : ""
        } ${!isReady || displayGames.length === 0 ? "centered-content min-h-[400px]" : ""}`}
      >
        {!isReady && (
          <div className="text-gray-400 text-center games-list-page-loading">
            {t("common.loading", "Loading...")}
          </div>
        )}
        {isReady && !isLoading && (
          <>
            {displayGames.length === 0 ? (
              <div className="text-gray-400 text-center">{t("table.noGames")}</div>
            ) : (
              <>
                {viewMode === "grid" && (
                  <GamesList
                    games={displayGames}
                    onGameClick={handleGameClick}
                    onPlay={onPlay}
                    onGameUpdate={handleGameUpdate}
                    onGameDelete={handleGameDelete}
                    buildCoverUrl={coverUrlBuilder}
                    coverSize={coverSize}
                    itemRefs={itemRefs}
                    viewMode={viewMode}
                    allCollections={allCollections}
                    scrollContainerRef={listScrollContainerRef}
                    platformIdForPlay={platformIdForPlay}
                    enableVirtualization={!disableGridVirtualization}
                    forceSingleColumnVirtualized={singleColumnGrid}
                  />
                )}
                {viewMode === "detail" && (
                  <GamesListDetail
                    games={displayGames}
                    onGameClick={handleGameClick}
                    onIgdbGameClick={onIgdbGameClick}
                    onPlay={onPlay}
                    onGameUpdate={handleGameUpdate}
                    onGameDelete={handleGameDelete}
                    saveScrollBeforeEdit={saveScrollBeforeEdit}
                    clearScrollAfterEditRef={clearScrollAfterEditRef}
                    buildCoverUrl={coverUrlBuilder}
                    itemRefs={itemRefs}
                    allCollections={allCollections}
                    scrollContainerRef={listScrollContainerRef}
                    platformIdForPlay={platformIdForPlay}
                    hideGameType={mainGamesOnly}
                  />
                )}
                {viewMode === "table" && (
                  <GamesListTable
                    games={displayGames}
                    onGameClick={handleGameClick}
                    onIgdbGameClick={onIgdbGameClick}
                    onPlay={onPlay}
                    onGameUpdate={handleGameUpdate}
                    onGameDelete={handleGameDelete}
                    saveScrollBeforeEdit={saveScrollBeforeEdit}
                    clearScrollAfterEditRef={clearScrollAfterEditRef}
                    itemRefs={itemRefs}
                    scrollContainerRef={tableScrollRef}
                    allCollections={allCollections}
                    columnVisibility={columnVisibility}
                    platformIdForPlay={platformIdForPlay}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
