import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import FilterSubmenu from "./FilterSubmenu";
import type { FilterField, FilterType, GameItem } from "./types";
import "./FilterPopup.css";

type FilterPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  currentFilter: FilterField;
  selectedYear: number | null;
  selectedGenre: string | null;
  selectedThemes: string | null;
  selectedKeywords: string | null;
  selectedPlatforms: string | null;
  selectedGameModes: string | null;
  selectedPublishers: string | null;
  selectedDevelopers: string | null;
  selectedPlayerPerspectives: string | null;
  selectedGameEngines: string | null;
  selectedDecade: number | null;
  selectedCollection: string | null;
  selectedAgeRating: string | null;
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
  onAgeRatingFilterChange?: (ageRating: string | null) => void;
  games?: GameItem[];
  availableGenres?: Array<{ id: string; title: string }>;
  availableCollections?: Array<{ id: string; title: string }>;
};

export default function FilterPopup({
  isOpen,
  onClose,
  currentFilter,
  selectedYear,
  selectedGenre,
  selectedThemes,
  selectedKeywords,
  selectedPlatforms,
  selectedGameModes,
  selectedPublishers,
  selectedDevelopers,
  selectedPlayerPerspectives,
  selectedGameEngines,
  selectedDecade,
  selectedCollection,
  selectedAgeRating,
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
  onAgeRatingFilterChange,
  games = [],
  availableGenres = [],
  availableCollections = [],
}: FilterPopupProps) {
  const { t } = useTranslation();
  const [openSubmenu, setOpenSubmenu] = useState<FilterType | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const lastOpenSubmenuRef = useRef<FilterType | null>(null);
  const wentBackRef = useRef(false); // Track if user went back to main menu
  const isFirstOpenRef = useRef(true); // Track if this is the first time opening after page load

  // When popup opens, always show main menu on first open (after page refresh)
  // After that, preserve submenu state during the session
  useEffect(() => {
    if (isOpen) {
      if (isFirstOpenRef.current) {
        // First time opening after page load - always show main menu
        setOpenSubmenu(null);
        isFirstOpenRef.current = false;
        if (currentFilter === "year") {
          lastOpenSubmenuRef.current = "year";
        } else if (currentFilter === "genre") {
          lastOpenSubmenuRef.current = "genre";
        } else if (currentFilter === "themes") {
          lastOpenSubmenuRef.current = "themes";
        } else if (currentFilter === "keywords") {
          lastOpenSubmenuRef.current = "keywords";
        } else if (currentFilter === "platforms") {
          lastOpenSubmenuRef.current = "platforms";
        } else if (currentFilter === "gameModes") {
          lastOpenSubmenuRef.current = "gameModes";
        } else if (currentFilter === "publishers") {
          lastOpenSubmenuRef.current = "publishers";
        } else if (currentFilter === "developers") {
          lastOpenSubmenuRef.current = "developers";
        } else if (currentFilter === "playerPerspectives") {
          lastOpenSubmenuRef.current = "playerPerspectives";
        } else if (currentFilter === "gameEngines") {
          lastOpenSubmenuRef.current = "gameEngines";
        } else if (currentFilter === "decade") {
          lastOpenSubmenuRef.current = "decade";
        } else if (currentFilter === "collection") {
          lastOpenSubmenuRef.current = "collection";
        } else if (currentFilter === "ageRating") {
          lastOpenSubmenuRef.current = "ageRating";
        } else {
          lastOpenSubmenuRef.current = null;
        }
        wentBackRef.current = false;
      } else {
        // Subsequent opens during the same session
        // If user went back to main menu, always show main menu
        if (wentBackRef.current) {
          setOpenSubmenu(null);
          // Keep track of filter but don't show submenu
          if (currentFilter === "year") {
            lastOpenSubmenuRef.current = "year";
          } else if (currentFilter === "genre") {
            lastOpenSubmenuRef.current = "genre";
          } else if (currentFilter === "themes") {
            lastOpenSubmenuRef.current = "themes";
          } else if (currentFilter === "keywords") {
            lastOpenSubmenuRef.current = "keywords";
          } else if (currentFilter === "platforms") {
            lastOpenSubmenuRef.current = "platforms";
          } else if (currentFilter === "gameModes") {
            lastOpenSubmenuRef.current = "gameModes";
          } else if (currentFilter === "publishers") {
            lastOpenSubmenuRef.current = "publishers";
          } else if (currentFilter === "developers") {
            lastOpenSubmenuRef.current = "developers";
          } else if (currentFilter === "playerPerspectives") {
            lastOpenSubmenuRef.current = "playerPerspectives";
          } else if (currentFilter === "gameEngines") {
            lastOpenSubmenuRef.current = "gameEngines";
          } else if (currentFilter === "decade") {
            lastOpenSubmenuRef.current = "decade";
          } else if (currentFilter === "collection") {
            lastOpenSubmenuRef.current = "collection";
          } else if (currentFilter === "ageRating") {
            lastOpenSubmenuRef.current = "ageRating";
          }
        } else if (currentFilter === "year") {
          setOpenSubmenu("year");
          lastOpenSubmenuRef.current = "year";
        } else if (currentFilter === "genre") {
          setOpenSubmenu("genre");
          lastOpenSubmenuRef.current = "genre";
        } else if (currentFilter === "themes") {
          setOpenSubmenu("themes");
          lastOpenSubmenuRef.current = "themes";
        } else if (currentFilter === "keywords") {
          setOpenSubmenu("keywords");
          lastOpenSubmenuRef.current = "keywords";
        } else if (currentFilter === "platforms") {
          setOpenSubmenu("platforms");
          lastOpenSubmenuRef.current = "platforms";
        } else if (currentFilter === "gameModes") {
          setOpenSubmenu("gameModes");
          lastOpenSubmenuRef.current = "gameModes";
        } else if (currentFilter === "publishers") {
          setOpenSubmenu("publishers");
          lastOpenSubmenuRef.current = "publishers";
        } else if (currentFilter === "developers") {
          setOpenSubmenu("developers");
          lastOpenSubmenuRef.current = "developers";
        } else if (currentFilter === "playerPerspectives") {
          setOpenSubmenu("playerPerspectives");
          lastOpenSubmenuRef.current = "playerPerspectives";
        } else if (currentFilter === "gameEngines") {
          setOpenSubmenu("gameEngines");
          lastOpenSubmenuRef.current = "gameEngines";
        } else if (currentFilter === "decade") {
          setOpenSubmenu("decade");
          lastOpenSubmenuRef.current = "decade";
        } else if (currentFilter === "collection") {
          setOpenSubmenu("collection");
          lastOpenSubmenuRef.current = "collection";
        } else if (currentFilter === "ageRating") {
          setOpenSubmenu("ageRating");
          lastOpenSubmenuRef.current = "ageRating";
        } else if (lastOpenSubmenuRef.current) {
          // Restore the last open submenu even if no filter is active
          setOpenSubmenu(lastOpenSubmenuRef.current);
        } else {
          setOpenSubmenu(null);
        }
      }
    }
    // Don't reset openSubmenu when popup closes - it will persist
  }, [isOpen, currentFilter]);


  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen && !openSubmenu) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // Check which popup is currently visible
      let clickedOutside = false;
      
      if (isOpen && filterRef.current) {
        clickedOutside = !filterRef.current.contains(target);
      }
      
      // If clicked outside the main menu, close everything
      if (clickedOutside && !openSubmenu) {
        // Don't reset wentBackRef here - it should persist when closing after going back
        // This way when reopening, we'll still show main menu
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, openSubmenu, onClose]);

  // Close popup on ESC key
  useEffect(() => {
    if (!isOpen && !openSubmenu) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (openSubmenu) {
          setOpenSubmenu(null);
          wentBackRef.current = true; // Mark that user went back to main menu
        } else {
          // Don't reset wentBackRef here - it should persist when closing after going back
          // This way when reopening, we'll still show main menu
          onClose();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, openSubmenu, onClose]);

  const handleFilterSelect = (field: FilterField) => {
    if (field === "year") {
      setOpenSubmenu("year");
      lastOpenSubmenuRef.current = "year";
      wentBackRef.current = false; // Reset went back flag when selecting a filter
    } else if (field === "genre") {
      setOpenSubmenu("genre");
      lastOpenSubmenuRef.current = "genre";
      wentBackRef.current = false; // Reset went back flag when selecting a filter
    } else if (field === "themes") {
      setOpenSubmenu("themes");
      lastOpenSubmenuRef.current = "themes";
      wentBackRef.current = false;
    } else if (field === "keywords") {
      setOpenSubmenu("keywords");
      lastOpenSubmenuRef.current = "keywords";
      wentBackRef.current = false;
    } else if (field === "platforms") {
      setOpenSubmenu("platforms");
      lastOpenSubmenuRef.current = "platforms";
      wentBackRef.current = false;
    } else if (field === "gameModes") {
      setOpenSubmenu("gameModes");
      lastOpenSubmenuRef.current = "gameModes";
      wentBackRef.current = false;
    } else if (field === "publishers") {
      setOpenSubmenu("publishers");
      lastOpenSubmenuRef.current = "publishers";
      wentBackRef.current = false;
    } else if (field === "developers") {
      setOpenSubmenu("developers");
      lastOpenSubmenuRef.current = "developers";
      wentBackRef.current = false;
    } else if (field === "playerPerspectives") {
      setOpenSubmenu("playerPerspectives");
      lastOpenSubmenuRef.current = "playerPerspectives";
      wentBackRef.current = false;
    } else if (field === "gameEngines") {
      setOpenSubmenu("gameEngines");
      lastOpenSubmenuRef.current = "gameEngines";
      wentBackRef.current = false;
    } else if (field === "decade") {
      setOpenSubmenu("decade");
      lastOpenSubmenuRef.current = "decade";
      wentBackRef.current = false; // Reset went back flag when selecting a filter
    } else if (field === "collection") {
      setOpenSubmenu("collection");
      lastOpenSubmenuRef.current = "collection";
      wentBackRef.current = false; // Reset went back flag when selecting a filter
    } else if (field === "ageRating") {
      setOpenSubmenu("ageRating");
      lastOpenSubmenuRef.current = "ageRating";
      wentBackRef.current = false; // Reset went back flag when selecting a filter
    } else {
      onFilterChange?.(field);
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
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    }
  };

  const handleYearSelect = (value: number | string | null) => {
    const year = typeof value === "number" ? value : null;
    if (year === null) {
      onFilterChange?.("all");
      onYearFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("year");
      onYearFilterChange?.(year);
      // Keep the year submenu state, just close the popup
      lastOpenSubmenuRef.current = "year";
      onClose();
    }
  };

  const resetOtherFilters = (exclude: FilterField) => {
    if (exclude !== "year") {
      onYearFilterChange?.(null);
    }
    if (exclude !== "genre") {
      onGenreFilterChange?.(null);
    }
    if (exclude !== "themes") {
      onThemesFilterChange?.(null);
    }
    if (exclude !== "keywords") {
      onKeywordsFilterChange?.(null);
    }
    if (exclude !== "platforms") {
      onPlatformsFilterChange?.(null);
    }
    if (exclude !== "gameModes") {
      onGameModesFilterChange?.(null);
    }
    if (exclude !== "publishers") {
      onPublishersFilterChange?.(null);
    }
    if (exclude !== "developers") {
      onDevelopersFilterChange?.(null);
    }
    if (exclude !== "playerPerspectives") {
      onPlayerPerspectivesFilterChange?.(null);
    }
    if (exclude !== "gameEngines") {
      onGameEnginesFilterChange?.(null);
    }
    if (exclude !== "decade") {
      onDecadeFilterChange?.(null);
    }
    if (exclude !== "collection") {
      onCollectionFilterChange?.(null);
    }
    if (exclude !== "ageRating") {
      onAgeRatingFilterChange?.(null);
    }
  };

  const handleGenreSelect = (value: number | string | null) => {
    const genreId = typeof value === "string" ? value : null;
    if (genreId === null) {
      onFilterChange?.("all");
      onGenreFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("genre");
      onGenreFilterChange?.(genreId);
      resetOtherFilters("genre");
      // Keep the genre submenu state, just close the popup
      lastOpenSubmenuRef.current = "genre";
      onClose();
    }
  };

  const handleThemesSelect = (value: number | string | null) => {
    const themeId = typeof value === "string" ? value : null;
    if (themeId === null) {
      onFilterChange?.("all");
      onThemesFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("themes");
      onThemesFilterChange?.(themeId);
      resetOtherFilters("themes");
      lastOpenSubmenuRef.current = "themes";
      onClose();
    }
  };

  const handleKeywordsSelect = (value: number | string | null) => {
    const keyword = typeof value === "string" ? value : null;
    if (keyword === null) {
      onFilterChange?.("all");
      onKeywordsFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("keywords");
      onKeywordsFilterChange?.(keyword);
      resetOtherFilters("keywords");
      lastOpenSubmenuRef.current = "keywords";
      onClose();
    }
  };

  const handlePlatformsSelect = (value: number | string | null) => {
    const platform = typeof value === "string" ? value : null;
    if (platform === null) {
      onFilterChange?.("all");
      onPlatformsFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("platforms");
      onPlatformsFilterChange?.(platform);
      resetOtherFilters("platforms");
      lastOpenSubmenuRef.current = "platforms";
      onClose();
    }
  };

  const handleGameModesSelect = (value: number | string | null) => {
    const mode = typeof value === "string" ? value : null;
    if (mode === null) {
      onFilterChange?.("all");
      onGameModesFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("gameModes");
      onGameModesFilterChange?.(mode);
      resetOtherFilters("gameModes");
      lastOpenSubmenuRef.current = "gameModes";
      onClose();
    }
  };

  const handlePublishersSelect = (value: number | string | null) => {
    const publisher = typeof value === "string" ? value : null;
    if (publisher === null) {
      onFilterChange?.("all");
      onPublishersFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("publishers");
      onPublishersFilterChange?.(publisher);
      resetOtherFilters("publishers");
      lastOpenSubmenuRef.current = "publishers";
      onClose();
    }
  };

  const handleDevelopersSelect = (value: number | string | null) => {
    const developer = typeof value === "string" ? value : null;
    if (developer === null) {
      onFilterChange?.("all");
      onDevelopersFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("developers");
      onDevelopersFilterChange?.(developer);
      resetOtherFilters("developers");
      lastOpenSubmenuRef.current = "developers";
      onClose();
    }
  };

  const handlePlayerPerspectivesSelect = (value: number | string | null) => {
    const perspective = typeof value === "string" ? value : null;
    if (perspective === null) {
      onFilterChange?.("all");
      onPlayerPerspectivesFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("playerPerspectives");
      onPlayerPerspectivesFilterChange?.(perspective);
      resetOtherFilters("playerPerspectives");
      lastOpenSubmenuRef.current = "playerPerspectives";
      onClose();
    }
  };

  const handleGameEnginesSelect = (value: number | string | null) => {
    const engine = typeof value === "string" ? value : null;
    if (engine === null) {
      onFilterChange?.("all");
      onGameEnginesFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("gameEngines");
      onGameEnginesFilterChange?.(engine);
      resetOtherFilters("gameEngines");
      lastOpenSubmenuRef.current = "gameEngines";
      onClose();
    }
  };

  const handleDecadeSelect = (value: number | string | null) => {
    const decade = typeof value === "number" ? value : null;
    if (decade === null) {
      onFilterChange?.("all");
      onDecadeFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("decade");
      onDecadeFilterChange?.(decade);
      resetOtherFilters("decade");
      // Keep the decade submenu state, just close the popup
      lastOpenSubmenuRef.current = "decade";
      onClose();
    }
  };

  const handleCollectionSelect = (value: number | string | null) => {
    if (value === null) {
      onFilterChange?.("all");
      onCollectionFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      // Convert to string if it's a number
      const collectionId = typeof value === "string" ? value : String(value);
      onFilterChange?.("collection");
      onCollectionFilterChange?.(collectionId);
      resetOtherFilters("collection");
      // Keep the collection submenu state, just close the popup
      lastOpenSubmenuRef.current = "collection";
      onClose();
    }
  };

  const handleAgeRatingSelect = (value: number | string | null) => {
    const ageRating = typeof value === "string" ? value : null;
    if (ageRating === null) {
      onFilterChange?.("all");
      onAgeRatingFilterChange?.(null);
      setOpenSubmenu(null);
      lastOpenSubmenuRef.current = null;
      onClose();
    } else {
      onFilterChange?.("ageRating");
      onAgeRatingFilterChange?.(ageRating);
      resetOtherFilters("ageRating");
      // Keep the ageRating submenu state, just close the popup
      lastOpenSubmenuRef.current = "ageRating";
      onClose();
    }
  };

  const handleSubmenuClose = () => {
    setOpenSubmenu(null);
    lastOpenSubmenuRef.current = null; // Reset state when going back to main menu
    wentBackRef.current = true; // Mark that user went back to main menu
    // Don't close the main popup, just go back to main menu
  };

  const handleSubmenuCloseCompletely = () => {
    setOpenSubmenu(null);
    // Don't reset wentBackRef here - it should persist when closing after going back
    // This way when reopening, we'll still show main menu
    onClose();
    // Close the popup completely
  };

  // Show submenu if open and popup is open
  if (isOpen && openSubmenu === "year") {
    return (
      <FilterSubmenu
        type="year"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedYear}
        onSelect={handleYearSelect}
        games={games}
      />
    );
  }

  if (isOpen && openSubmenu === "genre") {
    return (
      <FilterSubmenu
        type="genre"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedGenre}
        onSelect={handleGenreSelect}
        games={games}
        availableGenres={availableGenres}
      />
    );
  }

  if (isOpen && openSubmenu === "themes") {
    return (
      <FilterSubmenu
        type="themes"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedThemes}
        onSelect={handleThemesSelect}
        games={games}
      />
    );
  }

  if (isOpen && openSubmenu === "keywords") {
    return (
      <FilterSubmenu
        type="keywords"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedKeywords}
        onSelect={handleKeywordsSelect}
        games={games}
      />
    );
  }

  if (isOpen && openSubmenu === "platforms") {
    return (
      <FilterSubmenu
        type="platforms"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedPlatforms}
        onSelect={handlePlatformsSelect}
        games={games}
      />
    );
  }

  if (isOpen && openSubmenu === "gameModes") {
    return (
      <FilterSubmenu
        type="gameModes"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedGameModes}
        onSelect={handleGameModesSelect}
        games={games}
      />
    );
  }

  if (isOpen && openSubmenu === "publishers") {
    return (
      <FilterSubmenu
        type="publishers"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedPublishers}
        onSelect={handlePublishersSelect}
        games={games}
      />
    );
  }

  if (isOpen && openSubmenu === "developers") {
    return (
      <FilterSubmenu
        type="developers"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedDevelopers}
        onSelect={handleDevelopersSelect}
        games={games}
      />
    );
  }

  if (isOpen && openSubmenu === "playerPerspectives") {
    return (
      <FilterSubmenu
        type="playerPerspectives"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedPlayerPerspectives}
        onSelect={handlePlayerPerspectivesSelect}
        games={games}
      />
    );
  }

  if (isOpen && openSubmenu === "gameEngines") {
    return (
      <FilterSubmenu
        type="gameEngines"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedGameEngines}
        onSelect={handleGameEnginesSelect}
        games={games}
      />
    );
  }

  if (isOpen && openSubmenu === "decade") {
    return (
      <FilterSubmenu
        type="decade"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedDecade}
        onSelect={handleDecadeSelect}
        games={games}
      />
    );
  }

  if (isOpen && openSubmenu === "collection") {
    return (
      <FilterSubmenu
        type="collection"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedCollection}
        onSelect={handleCollectionSelect}
        games={games}
        availableCollections={availableCollections}
      />
    );
  }

  if (isOpen && openSubmenu === "ageRating") {
    return (
      <FilterSubmenu
        type="ageRating"
        isOpen={true}
        onClose={handleSubmenuClose}
        onCloseCompletely={handleSubmenuCloseCompletely}
        selectedValue={selectedAgeRating}
        onSelect={handleAgeRatingSelect}
        games={games}
      />
    );
  }

  // Only show main menu if popup is open and no submenu is active
  if (!isOpen || openSubmenu) return null;

  // Show main filter menu
  return (
    <div className="filter-popup" ref={filterRef}>
      <button
        className={`filter-popup-item ${
          currentFilter === "all" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("all")}
      >
        <span>{t("gamesListToolbar.filter.all")}</span>
        {currentFilter === "all" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <div className="filter-popup-divider"></div>
      <button
        className={`filter-popup-item ${
          currentFilter === "genre" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("genre")}
      >
        <span>{t("gamesListToolbar.filter.genre")}</span>
        {currentFilter === "genre" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "themes" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("themes")}
      >
        <span>{t("gamesListToolbar.filter.themes")}</span>
        {currentFilter === "themes" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "keywords" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("keywords")}
      >
        <span>{t("gamesListToolbar.filter.keywords")}</span>
        {currentFilter === "keywords" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "platforms" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("platforms")}
      >
        <span>{t("gamesListToolbar.filter.platforms")}</span>
        {currentFilter === "platforms" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "gameModes" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("gameModes")}
      >
        <span>{t("gamesListToolbar.filter.gameModes")}</span>
        {currentFilter === "gameModes" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "publishers" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("publishers")}
      >
        <span>{t("gamesListToolbar.filter.publishers")}</span>
        {currentFilter === "publishers" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "developers" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("developers")}
      >
        <span>{t("gamesListToolbar.filter.developers")}</span>
        {currentFilter === "developers" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "playerPerspectives" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("playerPerspectives")}
      >
        <span>{t("gamesListToolbar.filter.playerPerspectives")}</span>
        {currentFilter === "playerPerspectives" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "gameEngines" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("gameEngines")}
      >
        <span>{t("gamesListToolbar.filter.gameEngines")}</span>
        {currentFilter === "gameEngines" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "year" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("year")}
      >
        <span>{t("gamesListToolbar.filter.year")}</span>
        {currentFilter === "year" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "decade" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("decade")}
      >
        <span>{t("gamesListToolbar.filter.decade")}</span>
        {currentFilter === "decade" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "ageRating" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("ageRating")}
      >
        <span>{t("gamesListToolbar.filter.ageRating")}</span>
        {currentFilter === "ageRating" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
      <button
        className={`filter-popup-item ${
          currentFilter === "collection" ? "selected" : ""
        }`}
        onClick={() => handleFilterSelect("collection")}
      >
        <span>{t("gamesListToolbar.filter.collection")}</span>
        {currentFilter === "collection" && (
          <svg
            className="filter-popup-check"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              fill="#E5A00D"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

