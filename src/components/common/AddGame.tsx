import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatIGDBGameDate } from "../../utils/date";
import { displayGameType } from "../../utils/igdbGameType";
import { API_BASE, API_TOKEN, getTwitchClientId, getTwitchClientSecret } from "../../config";
import { useSettings } from "../../contexts/SettingsContext";
import { useCreateGame } from "./actions";
import type { GameItem, IGDBGame } from "../../types";
import Cover from "../games/Cover";

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
  const { twitchLoginEnabled } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [results, setResults] = useState<IGDBGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const createTitleInputRef = useRef<HTMLInputElement | null>(null);
  const lastSearchQueryRef = useRef<string>("");
  const lastEffectQueryRef = useRef<string>("");
  const isOpenRef = useRef(isOpen);

  const { isCreating, createError, createGame } = useCreateGame({
    onGameAdded: (game) => {
      navigate(`/game/${game.id}`);
      onClose();
    },
    onError: () => {},
  });
  
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
    if (isOpen && !twitchLoginEnabled) {
      // Ensure create-from-scratch input gets focus when search is unavailable.
      const focusTimeout = setTimeout(() => {
        createTitleInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(focusTimeout);
    }
  }, [isOpen, twitchLoginEnabled]);

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
    
    // Don't search if query is too short (allow single digit when it's a numeric ID)
    const isNumericId = /^\d+$/.test(trimmedQuery);
    if (trimmedQuery.length < 2 && !isNumericId) {
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
        const clientId = getTwitchClientId();
        const clientSecret = getTwitchClientSecret();
        if (!clientId || !clientSecret) {
          setError(t("addGame.credentialsRequired", "Configure Twitch credentials in Settings to search IGDB."));
          setResults([]);
          setIsSearching(false);
          return;
        }

        const url = new URL("/igdb/search", API_BASE);
        url.searchParams.set("q", trimmedQuery);

        const headers: Record<string, string> = {
          Accept: "application/json",
          "X-Auth-Token": API_TOKEN,
          "X-Twitch-Client-Id": clientId,
          "X-Twitch-Client-Secret": clientSecret,
        };

        const res = await fetch(url.toString(), {
          headers,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message = typeof body?.error === "string" ? body.error : `HTTP ${res.status}`;
          throw new Error(message);
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
    
    lastEffectQueryRef.current = trimmedQuery;
    
    if (!twitchLoginEnabled) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      return;
    }
    
    if (trimmedQuery !== lastSearchQueryRef.current || trimmedQuery.length < 2) {
      performSearch(searchQuery);
    }

    return () => {
      const currentTrimmedQuery = searchQuery.trim();
      if (searchTimeoutRef.current && previousQuery !== currentTrimmedQuery) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchQuery, twitchLoginEnabled]);

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
          {twitchLoginEnabled && (
            <div className="add-game-search-container">
              <label htmlFor="add-game-search" className="add-game-sr-only">
                {t("addGame.searchPlaceholder")}
              </label>
              <input
                ref={inputRef}
                id="add-game-search"
                name="igdbSearchQuery"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("addGame.searchPlaceholder")}
                className="add-game-search-input"
                autoFocus
                autoComplete="off"
              />
            </div>
          )}

          <div className="add-game-create-from-scratch">
            <div className="add-game-create-label">{t("addGame.createFromScratch")}</div>
            <form
              className="add-game-create-row"
              onSubmit={async (e) => {
                e.preventDefault();
                const title = createTitle.trim();
                if (!title || isCreating) return;
                const game = await createGame(title);
                if (game) {
                  setCreateTitle("");
                }
              }}
            >
              <label htmlFor="add-game-create-title" className="add-game-sr-only">
                {t("addGame.newGameTitle")}
              </label>
              <input
                ref={createTitleInputRef}
                id="add-game-create-title"
                name="newGameTitle"
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const title = createTitle.trim();
                  if (!title || isCreating) return;
                  const game = await createGame(title);
                  if (game) setCreateTitle("");
                }}
                placeholder={t("addGame.newGameTitlePlaceholder")}
                className="add-game-search-input add-game-create-input"
                disabled={isCreating}
                autoFocus={!twitchLoginEnabled}
              />
              <button
                type="submit"
                disabled={!createTitle.trim() || isCreating}
                className="add-game-create-btn"
              >
                {isCreating ? t("addGame.creating", "Creating...") : t("addGame.create")}
              </button>
            </form>
            {createError && (
              <div className="add-game-error add-game-create-error">{createError}</div>
            )}
          </div>

          {twitchLoginEnabled && error && (
            <div className="add-game-error">
              {t("addGame.error")}: {error}
            </div>
          )}

          {twitchLoginEnabled && (
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
                  const typeLabel =
                    game.type != null ? displayGameType(game.type) : "";

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
                      <div className="add-game-result-cover-wrap">
                        <Cover
                          title={game.name}
                          coverUrl={game.cover || ""}
                          width={80}
                          height={120}
                          showTitle={false}
                          detail={false}
                          play={false}
                          showBorder={false}
                        />
                      </div>
                      <div className="add-game-result-content">
                        <div className="add-game-result-title-row">
                          <div className="add-game-result-title">
                            {game.name}
                          </div>
                          {typeLabel ? (
                            <span className="add-game-result-type-label">
                              {typeLabel}
                            </span>
                          ) : null}
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
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
