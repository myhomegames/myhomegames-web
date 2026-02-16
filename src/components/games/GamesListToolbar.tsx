import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterPopup from "../filters/FilterPopup";
import SortPopup from "../toolbar/SortPopup";
import type { FilterField, GameItem } from "../filters/types";
import type { SortField } from "../../types";
import { formatAgeRating } from "./AgeRatings";
import { useTagLists } from "../../contexts/TagListsContext";
import "./GamesListToolbar.css";

type TagItem = { id: number; title: string } | string;

function buildTagLabelMap(
  games: GameItem[],
  field: "themes" | "platforms" | "gameModes" | "playerPerspectives" | "gameEngines"
): Map<string, string> {
  const map = new Map<string, string>();
  games.forEach((game) => {
    const list = (game[field] as (TagItem | number)[] | undefined) ?? [];
    list.forEach((item) => {
      if (typeof item === "number" && !Number.isNaN(item)) {
        map.set(String(item), String(item));
      } else if (typeof item === "object" && item != null && "id" in item && "title" in item) {
        map.set(String((item as { id: number }).id), (item as { title: string }).title);
      } else if (typeof item === "string" && item.trim()) {
        map.set(item.trim(), item.trim());
      }
    });
  });
  return map;
}

function buildDevPubLabelMap(
  games: GameItem[],
  field: "publishers" | "developers"
): Map<string, string> {
  const map = new Map<string, string>();
  games.forEach((game) => {
    const list = game[field];
    if (!list || !Array.isArray(list)) return;
    list.forEach((item: number | { id: number; name?: string }) => {
      if (typeof item === "number" && !Number.isNaN(item)) {
        map.set(String(item), String(item));
      } else if (typeof item === "object" && item != null && "id" in item) {
        map.set(String(item.id), (item as { name?: string }).name ?? String(item.id));
      }
    });
  });
  return map;
}

type GamesListToolbarProps = {
  gamesCount: number;
  games?: GameItem[];
  onFilterChange?: (field: FilterField) => void;
  onYearFilterChange?: (year: number | null) => void;
  onGenreFilterChange?: (genre: string | null) => void;
  onThemesFilterChange?: (theme: string | null) => void;
  onKeywordsFilterChange?: (keyword: string | null) => void;
  onPlatformsFilterChange?: (platform: string | null) => void;
  onGameModesFilterChange?: (mode: string | null) => void;
  onPublishersFilterChange?: (publisher: string | null) => void;
  onDevelopersFilterChange?: (developer: string | null) => void;
  onPlayerPerspectivesFilterChange?: (perspective: string | null) => void;
  onGameEnginesFilterChange?: (engine: string | null) => void;
  onDecadeFilterChange?: (decade: number | null) => void;
  onCollectionFilterChange?: (collection: string | null) => void;
  onSeriesFilterChange?: (series: string | null) => void;
  onFranchiseFilterChange?: (franchise: string | null) => void;
  onAgeRatingFilterChange?: (ageRating: string | null) => void;
  onSortChange?: (field: SortField) => void;
  onSortDirectionChange?: (ascending: boolean) => void;
  currentFilter?: FilterField;
  selectedYear?: number | null;
  selectedGenre?: string | null;
  selectedThemes?: string | null;
  selectedKeywords?: string | null;
  selectedPlatforms?: string | null;
  selectedGameModes?: string | null;
  selectedPublishers?: string | null;
  selectedDevelopers?: string | null;
  selectedPlayerPerspectives?: string | null;
  selectedGameEngines?: string | null;
  selectedDecade?: number | null;
  selectedCollection?: string | null;
  selectedSeries?: string | null;
  selectedFranchise?: string | null;
  selectedAgeRating?: string | null;
  currentSort?: SortField;
  sortAscending?: boolean;
  viewMode?: "grid" | "detail" | "table";
  availableGenres?: Array<{ id: string; title: string }>;
  availableCollections?: Array<{ id: string; title: string }>;
  availableSeries?: Array<{ id: string; title: string }>;
  availableFranchises?: Array<{ id: string; title: string }>;
  availableDevelopers?: Array<{ id: string; title: string }>;
  availablePublishers?: Array<{ id: string; title: string }>;
};

export default function GamesListToolbar({
  gamesCount,
  games = [],
  onFilterChange,
  onYearFilterChange,
  onGenreFilterChange,
  onThemesFilterChange,
  onKeywordsFilterChange,
  onPlatformsFilterChange,
  onGameModesFilterChange,
  onPublishersFilterChange,
  onDevelopersFilterChange,
  onPlayerPerspectivesFilterChange,
  onGameEnginesFilterChange,
  onDecadeFilterChange,
  onCollectionFilterChange,
  onSeriesFilterChange,
  onFranchiseFilterChange,
  onAgeRatingFilterChange,
  onSortChange,
  onSortDirectionChange,
  currentFilter = "all",
  selectedYear = null,
  selectedGenre = null,
  selectedThemes = null,
  selectedKeywords = null,
  selectedPlatforms = null,
  selectedGameModes = null,
  selectedPublishers = null,
  selectedDevelopers = null,
  selectedPlayerPerspectives = null,
  selectedGameEngines = null,
  selectedDecade = null,
  selectedCollection = null,
  selectedSeries = null,
  selectedFranchise = null,
  selectedAgeRating = null,
  currentSort = "title",
  sortAscending = true,
  viewMode = "grid",
  availableGenres = [],
  availableCollections = [],
  availableSeries = [],
  availableFranchises = [],
  availableDevelopers = [],
  availablePublishers = [],
}: GamesListToolbarProps) {
  const { t } = useTranslation();
  const { tagLabels: contextTagLabels } = useTagLists();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const emptyMap = useMemo(() => new Map<string, string>(), []);

  const tagLabelMaps = useMemo(() => {
    const empty = () => emptyMap;
    const tagFields = ["themes", "platforms", "gameModes", "playerPerspectives", "gameEngines"] as const;
    const needMaps = tagFields.some((f) => currentFilter === f);
    const resolve = (fromGames: Map<string, string>, contextMap: Map<string, string>) => {
      const out = new Map<string, string>();
      fromGames.forEach((label, id) => {
        out.set(id, contextMap.get(id) ?? label);
      });
      return out;
    };
    if (!needMaps) {
      return {
        themes: empty(),
        platforms: empty(),
        gameModes: empty(),
        playerPerspectives: empty(),
        gameEngines: empty(),
      };
    }
    return {
      themes: currentFilter === "themes" ? resolve(buildTagLabelMap(games, "themes"), contextTagLabels.themes) : empty(),
      platforms: currentFilter === "platforms" ? resolve(buildTagLabelMap(games, "platforms"), contextTagLabels.platforms) : empty(),
      gameModes: currentFilter === "gameModes" ? resolve(buildTagLabelMap(games, "gameModes"), contextTagLabels.gameModes) : empty(),
      playerPerspectives: currentFilter === "playerPerspectives" ? resolve(buildTagLabelMap(games, "playerPerspectives"), contextTagLabels.playerPerspectives) : empty(),
      gameEngines: currentFilter === "gameEngines" ? resolve(buildTagLabelMap(games, "gameEngines"), contextTagLabels.gameEngines) : empty(),
    };
  }, [games, currentFilter, emptyMap, contextTagLabels]);

  const devPubLabelMaps = useMemo(() => {
    const empty = () => emptyMap;
    const needMaps = currentFilter === "publishers" || currentFilter === "developers";
    if (!needMaps) {
      return { publishers: empty(), developers: empty() };
    }
    return {
      publishers: currentFilter === "publishers" ? buildDevPubLabelMap(games, "publishers") : empty(),
      developers: currentFilter === "developers" ? buildDevPubLabelMap(games, "developers") : empty(),
    };
  }, [games, currentFilter, emptyMap]);

  const getCurrentFilterLabel = () => {
    if (currentFilter === "year" && selectedYear !== null) {
      return selectedYear.toString();
    }
    if (currentFilter === "decade" && selectedDecade !== null) {
      return `${selectedDecade}s`;
    }
    if (currentFilter === "collection" && selectedCollection !== null) {
      const collection = availableCollections?.find((c: { id: string; title: string }) => String(c.id) === String(selectedCollection));
      return collection ? collection.title : String(selectedCollection);
    }
    if (currentFilter === "series" && selectedSeries !== null) {
      const series = availableSeries?.find((s: { id: string; title: string }) => String(s.id) === String(selectedSeries));
      return series ? series.title : String(selectedSeries);
    }
    if (currentFilter === "franchise" && selectedFranchise !== null) {
      const franchise = availableFranchises?.find((f: { id: string; title: string }) => String(f.id) === String(selectedFranchise));
      return franchise ? franchise.title : String(selectedFranchise);
    }
    if (currentFilter === "genre" && selectedGenre !== null) {
      const genre = availableGenres.find((g) => String(g.id) === String(selectedGenre));
      return genre ? t(`genre.${genre.title}`, genre.title) : String(selectedGenre);
    }
    if (currentFilter === "themes" && selectedThemes !== null) {
      const title = tagLabelMaps.themes.get(String(selectedThemes)) ?? String(selectedThemes);
      return t(`themes.${title}`, title);
    }
    if (currentFilter === "keywords" && selectedKeywords !== null) {
      return selectedKeywords;
    }
    if (currentFilter === "platforms" && selectedPlatforms !== null) {
      return tagLabelMaps.platforms.get(String(selectedPlatforms)) ?? String(selectedPlatforms);
    }
    if (currentFilter === "gameModes" && selectedGameModes !== null) {
      const title = tagLabelMaps.gameModes.get(String(selectedGameModes)) ?? String(selectedGameModes);
      return t(`gameModes.${title}`, title);
    }
    if (currentFilter === "publishers" && selectedPublishers !== null) {
      const publisher = availablePublishers?.find((p) => String(p.id) === String(selectedPublishers));
      if (publisher?.title) return publisher.title;
      const fromGames = devPubLabelMaps.publishers.get(String(selectedPublishers));
      return fromGames && fromGames !== String(selectedPublishers) ? fromGames : String(selectedPublishers);
    }
    if (currentFilter === "developers" && selectedDevelopers !== null) {
      const developer = availableDevelopers?.find((d) => String(d.id) === String(selectedDevelopers));
      if (developer?.title) return developer.title;
      const fromGames = devPubLabelMaps.developers.get(String(selectedDevelopers));
      return fromGames && fromGames !== String(selectedDevelopers) ? fromGames : String(selectedDevelopers);
    }
    if (currentFilter === "playerPerspectives" && selectedPlayerPerspectives !== null) {
      const title = tagLabelMaps.playerPerspectives.get(String(selectedPlayerPerspectives)) ?? String(selectedPlayerPerspectives);
      return t(`playerPerspectives.${title}`, title);
    }
    if (currentFilter === "gameEngines" && selectedGameEngines !== null) {
      return tagLabelMaps.gameEngines.get(String(selectedGameEngines)) ?? String(selectedGameEngines);
    }
    if (currentFilter === "ageRating" && selectedAgeRating !== null) {
      // Format age rating: selectedAgeRating is "category-rating"
      const [category, rating] = selectedAgeRating.split('-').map(Number);
      return formatAgeRating(category, rating, t) || selectedAgeRating;
    }
    const filterOptions = [
      { value: "all" as FilterField, label: t("gamesListToolbar.filter.all") },
      { value: "genre" as FilterField, label: t("gamesListToolbar.filter.genre") },
      { value: "themes" as FilterField, label: t("gamesListToolbar.filter.themes") },
      { value: "keywords" as FilterField, label: t("gamesListToolbar.filter.keywords") },
      { value: "platforms" as FilterField, label: t("gamesListToolbar.filter.platforms") },
      { value: "gameModes" as FilterField, label: t("gamesListToolbar.filter.gameModes") },
      { value: "publishers" as FilterField, label: t("gamesListToolbar.filter.publishers") },
      { value: "developers" as FilterField, label: t("gamesListToolbar.filter.developers") },
      { value: "playerPerspectives" as FilterField, label: t("gamesListToolbar.filter.playerPerspectives") },
      { value: "gameEngines" as FilterField, label: t("gamesListToolbar.filter.gameEngines") },
      { value: "year" as FilterField, label: t("gamesListToolbar.filter.year") },
      { value: "decade" as FilterField, label: t("gamesListToolbar.filter.decade") },
      { value: "collection" as FilterField, label: t("gamesListToolbar.filter.collection") },
      { value: "series" as FilterField, label: t("gamesListToolbar.filter.series") },
      { value: "franchise" as FilterField, label: t("gamesListToolbar.filter.franchise") },
      { value: "ageRating" as FilterField, label: t("gamesListToolbar.filter.ageRating") },
    ];
    return filterOptions.find((opt) => opt.value === currentFilter)?.label || "";
  };

  const currentFilterLabel = getCurrentFilterLabel();
  const sortOptions = [
    { value: "title" as SortField, label: t("gamesListToolbar.sort.title") },
    { value: "year" as SortField, label: t("gamesListToolbar.sort.year") },
    { value: "releaseDate" as SortField, label: t("gamesListToolbar.sort.releaseDate") },
    { value: "criticRating" as SortField, label: t("gamesListToolbar.sort.criticRating") },
    { value: "userRating" as SortField, label: t("gamesListToolbar.sort.userRating") },
    { value: "stars" as SortField, label: t("gamesListToolbar.sort.stars") },
    { value: "ageRating" as SortField, label: t("gamesListToolbar.sort.ageRating") },
  ];
  const currentSortLabel = sortOptions.find((opt) => opt.value === currentSort)?.label || "";

  return (
    <div className="games-list-toolbar">
      <div className="games-list-toolbar-left">
        <div className="games-list-toolbar-item" ref={filterRef}>
          <button
            className="games-list-toolbar-button"
            onClick={() => {
              setIsFilterOpen(!isFilterOpen);
              setIsSortOpen(false);
            }}
          >
            {currentFilter && currentFilter !== "all" && (
              <span
                className="games-list-toolbar-clear-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilterChange?.("all");
                  if (onYearFilterChange) {
                    onYearFilterChange(null);
                  }
                  if (onGenreFilterChange) {
                    onGenreFilterChange(null);
                  }
                  if (onThemesFilterChange) {
                    onThemesFilterChange(null);
                  }
                  if (onKeywordsFilterChange) {
                    onKeywordsFilterChange(null);
                  }
                  if (onPlatformsFilterChange) {
                    onPlatformsFilterChange(null);
                  }
                  if (onGameModesFilterChange) {
                    onGameModesFilterChange(null);
                  }
                  if (onPublishersFilterChange) {
                    onPublishersFilterChange(null);
                  }
                  if (onDevelopersFilterChange) {
                    onDevelopersFilterChange(null);
                  }
                  if (onPlayerPerspectivesFilterChange) {
                    onPlayerPerspectivesFilterChange(null);
                  }
                  if (onGameEnginesFilterChange) {
                    onGameEnginesFilterChange(null);
                  }
                  if (onDecadeFilterChange) {
                    onDecadeFilterChange(null);
                  }
                  if (onCollectionFilterChange) {
                    onCollectionFilterChange(null);
                  }
                  if (onAgeRatingFilterChange) {
                    onAgeRatingFilterChange(null);
                  }
                  setIsFilterOpen(false);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onFilterChange?.("all");
                    if (onYearFilterChange) {
                      onYearFilterChange(null);
                    }
                    if (onGenreFilterChange) {
                      onGenreFilterChange(null);
                    }
                    if (onThemesFilterChange) {
                      onThemesFilterChange(null);
                    }
                    if (onKeywordsFilterChange) {
                      onKeywordsFilterChange(null);
                    }
                    if (onPlatformsFilterChange) {
                      onPlatformsFilterChange(null);
                    }
                    if (onGameModesFilterChange) {
                      onGameModesFilterChange(null);
                    }
                    if (onPublishersFilterChange) {
                      onPublishersFilterChange(null);
                    }
                    if (onDevelopersFilterChange) {
                      onDevelopersFilterChange(null);
                    }
                    if (onPlayerPerspectivesFilterChange) {
                      onPlayerPerspectivesFilterChange(null);
                    }
                    if (onGameEnginesFilterChange) {
                      onGameEnginesFilterChange(null);
                    }
                    if (onDecadeFilterChange) {
                      onDecadeFilterChange(null);
                    }
                    if (onCollectionFilterChange) {
                      onCollectionFilterChange(null);
                    }
                    if (onAgeRatingFilterChange) {
                      onAgeRatingFilterChange(null);
                    }
                    setIsFilterOpen(false);
                  }
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
            <span className="games-list-toolbar-value">{currentFilterLabel}</span>
            <svg
              className={`games-list-toolbar-arrow ${isFilterOpen ? "open" : ""}`}
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9L1 4h10L6 9z"
                fill="currentColor"
              />
            </svg>
          </button>
          <FilterPopup
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            currentFilter={currentFilter}
            selectedYear={selectedYear}
            selectedGenre={selectedGenre}
            selectedThemes={selectedThemes}
            selectedKeywords={selectedKeywords}
            selectedPlatforms={selectedPlatforms}
            selectedGameModes={selectedGameModes}
            selectedPublishers={selectedPublishers}
            selectedDevelopers={selectedDevelopers}
            selectedPlayerPerspectives={selectedPlayerPerspectives}
            selectedGameEngines={selectedGameEngines}
            selectedDecade={selectedDecade}
            selectedCollection={selectedCollection}
            selectedSeries={selectedSeries}
            selectedFranchise={selectedFranchise}
            selectedAgeRating={selectedAgeRating}
            onFilterChange={onFilterChange}
            onYearFilterChange={onYearFilterChange}
            onGenreFilterChange={onGenreFilterChange}
            onThemesFilterChange={onThemesFilterChange}
            onKeywordsFilterChange={onKeywordsFilterChange}
            onPlatformsFilterChange={onPlatformsFilterChange}
            onGameModesFilterChange={onGameModesFilterChange}
            onPublishersFilterChange={onPublishersFilterChange}
            onDevelopersFilterChange={onDevelopersFilterChange}
            onPlayerPerspectivesFilterChange={onPlayerPerspectivesFilterChange}
            onGameEnginesFilterChange={onGameEnginesFilterChange}
            onDecadeFilterChange={onDecadeFilterChange}
            onCollectionFilterChange={onCollectionFilterChange}
            onSeriesFilterChange={onSeriesFilterChange}
            onFranchiseFilterChange={onFranchiseFilterChange}
            onAgeRatingFilterChange={onAgeRatingFilterChange}
            games={games}
            availableGenres={availableGenres}
            availableCollections={availableCollections}
            availableSeries={availableSeries}
            availableFranchises={availableFranchises}
            availableDevelopers={availableDevelopers}
            availablePublishers={availablePublishers}
          />
        </div>

        {viewMode !== "table" && (
          <>
            <div className="games-list-toolbar-item" ref={sortRef}>
              <button
                className="games-list-toolbar-button"
                onClick={() => {
                  setIsSortOpen(!isSortOpen);
                  setIsFilterOpen(false);
                }}
              >
                <span className="games-list-toolbar-value">
                  {t("gamesListToolbar.sort.prefix")} {currentSortLabel}
                </span>
                <svg
                  className={`games-list-toolbar-arrow ${isSortOpen ? "open" : ""}`}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 9L1 4h10L6 9z"
                    fill="currentColor"
                  />
                </svg>
              </button>
                  <SortPopup
                    isOpen={isSortOpen}
                    onClose={() => setIsSortOpen(false)}
                    currentSort={currentSort}
                    sortAscending={sortAscending}
                    onSortChange={onSortChange}
                    onSortDirectionChange={onSortDirectionChange}
                  />
            </div>
            <span className="games-list-toolbar-count">
              {gamesCount}
            </span>
          </>
        )}
        {viewMode === "table" && (
          <span className="games-list-toolbar-count">
            {gamesCount}
          </span>
        )}
      </div>
    </div>
  );
}

