import { useState, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./App.css";
import Favicon from "./components/common/Favicon";
import Header from "./components/layout/Header";
import AddGame from "./components/common/AddGame";
import GameDetail from "./components/games/GameDetail";
import LaunchModal from "./components/common/LaunchModal";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Import pages normally - Vite will handle code splitting automatically via manualChunks config
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import AddGamePage from "./pages/AddGamePage";
import SearchResultsPage from "./pages/SearchResultsPage";
import CollectionDetail from "./pages/CollectionDetail";
import CategoryPage from "./pages/CategoryPage";
import LoginPage from "./pages/LoginPage";
import IGDBGameDetailPage from "./pages/IGDBGameDetailPage";

import type { GameItem, CollectionItem } from "./types";
import { buildApiUrl, buildCoverUrl } from "./utils/api";
import { API_BASE, getApiToken } from "./config";
import { useLoading } from "./contexts/LoadingContext";
import { useAuth } from "./contexts/AuthContext";
import { useGameEvents } from "./hooks/useGameEvents";

// Wrapper function for buildApiUrl that uses API_BASE
function buildApiUrlWithBase(
  path: string,
  params: Record<string, string | number | boolean> = {}
) {
  return buildApiUrl(API_BASE, path, params);
}

function AppContent() {
  const [allGames, setAllGames] = useState<GameItem[]>([]);
  const [allCollections, setAllCollections] = useState<CollectionItem[]>([]);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [addGameOpen, setAddGameOpen] = useState(false);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { setLoading } = useLoading();
  const { isLoading: authLoading, token: authToken } = useAuth();

  const handleCloseLaunchModal = () => {
    setLaunchError(null);
    setIsLaunching(false);
  };

  // Load games on app startup for search
  useEffect(() => {
    // Wait for authentication to complete before making API requests
    if (authLoading) {
      return;
    }
    
    // Get token - prefer getApiToken() which prioritizes VITE_API_TOKEN when available
    const apiToken = getApiToken() || authToken;
    if (!apiToken) {
      return;
    }
    
    async function loadGames() {
      setLoading(true);
      try {
        const url = buildApiUrlWithBase("/libraries/library/games", {
          sort: "title",
        });
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "X-Auth-Token": apiToken as string,
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const items = (json.games || []) as any[];
        const parsed = items.map((v) => ({
          id: String(v.id), // Ensure id is always a string
          title: v.title,
          summary: v.summary,
          cover: v.cover,
          background: v.background,
          day: v.day,
          month: v.month,
          year: v.year,
          stars: v.stars,
          genre: v.genre,
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
        setAllGames(parsed);
      } catch (err: any) {
        const errorMessage = String(err.message || err);
        console.error("Error loading games for search:", errorMessage);
      } finally {
        setLoading(false);
      }
    }
    loadGames();
  }, [authLoading, authToken, setLoading]);

  // Load collections on app startup
  useEffect(() => {
    // Wait for authentication to complete before making API requests
    if (authLoading) {
      return;
    }
    
    // Get token - prefer getApiToken() which prioritizes VITE_API_TOKEN when available
    const apiToken = getApiToken() || authToken;
    if (!apiToken) {
      return;
    }
    
    async function loadCollections() {
      setLoading(true);
      try {
        const url = buildApiUrlWithBase("/collections");
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "X-Auth-Token": apiToken as string,
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const items = (json.collections || []) as any[];
        const parsed = items.map((v) => ({
          id: String(v.id),
          title: v.title,
          summary: v.summary,
          cover: v.cover,
          background: v.background,
        }));
        setAllCollections(parsed);
      } catch (err: any) {
        const errorMessage = String(err.message || err);
        console.error("Error loading collections:", errorMessage);
      } finally {
        setLoading(false);
      }
    }
    loadCollections();
  }, [authLoading, authToken, setLoading]);

  // Function to reload all metadata without full page reload
  async function handleReloadAllMetadata() {
    const apiToken = getApiToken();
    if (!apiToken) return;

    setLoading(true);
    try {
      // Call server to reload metadata
      const url = buildApiUrlWithBase("/reload-games");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Auth-Token": apiToken,
        },
      });

      if (response.ok) {
        // Reload games
        const gamesUrl = buildApiUrlWithBase("/libraries/library/games", {
          sort: "title",
        });
        const gamesRes = await fetch(gamesUrl, {
          headers: {
            Accept: "application/json",
            "X-Auth-Token": apiToken,
          },
        });
        if (gamesRes.ok) {
          const gamesJson = await gamesRes.json();
          const items = (gamesJson.games || []) as any[];
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
            command: v.command || null,
          }));
          setAllGames(parsed);
        }

        // Reload collections
        const collectionsUrl = buildApiUrlWithBase("/collections");
        const collectionsRes = await fetch(collectionsUrl, {
          headers: {
            Accept: "application/json",
            "X-Auth-Token": apiToken,
          },
        });
        if (collectionsRes.ok) {
          const collectionsJson = await collectionsRes.json();
          const items = (collectionsJson.collections || []) as any[];
          const parsed = items.map((v) => ({
            id: String(v.id),
            title: v.title,
            cover: v.cover,
          }));
          setAllCollections(parsed);
        }

        // Emit custom event to notify pages to reload their data
        window.dispatchEvent(new CustomEvent("metadataReloaded"));
      } else {
        console.error("Failed to reload metadata");
      }
    } catch (error) {
      console.error("Error reloading metadata:", error);
    } finally {
      setLoading(false);
    }
  }

  // Load settings from server on app startup (after auth is ready)
  useEffect(() => {
    // Wait for authentication to complete
    if (authLoading) {
      return;
    }

    // Check if we have a token (either from auth or dev token)
    const apiToken = getApiToken();
    if (!apiToken) {
      return;
    }

    async function loadSettings() {
      try {
        const url = new URL("/settings", API_BASE);
        const res = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            "X-Auth-Token": apiToken,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const loadedLanguage = data.language || "en";
          // Update i18n language if different from current
          if (i18n.language !== loadedLanguage) {
            i18n.changeLanguage(loadedLanguage);
          }
          // Also update localStorage
          localStorage.setItem("language", loadedLanguage);
        } else {
          console.error("Failed to load settings:", res.status);
        }
      } catch (err) {
        console.error("Failed to load settings on startup:", err);
      }
    }
    loadSettings();
  }, [authLoading, i18n]);

  // Listen for game events to update allGames
  useGameEvents({ 
    setGames: setAllGames as React.Dispatch<React.SetStateAction<GameItem[]>>,
    enabledEvents: ["gameUpdated", "gameDeleted", "gameAdded"]
  });

  // Listen for collection addition events to update allCollections
  useEffect(() => {
    const handleCollectionAdded = (event: Event) => {
      const customEvent = event as CustomEvent<{ collection: CollectionItem }>;
      const addedCollection = customEvent.detail?.collection;
      if (addedCollection) {
        setAllCollections((prev: CollectionItem[]) => {
          // Ensure id is a string
          const collectionToAdd: CollectionItem = {
            ...addedCollection,
            id: String(addedCollection.id),
          };
          
          // Check if collection already exists (avoid duplicates)
          const existingIndex = prev.findIndex((c) => String(c.id) === String(collectionToAdd.id));
          if (existingIndex >= 0) {
            // Update existing collection
            const updated = [...prev];
            updated[existingIndex] = collectionToAdd;
            return updated;
          } else {
            // Add new collection
            return [...prev, collectionToAdd];
          }
        });
      }
    };

    window.addEventListener("collectionAdded", handleCollectionAdded as EventListener);
    return () => {
      window.removeEventListener("collectionAdded", handleCollectionAdded as EventListener);
    };
  }, []);

  // Listen for collection update events to update allCollections
  useEffect(() => {
    const handleCollectionUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ collection: CollectionItem }>;
      const updatedCollection = customEvent.detail?.collection;
      if (updatedCollection) {
        setAllCollections((prev: CollectionItem[]) =>
          prev.map((collection: CollectionItem) =>
            String(collection.id) === String(updatedCollection.id) ? updatedCollection : collection
          )
        );
      }
    };

    window.addEventListener("collectionUpdated", handleCollectionUpdated as EventListener);
    return () => {
      window.removeEventListener("collectionUpdated", handleCollectionUpdated as EventListener);
    };
  }, []);

  // Listen for collection deletion events to update allCollections
  useEffect(() => {
    const handleCollectionDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ collectionId: string }>;
      const deletedCollectionId = customEvent.detail?.collectionId;
      if (deletedCollectionId) {
        setAllCollections((prev: CollectionItem[]) =>
          prev.filter((collection: CollectionItem) => String(collection.id) !== String(deletedCollectionId))
        );
      }
    };

    window.addEventListener("collectionDeleted", handleCollectionDeleted as EventListener);
    return () => {
      window.removeEventListener("collectionDeleted", handleCollectionDeleted as EventListener);
    };
  }, []);

  async function openLauncher(item: GameItem | CollectionItem) {
    setIsLaunching(true);
    setLaunchError(null);
    
    try {
      let gameId = item.id;
      
      // If it's a collection, get the first game with command from the collection
      const isCollection = allCollections.some(c => c.id === item.id);
      if (isCollection) {
        try {
            const gamesUrl = buildApiUrlWithBase(`/collections/${item.id}/games`);
          const gamesRes = await fetch(gamesUrl, {
            headers: {
              Accept: "application/json",
              "X-Auth-Token": getApiToken(),
            },
          });
          if (gamesRes.ok) {
            const gamesJson = await gamesRes.json();
            const games = gamesJson.games || [];
            // Find the first game that has a command
            const gameWithCommand = games.find((g: any) => !!g.command);
            if (gameWithCommand) {
              gameId = gameWithCommand.id;
            } else {
              setIsLaunching(false);
              setLaunchError("No game with executable found in collection");
              return;
            }
          } else {
            setIsLaunching(false);
            setLaunchError("Failed to load collection games");
            return;
          }
        } catch (err: any) {
          setIsLaunching(false);
          setLaunchError(err.message || "Failed to load collection games");
          return;
        }
      }
      
      const launchUrl = buildApiUrlWithBase(`/launcher`, {
        gameId: gameId,
        token: getApiToken(),
      });
      const res = await fetch(launchUrl, {
        headers: {
          Accept: "application/json",
          "X-Auth-Token": getApiToken(),
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        // Prefer detail over error as it contains more specific information
        const errorMessage = errorData.detail || errorData.error || `Failed to launch game (HTTP ${res.status})`;
        setIsLaunching(false);
        setLaunchError(errorMessage);
      } else {
        // Success - close loading after a short delay
        setTimeout(() => {
          setIsLaunching(false);
        }, 500);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to launch game";
      setIsLaunching(false);
      setLaunchError(errorMessage);
    }
  }

  function handleGameClick(game: GameItem) {
    navigate(`/game/${game.id}`, {
      state: { from: window.location.pathname }
    });
  }

  function handleGameSelect(game: GameItem) {
    navigate(`/game/${game.id}`);
  }

  return (
    <>
      <Favicon />
      <div className="bg-[#1a1a1a] text-white app-main-container">
        <Routes>
          {/* Login page - public, no header */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes - require authentication (unless VITE_API_TOKEN is set) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Header
                  onPlay={openLauncher}
                  allGames={allGames}
                  allCollections={allCollections}
                  onGameSelect={handleGameSelect}
                  onHomeClick={() => navigate("/")}
                  onSettingsClick={() => navigate("/settings")}
                  onAddGameClick={() => setAddGameOpen(true)}
                />
                <HomePage
                  onGameClick={handleGameClick}
                  onPlay={openLauncher}
                  onGamesLoaded={(games) => {
                    setAllGames((prev: GameItem[]) => {
                      // Deduplicate games array first
                      const uniqueGames = Array.from(
                        new Map(games.map((g) => [String(g.id), g])).values()
                      );
                      const existingIds = new Set(
                        prev.map((g: GameItem) => String(g.id))
                      );
                      const newGames = uniqueGames.filter(
                        (g: GameItem) => !existingIds.has(String(g.id))
                      );
                      return [...prev, ...newGames];
                    });
                  }}
                  onReloadMetadata={handleReloadAllMetadata}
                  allCollections={allCollections}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game/:gameId"
            element={
              <ProtectedRoute>
                <Header
                  onPlay={openLauncher}
                  allGames={allGames}
                  allCollections={allCollections}
                  onGameSelect={handleGameSelect}
                  onHomeClick={() => navigate("/")}
                  onSettingsClick={() => navigate("/settings")}
                  onAddGameClick={() => setAddGameOpen(true)}
                />
                <GameDetailPage onPlay={openLauncher} allCollections={allCollections} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collections/:collectionId"
            element={
              <ProtectedRoute>
                <Header
                  onPlay={openLauncher}
                  allGames={allGames}
                  allCollections={allCollections}
                  onGameSelect={handleGameSelect}
                  onHomeClick={() => navigate("/")}
                  onSettingsClick={() => navigate("/settings")}
                  onAddGameClick={() => setAddGameOpen(true)}
                />
                <CollectionDetail
                  onGameClick={handleGameClick}
                  onGamesLoaded={(games) => {
                    setAllGames((prev: GameItem[]) => {
                      // Deduplicate games array first
                      const uniqueGames = Array.from(
                        new Map(games.map((g) => [String(g.id), g])).values()
                      );
                      const existingIds = new Set(
                        prev.map((g: GameItem) => String(g.id))
                      );
                      const newGames = uniqueGames.filter(
                        (g: GameItem) => !existingIds.has(String(g.id))
                      );
                      return [...prev, ...newGames];
                    });
                  }}
                  onPlay={openLauncher}
                  allCollections={allCollections}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/category/:categoryId"
            element={
              <ProtectedRoute>
                <Header
                  onPlay={openLauncher}
                  allGames={allGames}
                  allCollections={allCollections}
                  onGameSelect={handleGameSelect}
                  onHomeClick={() => navigate("/")}
                  onSettingsClick={() => navigate("/settings")}
                  onAddGameClick={() => setAddGameOpen(true)}
                />
                <CategoryPage
                  onGameClick={handleGameClick}
                  onGamesLoaded={(games) => {
                    setAllGames((prev: GameItem[]) => {
                      // Deduplicate games array first
                      const uniqueGames = Array.from(
                        new Map(games.map((g) => [String(g.id), g])).values()
                      );
                      const existingIds = new Set(
                        prev.map((g: GameItem) => String(g.id))
                      );
                      const newGames = uniqueGames.filter(
                        (g: GameItem) => !existingIds.has(String(g.id))
                      );
                      return [...prev, ...newGames];
                    });
                  }}
                  onPlay={openLauncher}
                  allCollections={allCollections}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <>
                <Header
                  onPlay={openLauncher}
                  allGames={allGames}
                  allCollections={allCollections}
                  onGameSelect={handleGameSelect}
                  onHomeClick={() => navigate("/")}
                  onSettingsClick={() => navigate("/settings")}
                  onAddGameClick={() => setAddGameOpen(true)}
                />
                <SettingsPage />
              </>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Header
                  onPlay={openLauncher}
                  allGames={allGames}
                  allCollections={allCollections}
                  onGameSelect={handleGameSelect}
                  onHomeClick={() => navigate("/")}
                  onSettingsClick={() => navigate("/settings")}
                  onAddGameClick={() => setAddGameOpen(true)}
                />
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-game"
            element={
              <ProtectedRoute>
                <Header
                  onPlay={openLauncher}
                  allGames={allGames}
                  allCollections={allCollections}
                  onGameSelect={handleGameSelect}
                  onHomeClick={() => navigate("/")}
                  onSettingsClick={() => navigate("/settings")}
                  onAddGameClick={() => setAddGameOpen(true)}
                />
                <AddGamePage
                  onGameSelected={() => {
                    // TODO: Implement game addition logic
                  }}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search-results"
            element={
              <ProtectedRoute>
                <Header
                  onPlay={openLauncher}
                  allGames={allGames}
                  allCollections={allCollections}
                  onGameSelect={handleGameSelect}
                  onHomeClick={() => navigate("/")}
                  onSettingsClick={() => navigate("/settings")}
                  onAddGameClick={() => setAddGameOpen(true)}
                />
                <SearchResultsPage
                  onPlay={openLauncher}
                  onGameClick={handleGameClick}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/igdb-game/:igdbId"
            element={
              <ProtectedRoute>
                <Header
                  onPlay={openLauncher}
                  allGames={allGames}
                  allCollections={allCollections}
                  onGameSelect={handleGameSelect}
                  onHomeClick={() => navigate("/")}
                  onSettingsClick={() => navigate("/settings")}
                  onAddGameClick={() => setAddGameOpen(true)}
                />
                <IGDBGameDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>

        {/* Add Game Modal */}
        <AddGame
          isOpen={addGameOpen}
          onClose={() => setAddGameOpen(false)}
          allGames={allGames}
        />

        {/* Launch Modal - handles both loading and error states */}
        <LaunchModal
          isLaunching={isLaunching}
          launchError={launchError}
          onClose={handleCloseLaunchModal}
        />
      </div>
    </>
  );
}

function GameDetailPage({
  onPlay,
  allCollections,
}: {
  onPlay: (game: GameItem) => void;
  allCollections: CollectionItem[];
}) {
  const { t } = useTranslation();
  const { setLoading, isLoading } = useLoading();
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<GameItem | null>(null);
  const isDeletingLocallyRef = useRef(false);

  // Listen for game deletion events - if the current game is deleted from elsewhere, navigate back
  useEffect(() => {
    const handleGameDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId: string }>;
      const deletedGameId = customEvent.detail?.gameId;
      // Only navigate if the game was deleted from elsewhere (not from this page)
      if (deletedGameId && game && String(game.id) === String(deletedGameId) && !isDeletingLocallyRef.current) {
        // The current game was deleted from elsewhere (e.g., search popup), navigate back
        window.history.back();
      }
      // Reset the flag after a short delay to allow the event to propagate
      setTimeout(() => {
        isDeletingLocallyRef.current = false;
      }, 100);
    };

    window.addEventListener("gameDeleted", handleGameDeleted as EventListener);
    return () => {
      window.removeEventListener("gameDeleted", handleGameDeleted as EventListener);
    };
  }, [game]);

  useEffect(() => {
    if (gameId) {
      // Always fetch from API to get background field
      fetchGame(gameId);
    }
  }, [gameId]);

  async function fetchGame(gameId: string) {
    setLoading(true);
    try {
      // Fetch single game from dedicated endpoint
        const url = buildApiUrlWithBase(`/games/${gameId}`);
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Auth-Token": getApiToken(),
        },
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          setGame(null);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      
      const found = await res.json();
      const parsed: GameItem = {
        id: String(found.id),
        title: found.title,
        summary: found.summary,
        cover: found.cover,
        background: found.background,
        day: found.day,
        month: found.month,
        year: found.year,
        stars: found.stars,
        genre: found.genre,
        criticratings: found.criticratings,
        userratings: found.userratings,
        command: found.command || null,
        themes: found.themes || null,
        platforms: found.platforms || null,
        gameModes: found.gameModes || null,
        playerPerspectives: found.playerPerspectives || null,
        websites: found.websites || null,
        ageRatings: found.ageRatings || null,
        developers: found.developers || null,
        publishers: found.publishers || null,
        franchise: found.franchise || null,
        collection: found.collection || null,
        screenshots: found.screenshots || null,
        videos: found.videos || null,
        gameEngines: found.gameEngines || null,
        keywords: found.keywords || null,
        alternativeNames: found.alternativeNames || null,
        similarGames: found.similarGames || null,
      };
      setGame(parsed);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      console.error("Error fetching game:", errorMessage);
      setGame(null);
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return null;
  }

  if (!game) {
    return (
      <div className="bg-[#1a1a1a] text-white flex items-center justify-center app-content-wrapper">
        <div className="text-center">
          <div className="text-gray-400">{t("gameDetail.notFound")}</div>
        </div>
      </div>
    );
  }

  // Use a key based on cover/background to force re-render when images change
  const imageKey = `${game.cover || ''}-${game.background || ''}`;
  
  return (
    <GameDetail
      key={imageKey}
      game={game}
      coverUrl={buildCoverUrl(API_BASE, game.cover, true)}
      onPlay={onPlay}
      allCollections={allCollections}
      onGameUpdate={(updatedGame) => {
        setGame(updatedGame);
      }}
      onGameDelete={() => {
        // Mark that deletion is happening locally
        isDeletingLocallyRef.current = true;
        // Navigate back after deletion
        window.history.back();
      }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/app/">
      <AppContent />
    </BrowserRouter>
  );
}
