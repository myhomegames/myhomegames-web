import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatIGDBGameDate } from "../../utils/date";
import { API_BASE, API_TOKEN, getTwitchClientId, getTwitchClientSecret } from "../../config";
import type { GameItem, IGDBGame } from "../../types";
import "./AddGame.css";

type AddGameProps = {
  isOpen: boolean;
  onClose: () => void;
  allGames?: GameItem[];
};

export default function AddGame({
  isOpen,
  onClose,
  allGames = [],
}: AddGameProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<IGDBGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastSearchQueryRef = useRef<string>("");
  const lastEffectQueryRef = useRef<string>("");
  const isOpenRef = useRef(isOpen);
  
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Check if an IGDB game matches a local game (by ID)
  function findMatchingLocalGame(igdbGame: IGDBGame): GameItem | undefined {
    return allGames.find(
      (localGame) => String(localGame.id) === String(igdbGame.id)
    );
  }

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setResults([]);
      setError(null);
      setIsSearching(false);
      lastSearchQueryRef.current = "";
      return;
    }

    // When modal opens, check if input already has a value from autofill
    // This needs to happen after a delay to allow browser autofill to populate
    const checkInitialValue: ReturnType<typeof setTimeout> = setTimeout(() => {
      const input = inputRef.current;
      if (input && input.value) {
        setSearchQuery((prev) => {
          if (prev !== input.value) {
            return input.value;
          }
          return prev;
        });
      }
    }, 100);

    // Handle ESC key to close modal
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscKey);

    // Check for autofill value after modal opens and input is focused
    const checkAutofill = () => {
      // Wait a bit for browser to populate autofill
      setTimeout(() => {
        const input = inputRef.current;
        if (input && input.value) {
          setSearchQuery((prev) => {
            if (prev !== input.value) {
              return input.value;
            }
            return prev;
          });
        }
      }, 200);
    };

    // Check when modal opens
    checkAutofill();

    // Set up input event listeners
    const input = inputRef.current;
    if (input) {
      const handleInputEvent = (e: Event) => {
        const value = (e.target as HTMLInputElement).value.trim();
        // Only update if value is different from current searchQuery
        // Use ref to check against last search query to avoid race conditions
        if (value !== lastSearchQueryRef.current) {
          setSearchQuery((prev) => {
            // Double check to avoid unnecessary updates
            if (value !== prev) {
              return value;
            }
            return prev;
          });
        }
      };

      // Listen to multiple events to catch autofill
      input.addEventListener('input', handleInputEvent);
      input.addEventListener('change', handleInputEvent);
      input.addEventListener('keyup', handleInputEvent);
      input.addEventListener('paste', handleInputEvent);
      
      // Check on focus - autofill often happens on focus
      const handleFocus = () => {
        // Check immediately and then after delays to catch autofill
        const checkAndUpdate = () => {
          const value = input.value.trim();
          if (value && value !== lastSearchQueryRef.current) {
            setSearchQuery((prev) => {
              if (value !== prev) {
                return value;
              }
              return prev;
            });
          }
        };
        checkAndUpdate();
        setTimeout(checkAndUpdate, 50);
        setTimeout(checkAndUpdate, 100);
        setTimeout(checkAndUpdate, 200);
        setTimeout(checkAndUpdate, 500);
      };
      
      const handleBlur = () => {
        if (input.value) {
          setSearchQuery(input.value);
        }
      };
      
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);

      // Check value periodically to catch autofill that doesn't trigger events
      // Stop polling once we've detected a value to avoid interfering with search
      let intervalId: ReturnType<typeof setInterval> | null = null;
      let lastPolledValue = "";
      const checkValue = () => {
        const currentValue = input.value.trim();
        
        // Stop polling if we've already processed this value
        if (currentValue === lastPolledValue) {
          return;
        }
        
        // If input has a valid value, update state and stop polling
        if (currentValue && currentValue.length >= 2 && currentValue !== lastSearchQueryRef.current) {
          lastPolledValue = currentValue;
          // Stop polling BEFORE updating state to prevent multiple calls
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          setSearchQuery((prev) => {
            // Only update if different to avoid unnecessary re-renders
            if (prev !== currentValue) {
              return currentValue;
            }
            return prev;
          });
        } else {
          // Update lastPolledValue even if empty to avoid repeated checks
          lastPolledValue = currentValue;
        }
      };
      
      intervalId = setInterval(checkValue, 100);
      // Stop polling after 2 seconds max
      setTimeout(() => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 2000);

      // Clear timeout on unmount or when modal closes
      return () => {
        if (checkInitialValue !== null && checkInitialValue !== undefined) {
          clearTimeout(checkInitialValue);
        }
        document.removeEventListener("keydown", handleEscKey);
        input.removeEventListener('input', handleInputEvent);
        input.removeEventListener('change', handleInputEvent);
        input.removeEventListener('keyup', handleInputEvent);
        input.removeEventListener('paste', handleInputEvent);
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
        if (intervalId !== null && intervalId !== undefined) {
          clearInterval(intervalId);
        }
        // Only clear timeout if modal is closing, not on re-render
        if (!isOpenRef.current && searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
      };
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      // Only clear timeout when modal is actually closing, not when onClose changes
      if (!isOpenRef.current && searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [isOpen, onClose]);

  // Function to perform the actual search
  const performSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim();
    
    // Don't search if query is the same as last search (avoid cancelling timeout)
    if (trimmedQuery === lastSearchQueryRef.current && trimmedQuery.length >= 2) {
      return;
    }
    
    // Don't search if query is too short
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      lastSearchQueryRef.current = "";
      return;
    }

    // Update last search query immediately to prevent duplicate calls
    lastSearchQueryRef.current = trimmedQuery;
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Debounce search
    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      // Clear the ref after execution to prevent cleanup from clearing it
      searchTimeoutRef.current = null;
      try {
        const url = new URL("/igdb/search", API_BASE);
        url.searchParams.set("q", trimmedQuery);

        const headers: Record<string, string> = {
          Accept: "application/json",
          "X-Auth-Token": API_TOKEN,
        };
        
        // Add Twitch credentials for IGDB API
        const clientId = getTwitchClientId();
        const clientSecret = getTwitchClientSecret();
        if (clientId) headers["X-Twitch-Client-Id"] = clientId;
        if (clientSecret) headers["X-Twitch-Client-Secret"] = clientSecret;

        const res = await fetch(url.toString(), {
          headers,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        setResults(json.games || []);
        setError(null);
        
        // Close browser autocomplete popup when results arrive
        // Do a brief blur/focus cycle to dismiss the autocomplete dropdown
        if (inputRef.current && json.games && json.games.length > 0) {
          inputRef.current.blur();
          // Re-focus after a very short delay to allow user to continue typing
          setTimeout(() => {
            if (inputRef.current && isOpenRef.current) {
              inputRef.current.focus();
            }
          }, 50);
        }
      } catch (err: any) {
        console.error('Search error:', err);
        setError(String(err.message || err));
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    searchTimeoutRef.current = timeoutId;
  }, []);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    const previousQuery = lastEffectQueryRef.current;
    
    // Store the query that triggered this effect (always, not just when performing search)
    lastEffectQueryRef.current = trimmedQuery;
    
    // Only perform search if query is different from last search
    if (trimmedQuery !== lastSearchQueryRef.current || trimmedQuery.length < 2) {
      performSearch(searchQuery);
    }

    return () => {
      // Only clear timeout if searchQuery actually changed (not just a re-render)
      const currentTrimmedQuery = searchQuery.trim();
      if (searchTimeoutRef.current && previousQuery !== currentTrimmedQuery) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="add-game-overlay"
      onClick={onClose}
    >
      <div
        className="add-game-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-game-header">
          <h2 className="add-game-title">{t("addGame.title")}</h2>
        </div>

        <div className="add-game-content">
          <div className="add-game-search-container">
            <input
              ref={inputRef}
              id="add-game-search"
              name="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("addGame.searchPlaceholder")}
              className="add-game-search-input"
              autoFocus
              aria-label={t("addGame.searchPlaceholder")}
            />
          </div>

          {error && (
            <div className="add-game-error">
              {t("addGame.error")}: {error}
            </div>
          )}

          <div className="add-game-results">
            {isSearching ? (
              <div className="add-game-loading">
                <div className="add-game-spinner"></div>
                <div>{t("addGame.loading", "Searching...")}</div>
              </div>
            ) : results.length === 0 && searchQuery.trim().length >= 2 ? (
              <div className="add-game-empty-state">
                {t("addGame.noResults")}
              </div>
            ) : results.length === 0 ? (
              <div className="add-game-empty-state">
                {t("addGame.typeToSearch")}
              </div>
            ) : (
              <div className="add-game-results-list">
                {results.map((game) => {
                  const matchingGame = findMatchingLocalGame(game);
                  const isNew = !matchingGame;
                  
                  return (
                    <button
                      key={game.id}
                      onClick={() => {
                        if (matchingGame) {
                          // Navigate to existing game detail
                          navigate(`/game/${matchingGame.id}`);
                          onClose();
                        } else {
                          // Navigate to IGDB game detail page with game data
                          navigate(`/igdb-game/${game.id}`, {
                            state: { gameData: game }
                          });
                          onClose();
                        }
                      }}
                      className="add-game-result-item"
                    >
                      {game.cover ? (
                        <img
                          src={game.cover}
                          alt={game.name}
                          className="add-game-result-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="add-game-result-placeholder">
                          🎮
                        </div>
                      )}
                      <div className="add-game-result-content">
                        <div className="add-game-result-title-row">
                          <div className="add-game-result-title">
                            {game.name}
                          </div>
                          {isNew && (
                            <span className="add-game-result-new-label">
                              {t("addGame.new")}
                            </span>
                          )}
                        </div>
                        {formatIGDBGameDate(game, t, i18n) && (
                          <div className="add-game-result-date">
                            {formatIGDBGameDate(game, t, i18n)}
                          </div>
                        )}
                        {game.summary && (
                          <div className="add-game-result-summary">
                            {game.summary}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
