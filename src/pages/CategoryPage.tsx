import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { useParams } from "react-router-dom";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useGameEvents } from "../hooks/useGameEvents";
import { useLoading } from "../contexts/LoadingContext";
import GamesList from "../components/games/GamesList";
import GamesListDetail from "../components/games/GamesListDetail";
import GamesListTable from "../components/games/GamesListTable";
import GamesListTableHeader from "../components/games/GamesListTableHeader";
import AlphabetNavigator from "../components/ui/AlphabetNavigator";
import GamesListToolbar from "../components/games/GamesListToolbar";
import LibrariesBar from "../components/layout/LibrariesBar";
import type { ViewMode } from "../types";
import type { FilterField } from "../components/filters/types";
import { compareTitles } from "../utils/stringUtils";
import type { GameItem, SortField, CollectionItem } from "../types";
import { API_BASE, getApiToken } from "../config";
import { buildApiUrl, buildCoverUrl } from "../utils/api";

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
  const { setLoading, isLoading } = useLoading();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [games, setGames] = useState<GameItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const coverSize = (() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  })();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("viewMode_category");
    return (saved as ViewMode) || "grid";
  });
  const [filterField, setFilterField] = useState<FilterField>("genre");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedAgeRating, setSelectedAgeRating] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [allGenres, setAllGenres] = useState<Array<{ id: string; title: string }>>([]);
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: string; title: string }>>([]);
  const [availableCollections, setAvailableCollections] = useState<Array<{ id: string; title: string }>>([]);
  const [collectionGameIds, setCollectionGameIds] = useState<Map<string, string[]>>(new Map());
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  // Column visibility state for table view
  type ColumnVisibility = {
    title: boolean;
    releaseDate: boolean;
    year: boolean;
    stars: boolean;
    criticRating: boolean;
    ageRating: boolean;
  };
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    () => {
      const saved = localStorage.getItem("tableColumnVisibility");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return {
            title: true,
            releaseDate: true,
            year: false,
            stars: false,
            criticRating: false,
            ageRating: false,
          };
        }
      }
      return { title: true, releaseDate: true, criticRating: false, ageRating: false };
    }
  );

  // Save column visibility to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(
      "tableColumnVisibility",
      JSON.stringify(columnVisibility)
    );
  }, [columnVisibility]);

  const handleTableSort = (field: "title" | "year" | "stars" | "releaseDate" | "criticRating" | "userRating" | "ageRating") => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };
  
  // Restore scroll position (use the appropriate ref based on view mode)
  const activeScrollRef = viewMode === "table" ? tableScrollRef : scrollContainerRef;
  useScrollRestoration(activeScrollRef, viewMode);

  useEffect(() => {
    fetchLibraryGames();
    fetchCategories();
    fetchCollections();
  }, []);

  // Listen for game deletion events to update local games list
  useEffect(() => {
    const handleGameDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId: string }>;
      const deletedGameId = customEvent.detail?.gameId;
      if (deletedGameId) {
        setGames((prevGames) =>
          prevGames.filter((game) => String(game.id) !== String(deletedGameId))
        );
      }
    };

    window.addEventListener("gameDeleted", handleGameDeleted as EventListener);
    return () => {
      window.removeEventListener("gameDeleted", handleGameDeleted as EventListener);
    };
  }, []);

  // Listen for game events to update local games list
  useGameEvents({ setGames, enabledEvents: ["gameUpdated", "gameDeleted"] });

  // Hide content until fully rendered
  useLayoutEffect(() => {
    if (!isLoading && games.length > 0) {
      // Wait for next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    } else if (isLoading) {
      setIsReady(false);
    }
  }, [isLoading, games.length]);

  // Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem("viewMode_category", viewMode);
  }, [viewMode]);

  // Handler to change view mode
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Set genre filter when categoryId changes
  useEffect(() => {
    if (categoryId && allGenres.length > 0) {
      // Find the genre by title (categoryId is the title)
      const genre = allGenres.find((g) => g.title === categoryId);
      if (genre) {
        setSelectedGenre(genre.title);
        setFilterField("genre");
      }
    }
  }, [categoryId, allGenres]);

  async function fetchCategories() {
    try {
      const url = buildApiUrl(API_BASE, "/categories");
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Auth-Token": getApiToken(),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.categories || []) as string[];
      const parsed = items.map((title) => ({
        id: title,
        title: title,
      }));
      setAllGenres(parsed);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      console.error("Error fetching categories:", errorMessage);
    }
  }

  async function fetchCollections() {
    try {
      const url = buildApiUrl(API_BASE, "/collections");
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Auth-Token": getApiToken(),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.collections || []) as any[];
      const parsed = items.map((v) => ({
        id: v.id,
        title: v.title,
      }));
      setAvailableCollections(parsed);

      // Fetch game IDs for each collection
      const gameIdsMap = new Map<string, string[]>();
      for (const collection of parsed) {
        try {
          const gamesUrl = buildApiUrl(API_BASE, `/collections/${collection.id}/games`);
          const gamesRes = await fetch(gamesUrl, {
            headers: {
              Accept: "application/json",
              "X-Auth-Token": getApiToken(),
            },
          });
          if (gamesRes.ok) {
            const gamesJson = await gamesRes.json();
            const gameIds = (gamesJson.games || []).map((g: any) => g.id);
            gameIdsMap.set(collection.id, gameIds);
          }
        } catch (err: any) {
          console.error(`Error fetching games for collection ${collection.id}:`, err.message);
        }
      }
      setCollectionGameIds(gameIdsMap);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      console.error("Error fetching collections:", errorMessage);
    }
  }

  async function fetchLibraryGames() {
    setLoading(true);
    try {
      const url = buildApiUrl(API_BASE, `/libraries/library/games`, {
        sort: "title",
      });
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Auth-Token": getApiToken(),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.games || []) as any[];
      const parsed = items.map((v) => ({
        id: String(v.id),
        title: v.title,
        summary: v.summary,
        cover: v.cover,
        day: v.day,
        month: v.month,
        year: v.year,
        stars: v.stars,
        genre: v.genre,
        criticratings: v.criticratings,
        userratings: v.userratings,
        command: v.command || null,
        themes: v.themes || null,
        platforms: v.platforms || null,
        gameModes: v.gameModes || null,
        playerPerspectives: v.playerPerspectives || null,
        websites: v.websites || null,
        ageRatings: v.ageRatings || null,
        developers: v.developers || null,
        publishers: v.publishers || null,
        franchise: v.franchise || null,
        collection: v.collection || null,
        screenshots: v.screenshots || null,
        videos: v.videos || null,
        gameEngines: v.gameEngines || null,
        keywords: v.keywords || null,
        alternativeNames: v.alternativeNames || null,
        similarGames: v.similarGames || null,
      }));
      setGames(parsed);
      onGamesLoaded(parsed);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      console.error("Error fetching library games:", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // Update available genres based on games in the library
  useEffect(() => {
    if (games.length === 0 || allGenres.length === 0) return;

    // Extract unique genre IDs and titles from games
    const genresInGames = new Set<string>();
    games.forEach((game) => {
      if (game.genre) {
        if (Array.isArray(game.genre)) {
          game.genre.forEach((g) => {
            if (typeof g === "string") {
              genresInGames.add(g);
            } else {
              genresInGames.add(String(g));
            }
          });
        } else if (typeof game.genre === "string") {
          genresInGames.add(game.genre);
        }
      }
    });

    // Filter all genres to only those present in games
    const filteredGenres = allGenres.filter((genre) => {
      // Check if the genre title matches any genre in games (exact match)
      return genresInGames.has(genre.title);
    });

    setAvailableGenres(filteredGenres);

    // Validate selected genre - if it's no longer available, reset it
    if (selectedGenre !== null && filterField === "genre") {
      const genreExists = filteredGenres.some((g) => g.title === selectedGenre);
      if (!genreExists) {
        setSelectedGenre(null);
        setFilterField("all");
      }
    }
  }, [games, allGenres, selectedGenre, filterField]);

  // Filter and sort games
  const filteredAndSortedGames = useMemo(() => {
    let filtered = [...games];

    // Apply filter
    if (filterField !== "all") {
      filtered = filtered.filter((game) => {
        switch (filterField) {
          case "genre":
            if (selectedGenre !== null) {
              // Filter games that have the selected genre (exact match)
              if (Array.isArray(game.genre)) {
                return game.genre.some((g) => {
                  const genreStr = typeof g === "string" ? g : String(g);
                  return genreStr === selectedGenre;
                });
              } else if (typeof game.genre === "string") {
                return game.genre === selectedGenre;
              }
              return false;
            }
            return true;
          case "year":
            if (selectedYear !== null) {
              return game.year === selectedYear;
            }
            return game.year !== null && game.year !== undefined;
          case "decade":
            if (selectedDecade !== null && game.year !== null && game.year !== undefined) {
              const decade = Math.floor(game.year / 10) * 10;
              return decade === selectedDecade;
            }
            return false;
          case "collection":
            if (selectedCollection !== null) {
              const gameIds = collectionGameIds.get(selectedCollection);
              return gameIds ? gameIds.includes(game.id) : false;
            }
            return false;
          case "ageRating":
            if (selectedAgeRating !== null) {
              // selectedAgeRating is "category-rating"
              const [category, rating] = selectedAgeRating.split('-').map(Number);
              if (game.ageRatings && game.ageRatings.length > 0) {
                return game.ageRatings.some((ar) => 
                  ar.category === category && ar.rating === rating
                );
              }
              return false;
            }
            return false;
          default:
            return true;
        }
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      let compareResult = 0;
      switch (sortField) {
        case "title":
          compareResult = compareTitles(a.title || "", b.title || "");
          break;
        case "year":
          const yearA = a.year ?? 0;
          const yearB = b.year ?? 0;
          compareResult = yearB - yearA;
          break;
        case "stars":
          const starsA = a.stars ?? 0;
          const starsB = b.stars ?? 0;
          compareResult = starsB - starsA;
          break;
        case "releaseDate":
          const dateA = a.year ?? 0;
          const dateB = b.year ?? 0;
          if (dateA !== dateB) {
            compareResult = dateB - dateA;
          } else {
            const monthA = a.month ?? 0;
            const monthB = b.month ?? 0;
            if (monthA !== monthB) {
              compareResult = monthB - monthA;
            } else {
              const dayA = a.day ?? 0;
              const dayB = b.day ?? 0;
              compareResult = dayB - dayA;
            }
          }
          break;
        case "criticRating":
          const criticA = a.criticratings ?? 0;
          const criticB = b.criticratings ?? 0;
          compareResult = criticB - criticA;
          break;
        case "userRating":
          const userA = a.userratings ?? 0;
          const userB = b.userratings ?? 0;
          compareResult = userB - userA;
          break;
        case "ageRating":
          // Sort by the highest age rating (category first, then rating)
          const ageRatingsA = a.ageRatings && a.ageRatings.length > 0 ? a.ageRatings : [];
          const ageRatingsB = b.ageRatings && b.ageRatings.length > 0 ? b.ageRatings : [];
          if (ageRatingsA.length === 0 && ageRatingsB.length === 0) {
            compareResult = 0;
          } else if (ageRatingsA.length === 0) {
            compareResult = 1; // Games without age ratings go last
          } else if (ageRatingsB.length === 0) {
            compareResult = -1; // Games without age ratings go last
          } else {
            // Get the highest rating for each game (highest category, then highest rating)
            const maxA = ageRatingsA.reduce((max, ar) => {
              const value = ar.category * 1000 + ar.rating;
              return value > max ? value : max;
            }, 0);
            const maxB = ageRatingsB.reduce((max, ar) => {
              const value = ar.category * 1000 + ar.rating;
              return value > max ? value : max;
            }, 0);
            compareResult = maxB - maxA;
          }
          break;
        default:
          return 0;
      }
      if (sortField === "title") {
        return sortAscending ? compareResult : -compareResult;
      } else {
        return sortAscending ? -compareResult : compareResult;
      }
    });

    return filtered;
  }, [games, filterField, selectedYear, selectedDecade, selectedGenre, selectedCollection, selectedAgeRating, sortField, sortAscending, availableGenres, collectionGameIds]);

  const handleGameUpdate = (updatedGame: GameItem) => {
    setGames((prevGames) =>
      prevGames.map((game) =>
        String(game.id) === String(updatedGame.id) ? updatedGame : game
      )
    );
    // Dispatch event to notify useGameEvents (though it should already be listening)
    // This ensures consistency if the event wasn't dispatched from EditGameModal
    window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
  };

  const handleGameDelete = (deletedGame: GameItem) => {
    setGames((prevGames) =>
      prevGames.filter((game) => game.id !== deletedGame.id)
    );
  };

  return (
    <>
      <LibrariesBar
        libraries={[]}
        activeLibrary={null}
        onSelectLibrary={() => {}}
        loading={false}
        error={null}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      <div className="bg-[#1a1a1a] home-page-main-container">
        <main className="flex-1 home-page-content">
          <div className="home-page-layout">
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
          }`}
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
                  buildCoverUrl={(apiBase: string, cover?: string, addTimestamp?: boolean) => buildCoverUrl(apiBase, cover, addTimestamp ?? true)}
                  coverSize={coverSize}
                  itemRefs={itemRefs}
                  viewMode={viewMode}
                  allCollections={allCollections}
                />
              )}
              {viewMode === "detail" && (
                <GamesListDetail
                  games={filteredAndSortedGames}
                  onGameClick={onGameClick}
                  onPlay={onPlay}
                  onGameUpdate={handleGameUpdate}
                  onGameDelete={handleGameDelete}
                  buildCoverUrl={(apiBase: string, cover?: string, addTimestamp?: boolean) => buildCoverUrl(apiBase, cover, addTimestamp ?? true)}
                  itemRefs={itemRefs}
                  allCollections={allCollections}
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

            {/* Alphabet navigator container */}
            {sortField === "title" && isReady && (
              <AlphabetNavigator
                games={filteredAndSortedGames}
                scrollContainerRef={
                  viewMode === "table" ? tableScrollRef : scrollContainerRef
                }
                itemRefs={itemRefs}
                ascending={sortAscending}
              />
            )}
          </div>
        </main>
      </div>
    </>
  );
}

