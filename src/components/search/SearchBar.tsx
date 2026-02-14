import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SearchResultsList from "./SearchResultsList";
import type { GameItem, CollectionItem } from "../../types";
import "./SearchBar.css";
import "./SearchResultsList.css";

type SearchBarProps = {
  games: GameItem[];
  collections: CollectionItem[];
  developers?: CollectionItem[];
  publishers?: CollectionItem[];
  onGameSelect: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
};

const RECENT_SEARCHES_KEY = "recentSearches";
const MAX_RECENT_SEARCHES = 10;

export default function SearchBar({ games, collections, developers = [], publishers = [], onGameSelect, onPlay }: SearchBarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnSearchResultsPage = location.pathname === "/search-results";
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [filteredGames, setFilteredGames] = useState<GameItem[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<CollectionItem[]>([]);
  const [filteredDevelopers, setFilteredDevelopers] = useState<CollectionItem[]>([]);
  const [filteredPublishers, setFilteredPublishers] = useState<CollectionItem[]>([]);
  const [allFilteredGames, setAllFilteredGames] = useState<GameItem[]>([]);
  const [allFilteredCollections, setAllFilteredCollections] = useState<CollectionItem[]>([]);
  const [allFilteredDevelopers, setAllFilteredDevelopers] = useState<CollectionItem[]>([]);
  const [allFilteredPublishers, setAllFilteredPublishers] = useState<CollectionItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const isSelectingGameRef = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const saveRecentSearch = useCallback((query: string) => {
    if (query.trim() !== "") {
      setRecentSearches((prev) => {
        const updated = [query.trim(), ...prev.filter(s => s !== query.trim())].slice(0, MAX_RECENT_SEARCHES);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  // Remove focus from searchbox when arriving at search results page
  useEffect(() => {
    if (isOnSearchResultsPage) {
      setIsFocused(false);
      setIsOpen(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  }, [isOnSearchResultsPage]);

  useEffect(() => {
    // Don't update if we're in the process of closing or selecting a game
    if (isClosing || isSelectingGameRef.current) {
      return;
    }
    
    if (searchQuery.trim() === "") {
      setFilteredGames([]);
      setFilteredCollections([]);
      setFilteredDevelopers([]);
      setFilteredPublishers([]);
      setAllFilteredGames([]);
      setAllFilteredCollections([]);
      setAllFilteredDevelopers([]);
      setAllFilteredPublishers([]);
      // Show recent searches when focused and query is empty
      if (isFocused) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
      return;
    }

    // Require at least 2 characters to perform search
    if (searchQuery.trim().length < 2) {
      setFilteredGames([]);
      setFilteredCollections([]);
      setFilteredDevelopers([]);
      setFilteredPublishers([]);
      setAllFilteredGames([]);
      setAllFilteredCollections([]);
      setAllFilteredDevelopers([]);
      setAllFilteredPublishers([]);
      // Keep dropdown open if focused to show recent searches or message
      if (isFocused && !isClosing) {
        setIsOpen(true);
      }
      return;
    }

    const queryLower = searchQuery.toLowerCase();
    const filtered = games.filter((game) =>
      game.title.toLowerCase().includes(queryLower)
    );
    const filteredCols = collections.filter((collection) =>
      collection.title.toLowerCase().includes(queryLower)
    );
    const filteredDevs = developers.filter((d) =>
      (d.title || "").toLowerCase().includes(queryLower)
    );
    const filteredPubs = publishers.filter((p) =>
      (p.title || "").toLowerCase().includes(queryLower)
    );

    setAllFilteredGames(filtered);
    setAllFilteredCollections(filteredCols);
    setAllFilteredDevelopers(filteredDevs);
    setAllFilteredPublishers(filteredPubs);
    setFilteredGames(filtered.slice(0, 10));
    setFilteredCollections(filteredCols.slice(0, 10));
    setFilteredDevelopers(filteredDevs.slice(0, 10));
    setFilteredPublishers(filteredPubs.slice(0, 10));

    if (isOnSearchResultsPage) {
      saveRecentSearch(searchQuery);
      navigate("/search-results", {
        state: {
          searchQuery: searchQuery,
          games: filtered,
          collections: filteredCols,
          developers: filteredDevs,
          publishers: filteredPubs,
        },
        replace: true,
      });
      setIsOpen(false);
    } else {
      // Only open if focused and not closing
      if (isFocused && !isClosing) {
        setIsOpen(true); // Always show dropdown when there's a search query (even if no results)
      }
    }
  }, [searchQuery, games, collections, developers, publishers, isFocused, isOnSearchResultsPage, navigate, saveRecentSearch, isClosing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking on a modal (edit or delete)
      if (
        target.closest('.edit-game-modal-container') ||
        target.closest('.edit-collection-modal-container') ||
        target.closest('.dropdown-menu-confirm-container')
      ) {
        return;
      }
      
      // Don't close if clicking on the additional-executables dropdown menu (portal)
      if (target.closest('.additional-executables-dropdown-menu')) {
        return;
      }
      
      // Don't close if clicking on the add-to-collection dropdown menu
      if (target.closest('.add-to-collection-dropdown-menu')) {
        return;
      }
      
      if (
        searchRef.current &&
        !searchRef.current.contains(target)
      ) {
        // Mark that we're closing FIRST, before anything else
        setIsClosing(true);
        
        // Clear any pending blur timeout immediately
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
        
        // Close both popup and searchbox together immediately
        setIsOpen(false);
        setIsFocused(false);
        
        // Also blur the input to remove focus
        if (inputRef.current) {
          inputRef.current.blur();
        }
        
        // Reset the flag after blur timeout would have passed
        setTimeout(() => {
          setIsClosing(false);
        }, 300);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Don't handle ESC if a modal is open (let the modal handle it)
        const isModalOpen = document.querySelector('.edit-game-modal-overlay, .edit-collection-modal-overlay, .dropdown-menu-confirm-overlay, .add-game-overlay, .launch-modal-overlay');
        if (isModalOpen) {
          return;
        }
        
        // Mark that we're closing FIRST
        setIsClosing(true);
        
        // Clear any pending blur timeout
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
        
        // Close both popup and searchbox together
        setIsOpen(false);
        setIsFocused(false);
        // Also blur the input to remove focus
        if (inputRef.current) {
          inputRef.current.blur();
        }
        
        // Reset the flag after a short delay
        setTimeout(() => {
          setIsClosing(false);
        }, 300);
      }
    }

    // Use pointerdown to catch it as early as possible, before blur
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const handleClear = () => {
    setSearchQuery("");
    if (isFocused) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleGameSelect = (game: GameItem) => {
    // Mark that we're selecting a game to prevent popup from reopening
    isSelectingGameRef.current = true;
    
    // Save search query to recent searches
    saveRecentSearch(searchQuery);
    onGameSelect(game);
    
    // Close everything
    setIsOpen(false);
    setIsFocused(false);
    setSearchQuery("");
    
    // Blur the input to remove focus
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    // Reset the flag after a short delay to allow state updates to complete
    setTimeout(() => {
      isSelectingGameRef.current = false;
    }, 100);
  };

  const handleRemoveRecentSearch = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== query);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
    // Keep popup open by refocusing the input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);

    if (isOnSearchResultsPage) {
      const queryLower = query.toLowerCase();
      const filtered = games.filter((game) =>
        game.title.toLowerCase().includes(queryLower)
      );
      const filteredCols = collections.filter((collection) =>
        collection.title.toLowerCase().includes(queryLower)
      );
      const filteredDevs = developers.filter((d) =>
        (d.title || "").toLowerCase().includes(queryLower)
      );
      const filteredPubs = publishers.filter((p) =>
        (p.title || "").toLowerCase().includes(queryLower)
      );
      saveRecentSearch(query);
      navigate("/search-results", {
        state: {
          searchQuery: query,
          games: filtered,
          collections: filteredCols,
          developers: filteredDevs,
          publishers: filteredPubs,
        },
      });
      setIsOpen(false);
      setIsFocused(false);
    } else {
      // If not on search results page, show popup
      setIsOpen(true);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setIsOpen(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If we're already closing, don't do anything
    if (isClosing) {
      return;
    }
    
    // Check if the related target (where focus is going) is inside our container
    const relatedTarget = e.relatedTarget as Node | null;
    const isClickingInside = relatedTarget && searchRef.current?.contains(relatedTarget);
    
    // If clicking inside (e.g., on a dropdown item), keep the popup open
    if (isClickingInside) {
      return;
    }
    
    // Don't close on blur - let click outside handle it
    // Just update focus state after a delay to allow clicks on dropdown items
    blurTimeoutRef.current = setTimeout(() => {
      if (!isClosing) {
        setIsFocused(false);
      }
      blurTimeoutRef.current = null;
    }, 150);
  };

  return (
    <div ref={searchRef} className="relative search-bar-container">
      <div className={`mhg-search-container-wrapper search-bar-wrapper ${isFocused ? "search-focused" : ""}`}>
        <div className="mhg-search-icon-wrapper">
          <svg
            className={isFocused ? "search-icon-focused" : "text-gray-400"}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            width="16"
            height="16"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          id="search-input"
          name="game-search-query"
          autoComplete="off"
          role="searchbox"
          aria-autocomplete="list"
          aria-label={t("search.placeholder")}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={t("search.placeholder")}
          className={`mhg-search-input search-input-with-padding ${
            searchQuery ? "has-query" : ""
          } ${isFocused ? "search-input-focused" : ""}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
              setIsFocused(false);
            } else if (e.key === "Enter" && searchQuery.trim().length >= 2 && (allFilteredGames.length > 0 || allFilteredCollections.length > 0 || allFilteredDevelopers.length > 0 || allFilteredPublishers.length > 0)) {
              saveRecentSearch(searchQuery);
              navigate("/search-results", {
                state: {
                  searchQuery: searchQuery,
                  games: allFilteredGames,
                  collections: allFilteredCollections,
                  developers: allFilteredDevelopers,
                  publishers: allFilteredPublishers,
                },
              });
              setSearchQuery("");
              setIsOpen(false);
            }
          }}
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            type="button"
            className="search-clear-button"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              width="16"
              height="16"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {((isOpen && !isOnSearchResultsPage && searchQuery.trim().length >= 2 && (filteredGames.length > 0 || filteredCollections.length > 0 || filteredDevelopers.length > 0 || filteredPublishers.length > 0)) || isModalOpen) && (
        <div className="mhg-dropdown search-dropdown" style={{ display: isModalOpen ? 'none' : 'flex' }}>
          <div className="search-dropdown-scroll">
            <SearchResultsList
              games={filteredGames}
              collections={filteredCollections}
              developers={filteredDevelopers}
              publishers={filteredPublishers}
              onGameClick={handleGameSelect}
              variant="popup"
              onPlay={onPlay}
              onCollectionClick={(collection) => {
                navigate(`/collections/${collection.id}`);
                setIsOpen(false);
                setIsFocused(false);
                setSearchQuery("");
              }}
              onDeveloperClick={(developer) => {
                navigate(`/developers/${developer.id}`);
                setIsOpen(false);
                setIsFocused(false);
                setSearchQuery("");
              }}
              onPublisherClick={(publisher) => {
                navigate(`/publishers/${publisher.id}`);
                setIsOpen(false);
                setIsFocused(false);
                setSearchQuery("");
              }}
              onGameUpdate={(updatedGame) => {
                setFilteredGames((prevGames) =>
                  prevGames.map((game) =>
                    game.id === updatedGame.id ? updatedGame : game
                  )
                );
                setAllFilteredGames((prevGames) =>
                  prevGames.map((game) =>
                    game.id === updatedGame.id ? updatedGame : game
                  )
                );
              }}
              onCollectionUpdate={(updatedCollection) => {
                setFilteredCollections((prevCollections) =>
                  prevCollections.map((collection) =>
                    collection.id === updatedCollection.id ? updatedCollection : collection
                  )
                );
                setAllFilteredCollections((prevCollections) =>
                  prevCollections.map((collection) =>
                    collection.id === updatedCollection.id ? updatedCollection : collection
                  )
                );
              }}
              onModalOpen={() => {
                setIsModalOpen(true);
                setIsOpen(false);
                setIsFocused(false);
              }}
              onModalClose={() => {
                setIsModalOpen(false);
              }}
            />
          </div>
          {(allFilteredGames.length > 0 || allFilteredCollections.length > 0 || allFilteredDevelopers.length > 0 || allFilteredPublishers.length > 0) && (
            <div className="search-dropdown-footer">
              <button
                onClick={() => {
                  saveRecentSearch(searchQuery);
                  navigate("/search-results", {
                    state: {
                      searchQuery: searchQuery,
                      games: allFilteredGames,
                      collections: allFilteredCollections,
                      developers: allFilteredDevelopers,
                      publishers: allFilteredPublishers,
                    },
                  });
                  setSearchQuery("");
                  setIsOpen(false);
                }}
                className="search-view-all-button"
              >
                {t("search.viewAllResults", { count: allFilteredGames.length + allFilteredCollections.length + allFilteredDevelopers.length + allFilteredPublishers.length })}
              </button>
            </div>
          )}
        </div>
      )}

      {isOpen && !isOnSearchResultsPage && searchQuery.trim().length >= 2 && filteredGames.length === 0 && filteredCollections.length === 0 && filteredDevelopers.length === 0 && filteredPublishers.length === 0 && (
        <div className="mhg-dropdown search-no-results">
          {t("search.noResults", { query: searchQuery })}
        </div>
      )}

      {isOpen && !isOnSearchResultsPage && searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
        <div className="mhg-dropdown search-no-results">
          {t("search.minimumCharacters", "Please enter at least 2 characters to search")}
        </div>
      )}

      {isOpen && isFocused && searchQuery.trim() === "" && recentSearches.length > 0 && (
        <div className="mhg-dropdown search-dropdown">
          <div className="search-dropdown-header">
            {t("search.recentSearches")}
          </div>
          <div className="search-dropdown-scroll">
            {recentSearches.map((query, index) => (
              <div
                key={index}
                onClick={() => handleRecentSearchClick(query)}
                className={`w-full mhg-dropdown-item search-dropdown-item search-recent-item ${
                  index < recentSearches.length - 1 ? "has-border" : ""
                }`}
                style={{ cursor: 'pointer' }}
              >
                <svg
                  className="search-recent-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <div className="search-result-content">
                  <div className="text-white text-base truncate search-result-title">
                    {query}
                  </div>
                </div>
                <button
                  className="search-recent-remove"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => handleRemoveRecentSearch(query, e)}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
