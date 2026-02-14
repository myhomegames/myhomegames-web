import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { useScrollRestoration } from "./useScrollRestoration";
import { useGameEvents } from "./useGameEvents";
import { useCategories } from "../contexts/CategoriesContext";
import { useCollections } from "../contexts/CollectionsContext";
import { useDevelopers } from "../contexts/DevelopersContext";
import { usePublishers } from "../contexts/PublishersContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import type { ViewMode, GameItem, SortField } from "../types";
import type { FilterField } from "../components/filters/types";
import { compareTitles } from "../utils/stringUtils";
import { API_BASE, getApiToken } from "../config";
import { buildApiUrl, buildApiHeaders } from "../utils/api";

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
  selectedThemes: string | null;
  setSelectedThemes: React.Dispatch<React.SetStateAction<string | null>>;
  selectedKeywords: string | null;
  setSelectedKeywords: React.Dispatch<React.SetStateAction<string | null>>;
  selectedPlatforms: string | null;
  setSelectedPlatforms: React.Dispatch<React.SetStateAction<string | null>>;
  selectedGameModes: string | null;
  setSelectedGameModes: React.Dispatch<React.SetStateAction<string | null>>;
  selectedPublishers: string | null;
  setSelectedPublishers: React.Dispatch<React.SetStateAction<string | null>>;
  selectedDevelopers: string | null;
  setSelectedDevelopers: React.Dispatch<React.SetStateAction<string | null>>;
  selectedPlayerPerspectives: string | null;
  setSelectedPlayerPerspectives: React.Dispatch<React.SetStateAction<string | null>>;
  selectedGameEngines: string | null;
  setSelectedGameEngines: React.Dispatch<React.SetStateAction<string | null>>;
  selectedSeries: string | null;
  setSelectedSeries: React.Dispatch<React.SetStateAction<string | null>>;
  selectedFranchise: string | null;
  setSelectedFranchise: React.Dispatch<React.SetStateAction<string | null>>;
  allGenres: Array<{ id: string; title: string }>;
  availableGenres: Array<{ id: string; title: string }>;
  availableCollections: Array<{ id: string; title: string }>;
  availableSeries: Array<{ id: string; title: string }>;
  availableFranchises: Array<{ id: string; title: string }>;
  availableDevelopers: Array<{ id: string; title: string }>;
  availablePublishers: Array<{ id: string; title: string }>;
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
  
  // Fetch functions (collections and library games are now loaded via context)
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
  const [selectedThemes, setSelectedThemes] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedThemes`);
      return saved || null;
    }
    return null;
  });
  const [selectedKeywords, setSelectedKeywords] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedKeywords`);
      return saved || null;
    }
    return null;
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedPlatforms`);
      return saved || null;
    }
    return null;
  });
  const [selectedGameModes, setSelectedGameModes] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedGameModes`);
      return saved || null;
    }
    return null;
  });
  const [selectedPublishers, setSelectedPublishers] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedPublishers`);
      return saved || null;
    }
    return null;
  });
  const [selectedDevelopers, setSelectedDevelopers] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedDevelopers`);
      return saved || null;
    }
    return null;
  });
  const [selectedPlayerPerspectives, setSelectedPlayerPerspectives] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedPlayerPerspectives`);
      return saved || null;
    }
    return null;
  });
  const [selectedGameEngines, setSelectedGameEngines] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedGameEngines`);
      return saved || null;
    }
    return null;
  });
  const [selectedSeries, setSelectedSeries] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedSeries`);
      return saved || null;
    }
    return null;
  });
  const [selectedFranchise, setSelectedFranchise] = useState<string | null>(() => {
    if (localStoragePrefix) {
      const saved = localStorage.getItem(`${localStoragePrefix}SelectedFranchise`);
      return saved || null;
    }
    return null;
  });
  const { categories } = useCategories();
  // Convert categories to allGenres format (id as string)
  const allGenres = useMemo(() => 
    categories.map((cat) => ({ id: String(cat.id), title: cat.title })),
    [categories]
  );
  const { collections, collectionGameIds: contextCollectionGameIds } = useCollections();
  const { developers } = useDevelopers();
  const { publishers } = usePublishers();
  const { games: libraryGames, isLoading: libraryGamesLoading } = useLibraryGames();
  
  // Convert collections to availableCollections format
  const availableCollections = useMemo(() => 
    collections.map((col) => ({ id: String(col.id), title: col.title || "" })),
    [collections]
  );

  const [availableSeries, setAvailableSeries] = useState<Array<{ id: string; title: string }>>([]);
  const [availableFranchises, setAvailableFranchises] = useState<Array<{ id: string; title: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    const token = getApiToken();
    if (!token) return;
    const toItems = (list: Array<{ id: number | string; title?: string; name?: string }>, _key: string) =>
      (list || []).map((x) => ({ id: String(x.id), title: String((x as any).title ?? (x as any).name ?? x.id) }));
    Promise.all([
      fetch(buildApiUrl(API_BASE, "/series"), { headers: buildApiHeaders({ Accept: "application/json" }) }).then((r) => (r.ok ? r.json() : { series: [] })),
      fetch(buildApiUrl(API_BASE, "/franchises"), { headers: buildApiHeaders({ Accept: "application/json" }) }).then((r) => (r.ok ? r.json() : { franchises: [] })),
    ]).then(([seriesRes, franchisesRes]) => {
      if (cancelled) return;
      setAvailableSeries(toItems(seriesRes.series || [], "series"));
      setAvailableFranchises(toItems(franchisesRes.franchises || [], "franchises"));
    }).catch(() => {
      if (!cancelled) {
        setAvailableSeries([]);
        setAvailableFranchises([]);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const availableDevelopers = useMemo(() =>
    developers.map((d) => ({ id: String(d.id), title: d.title || "" })),
    [developers]
  );
  const availablePublishers = useMemo(() =>
    publishers.map((p) => ({ id: String(p.id), title: p.title || "" })),
    [publishers]
  );
  
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: string; title: string }>>([]);
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

  const hasTag = (values: string[] | null | undefined, selected: string | null) => {
    if (!selected || !values || values.length === 0) {
      return false;
    }
    return values.some((value) => String(value) === selected);
  };

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
    if (localStoragePrefix && selectedThemes !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedThemes`, selectedThemes);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedThemes`);
    }
  }, [selectedThemes, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedKeywords !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedKeywords`, selectedKeywords);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedKeywords`);
    }
  }, [selectedKeywords, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedPlatforms !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedPlatforms`, selectedPlatforms);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedPlatforms`);
    }
  }, [selectedPlatforms, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedGameModes !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedGameModes`, selectedGameModes);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedGameModes`);
    }
  }, [selectedGameModes, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedPublishers !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedPublishers`, selectedPublishers);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedPublishers`);
    }
  }, [selectedPublishers, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedDevelopers !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedDevelopers`, selectedDevelopers);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedDevelopers`);
    }
  }, [selectedDevelopers, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedPlayerPerspectives !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedPlayerPerspectives`, selectedPlayerPerspectives);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedPlayerPerspectives`);
    }
  }, [selectedPlayerPerspectives, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedGameEngines !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedGameEngines`, selectedGameEngines);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedGameEngines`);
    }
  }, [selectedGameEngines, localStoragePrefix]);

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
    if (localStoragePrefix && selectedSeries !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedSeries`, selectedSeries);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedSeries`);
    }
  }, [selectedSeries, localStoragePrefix]);

  useEffect(() => {
    if (localStoragePrefix && selectedFranchise !== null) {
      localStorage.setItem(`${localStoragePrefix}SelectedFranchise`, selectedFranchise);
    } else if (localStoragePrefix) {
      localStorage.removeItem(`${localStoragePrefix}SelectedFranchise`);
    }
  }, [selectedFranchise, localStoragePrefix]);

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
  // Collections and library games are now loaded via context, no need to fetch them here
  useEffect(() => {
    if (waitForAuth) {
      // This will be handled by the component using the hook
      return;
    }
    if (onInit) {
      onInit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for metadata reload event
  // Collections and library games are refreshed automatically by their contexts
  useEffect(() => {
    if (!listenToMetadataReload) return;
    const handleMetadataReloaded = () => {
      // Contexts will handle the refresh automatically
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
          case "themes":
            if (selectedThemes === null) return true;
            return hasTag(game.themes || null, selectedThemes);
          case "keywords":
            if (selectedKeywords === null) return true;
            return hasTag(game.keywords || null, selectedKeywords);
          case "platforms":
            if (selectedPlatforms === null) return true;
            return hasTag(game.platforms || null, selectedPlatforms);
          case "gameModes":
            if (selectedGameModes === null) return true;
            return hasTag(game.gameModes || null, selectedGameModes);
          case "publishers":
            if (selectedPublishers === null) return true;
            return hasTag(
              game.publishers?.map((p) => String(p.id)) ?? null,
              selectedPublishers
            );
          case "developers":
            if (selectedDevelopers === null) return true;
            return hasTag(
              game.developers?.map((d) => String(d.id)) ?? null,
              selectedDevelopers
            );
          case "playerPerspectives":
            if (selectedPlayerPerspectives === null) return true;
            return hasTag(game.playerPerspectives || null, selectedPlayerPerspectives);
          case "gameEngines":
            if (selectedGameEngines === null) return true;
            return hasTag(game.gameEngines || null, selectedGameEngines);
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
              const gameIds = contextCollectionGameIds.get(String(selectedCollection));
              if (!gameIds) {
                return false;
              }
              const gameIdStr = String(game.id);
              return gameIds.some((id) => String(id) === gameIdStr);
            }
            return false;
          case "series": {
            if (selectedSeries === null) return true;
            const raw = game.series ?? game.collection;
            const arr = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
            const ids = arr.map((x) => (typeof x === "object" && x?.id != null ? String(x.id) : String(x)));
            return ids.some((id) => String(id) === selectedSeries);
          }
          case "franchise": {
            if (selectedFranchise === null) return true;
            const raw = game.franchise;
            const arr = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
            const ids = arr.map((x) => (typeof x === "object" && x?.id != null ? String(x.id) : String(x)));
            return ids.some((id) => String(id) === selectedFranchise);
          }
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
            // Sort by first age rating's category, then rating
            const firstA = ageRatingsA[0];
            const firstB = ageRatingsB[0];
            if (firstA.category !== firstB.category) {
              compareResult = firstA.category - firstB.category;
            } else {
              compareResult = firstB.rating - firstA.rating;
            }
          }
          break;
        default:
          compareResult = 0;
      }
      return sortAscending ? compareResult : -compareResult;
    });

    return filtered;
  }, [
    games,
    filterField,
    selectedGenre,
    selectedThemes,
    selectedKeywords,
    selectedPlatforms,
    selectedGameModes,
    selectedPublishers,
    selectedDevelopers,
    selectedPlayerPerspectives,
    selectedGameEngines,
    selectedYear,
    selectedDecade,
    selectedCollection,
    selectedSeries,
    selectedFranchise,
    selectedAgeRating,
    contextCollectionGameIds,
    sortField,
    sortAscending,
  ]);

  // Hide content until fully rendered
  useLayoutEffect(() => {
    // Use libraryGamesLoading for more accurate state - don't wait for global isLoading
    // Don't wait for games.length > 0 - isReady should be true even if there are no games
    if (!libraryGamesLoading) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    } else if (libraryGamesLoading) {
      setIsReady(false);
    }
  }, [libraryGamesLoading, filteredAndSortedGames.length]);

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

  // Fetch functions (collections and library games are now loaded via context)
  // Use libraryGames from context as the base games list
  useEffect(() => {
    if (libraryGames.length > 0) {
      setGames(libraryGames);
    }
  }, [libraryGames]);

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
    selectedSeries,
    setSelectedSeries,
    selectedFranchise,
    setSelectedFranchise,
    allGenres,
    availableGenres,
    availableCollections,
    availableSeries,
    availableFranchises,
    availableDevelopers,
    availablePublishers,
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
  };
}
