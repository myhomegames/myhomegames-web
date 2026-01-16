import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { useScrollRestoration } from "./useScrollRestoration";
import { useGameEvents } from "./useGameEvents";
import { useLoading } from "../contexts/LoadingContext";
import type { ViewMode, GameItem, SortField } from "../types";
import type { FilterField } from "../components/filters/types";
import { compareTitles } from "../utils/stringUtils";
import { API_BASE, getApiToken } from "../config";
import { buildApiUrl } from "../utils/api";

type GameEventType = "gameUpdated" | "gameDeleted" | "gameAdded";

type ColumnVisibility = {
  title: boolean;
  releaseDate: boolean;
  year: boolean;
  stars: boolean;
  criticRating: boolean;
  ageRating: boolean;
};

type UseGamesListPageOptions = {
  // Page-specific options
  localStoragePrefix?: string; // e.g., "library" or "category"
  defaultFilterField?: FilterField; // e.g., "all" or "genre"
  
  // Initialization
  waitForAuth?: boolean; // Whether to wait for auth before fetching
  onInit?: () => void; // Custom initialization logic
  
  // Event listeners
  listenToMetadataReload?: boolean;
  listenToGameDeleted?: boolean;
  gameEvents?: GameEventType[]; // e.g., ["gameUpdated"] or ["gameUpdated", "gameDeleted"]
  
  // Category-specific
  categoryId?: string | null; // For CategoryPage
  onCategoryIdChange?: (categoryId: string | null) => void; // Callback when categoryId changes
  
  // Scroll restoration
  scrollRestorationMode?: ViewMode | undefined; // For table view, pass undefined
};

export type UseGamesListPageReturn = {
  // State
  games: GameItem[];
  setGames: React.Dispatch<React.SetStateAction<GameItem[]>>;
  isReady: boolean;
  filterField: FilterField;
  setFilterField: React.Dispatch<React.SetStateAction<FilterField>>;
  selectedYear: number | null;
  setSelectedYear: React.Dispatch<React.SetStateAction<number | null>>;
  selectedDecade: number | null;
  setSelectedDecade: React.Dispatch<React.SetStateAction<number | null>>;
  selectedCollection: string | null;
  setSelectedCollection: React.Dispatch<React.SetStateAction<string | null>>;
  selectedAgeRating: string | null;
  setSelectedAgeRating: React.Dispatch<React.SetStateAction<string | null>>;
  selectedGenre: string | null;
  setSelectedGenre: React.Dispatch<React.SetStateAction<string | null>>;
  allGenres: Array<{ id: string; title: string }>;
  availableGenres: Array<{ id: string; title: string }>;
  availableCollections: Array<{ id: string; title: string }>;
  sortField: SortField;
  setSortField: React.Dispatch<React.SetStateAction<SortField>>;
  sortAscending: boolean;
  setSortAscending: React.Dispatch<React.SetStateAction<boolean>>;
  columnVisibility: ColumnVisibility;
  setColumnVisibility: React.Dispatch<React.SetStateAction<ColumnVisibility>>;
  filteredAndSortedGames: GameItem[];
  
  // Refs
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  tableScrollRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.RefObject<Map<string, HTMLElement>>;
  
  // Handlers
  handleTableSort: (field: "title" | "year" | "stars" | "releaseDate" | "criticRating" | "userRating" | "ageRating") => void;
  toggleColumn: (column: keyof ColumnVisibility) => void;
  handleGameUpdate: (updatedGame: GameItem) => void;
  handleGameDelete: (deletedGame: GameItem) => void;
  
  // Fetch functions
  fetchLibraryGames: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCollections: () => Promise<void>;
};

export function useGamesListPage(
  options: UseGamesListPageOptions = {}
): UseGamesListPageReturn {
  const {
    localStoragePrefix = "",
    defaultFilterField = "all",
    waitForAuth = false,
    onInit,
    listenToMetadataReload = false,
    listenToGameDeleted = false,
    gameEvents = ["gameUpdated"],
    categoryId = null,
    onCategoryIdChange,
    scrollRestorationMode,
  } = options;

  const { setLoading, isLoading } = useLoading();
  const [games, setGames] = useState<GameItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [filterField, setFilterField] = useState<FilterField>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}FilterField`);
      return (saved as FilterField) || defaultFilterField;
    }
    return defaultFilterField;
  });
  const [selectedYear, setSelectedYear] = useState<number | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedYear`);
      return saved ? parseInt(saved, 10) : null;
    }
    return null;
  });
  const [selectedDecade, setSelectedDecade] = useState<number | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedDecade`);
      return saved ? parseInt(saved, 10) : null;
    }
    return null;
  });
  const [selectedAgeRating, setSelectedAgeRating] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedAgeRating`);
      return saved !== null ? saved : null;
    }
    return null;
  });
  const [selectedCollection, setSelectedCollection] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedCollection`);
      return saved || null;
    }
    return null;
  });
  const [selectedGenre, setSelectedGenre] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedGenre`);
      return saved || null;
    }
    return null;
  });
  const [allGenres, setAllGenres] = useState<Array<{ id: string; title: string }>>([]);
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: string; title: string }>>([]);
  const [availableCollections, setAvailableCollections] = useState<Array<{ id: string; title: string }>>([]);
  const [collectionGameIds, setCollectionGameIds] = useState<Map<string, string[]>>(new Map());
  const [sortField, setSortField] = useState<SortField>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SortField`);
      return (saved as SortField) || "title";
    }
    return "title";
  });
  const [sortAscending, setSortAscending] = useState<boolean>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SortAscending`);
      return saved ? saved === "true" : true;
    }
    return true;
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
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
  });

  // Save column visibility to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("tableColumnVisibility", JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  // Save filter and sort state to localStorage (if localStoragePrefix is set)
  useEffect(() => {
    if (localStoragePrefix) {
      localStorage.setItem(`${localStoragePrefix}FilterField`, filterField);
    }
  }, [filterField, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedYear !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedYear`, selectedYear.toString());
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedYear`);
    }
  }, [selectedYear, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedGenre !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedGenre`, selectedGenre);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedGenre`);
    }
  }, [selectedGenre, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedDecade !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedDecade`, selectedDecade.toString());
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedDecade`);
    }
  }, [selectedDecade, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedCollection !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedCollection`, selectedCollection);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedCollection`);
    }
  }, [selectedCollection, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedAgeRating !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedAgeRating`, selectedAgeRating);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedAgeRating`);
    }
  }, [selectedAgeRating, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix) {
      localStorage.setItem(`${localStoragePrefix}SortField`, sortField);
    }
  }, [sortField, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix) {
      localStorage.setItem(`${localStoragePrefix}SortAscending`, sortAscending.toString());
    }
  }, [sortAscending, localStoragePrefix]);

  // Scroll restoration
  const activeScrollRef = scrollRestorationMode === undefined ? scrollContainerRef : (scrollRestorationMode === "table" ? tableScrollRef : scrollContainerRef);
  useScrollRestoration(activeScrollRef, scrollRestorationMode);

  // Initialize data fetching
  useEffect(() => {
    if (waitForAuth) {
      // This will be handled by the component using the hook
      return;
    }
    if (onInit) {
      onInit();
    } else {
      fetchLibraryGames();
      fetchCategories();
      fetchCollections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for metadata reload event
  useEffect(() => {
    if (!listenToMetadataReload) return;
    const handleMetadataReloaded = () => {
      fetchLibraryGames();
      fetchCategories();
      fetchCollections();
    };
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    return () => {
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
    };
  }, [listenToMetadataReload]);

  // Listen for game deletion events
  useEffect(() => {
    if (!listenToGameDeleted) return;
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
  }, [listenToGameDeleted]);

  // Listen for game events
  useGameEvents({ setGames, enabledEvents: gameEvents });

  // Hide content until fully rendered
  useLayoutEffect(() => {
    if (!isLoading && games.length > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    } else if (isLoading) {
      setIsReady(false);
    }
  }, [isLoading, games.length]);

  // Set genre filter when categoryId changes (for CategoryPage)
  useEffect(() => {
    if (categoryId && allGenres.length > 0) {
      const genre = allGenres.find((g) => String(g.id) === categoryId);
      if (genre) {
        setSelectedGenre(genre.title);
        setFilterField("genre");
      }
      if (onCategoryIdChange) {
        onCategoryIdChange(categoryId);
      }
    }
  }, [categoryId, allGenres, onCategoryIdChange]);

  // Fetch functions
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
      const items = (json.categories || []) as any[];
      const parsed = items.map((item) => ({
        id: String(item.id),
        title: item.title,
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
        id: String(v.id),
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
            const gameIds = (gamesJson.games || []).map((g: any) => String(g.id));
            gameIdsMap.set(String(collection.id), gameIds);
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

    const filteredGenres = allGenres.filter((genre) => {
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
              const gameIds = collectionGameIds.get(String(selectedCollection));
              if (!gameIds) {
                return false;
              }
              const gameIdStr = String(game.id);
              return gameIds.some((id) => String(id) === gameIdStr);
            }
            return false;
          case "ageRating":
            if (selectedAgeRating !== null) {
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
          const ageRatingsA = a.ageRatings && a.ageRatings.length > 0 ? a.ageRatings : [];
          const ageRatingsB = b.ageRatings && b.ageRatings.length > 0 ? b.ageRatings : [];
          if (ageRatingsA.length === 0 && ageRatingsB.length === 0) {
            compareResult = 0;
          } else if (ageRatingsA.length === 0) {
            compareResult = 1;
          } else if (ageRatingsB.length === 0) {
            compareResult = -1;
          } else {
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
  }, [games, filterField, selectedYear, selectedDecade, selectedGenre, selectedCollection, selectedAgeRating, sortField, sortAscending, collectionGameIds]);

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

  const handleGameUpdate = (updatedGame: GameItem) => {
    setGames((prevGames) =>
      prevGames.map((game) =>
        String(game.id) === String(updatedGame.id) ? updatedGame : game
      )
    );
    window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
  };

  const handleGameDelete = (deletedGame: GameItem) => {
    setGames((prevGames) =>
      prevGames.filter((game) => game.id !== deletedGame.id)
    );
  };

  return {
    games,
    setGames,
    isReady,
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
    allGenres,
    availableGenres,
    availableCollections,
    sortField,
    setSortField,
    sortAscending,
    setSortAscending,
    columnVisibility,
    setColumnVisibility,
    filteredAndSortedGames,
    scrollContainerRef,
    tableScrollRef,
    itemRefs,
    handleTableSort,
    toggleColumn,
    handleGameUpdate,
    handleGameDelete,
    fetchLibraryGames,
    fetchCategories,
    fetchCollections,
  };
}
