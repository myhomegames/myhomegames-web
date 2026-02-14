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
import LibraryItemDetailPage from "./pages/LibraryItemDetailPage";
import TagGamesRoutePage from "./pages/TagGamesRoutePage";
import LoginPage from "./pages/LoginPage";
import IGDBGameDetailPage from "./pages/IGDBGameDetailPage";

import type { GameItem, CollectionItem } from "./types";
import { buildApiUrl, buildCoverUrl, buildApiHeaders } from "./utils/api";
import { API_BASE, getApiToken } from "./config";
import { useLoading } from "./contexts/LoadingContext";
import { useAuth } from "./contexts/AuthContext";
import { useCollections } from "./contexts/CollectionsContext";
import { useLibraryGames } from "./contexts/LibraryGamesContext";

// Wrapper function for buildApiUrl that uses API_BASE
function buildApiUrlWithBase(
  path: string,
  params: Record<string, string | number | boolean> = {}
) {
  return buildApiUrl(API_BASE, path, params);
}

function AppContent() {
  const { collections: allCollections } = useCollections();
  const { games: allGames } = useLibraryGames();
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [addGameOpen, setAddGameOpen] = useState(false);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { setLoading } = useLoading();
  const { isLoading: authLoading } = useAuth();

  const handleCloseLaunchModal = () => {
    setLaunchError(null);
    setIsLaunching(false);
  };

  // Games and collections are now loaded automatically via context, no need to fetch them here

  const { refreshCollections } = useCollections();
  const { refreshGames: refreshLibraryGames } = useLibraryGames();

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
        headers: buildApiHeaders(),
      });

      if (response.ok) {
        // Refresh games and collections via context
        await Promise.all([
          refreshLibraryGames(),
          refreshCollections(),
        ]);

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
          headers: buildApiHeaders({ Accept: "application/json" }),
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
          if (Array.isArray(data.visibleLibraries)) {
            localStorage.setItem(
              "visibleLibraries",
              JSON.stringify(data.visibleLibraries)
            );
          }
        } else {
          console.error("Failed to load settings:", res.status);
        }
      } catch (err) {
        console.error("Failed to load settings on startup:", err);
      }
    }
    loadSettings();
  }, [authLoading, i18n]);

  // Game and collection events are now handled by their respective contexts, no need to listen here

  async function openLauncher(item: GameItem | CollectionItem, executableName?: string) {
    setIsLaunching(true);
    setLaunchError(null);
    
    try {
      let gameId = item.id;
      
      // If it's a collection, get the first game with executables from the collection
      const isCollection = allCollections.some(c => c.id === item.id);
      if (isCollection) {
        try {
            const gamesUrl = buildApiUrlWithBase(`/collections/${item.id}/games`);
          const gamesRes = await fetch(gamesUrl, {
            headers: buildApiHeaders({ Accept: "application/json" }),
          });
          if (gamesRes.ok) {
            const gamesJson = await gamesRes.json();
            const games = gamesJson.games || [];
            // Find the first game that has executables
            const gameWithExecutables = games.find((g: any) => g.executables && g.executables.length > 0);
            if (gameWithExecutables) {
              gameId = gameWithExecutables.id;
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
      
      const launchParams: Record<string, string | number | boolean> = {
        gameId: gameId,
        token: getApiToken(),
      };
      if (executableName) {
        launchParams.executableName = executableName;
      }
      const launchUrl = buildApiUrlWithBase(`/launcher`, launchParams);
      const res = await fetch(launchUrl, {
        headers: buildApiHeaders({ Accept: "application/json" }),
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
                  onGamesLoaded={() => {
                    // Games are now managed by LibraryGamesContext, no need to update here
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
                <LibraryItemDetailPage
                  onGameClick={handleGameClick}
                  onGamesLoaded={() => {}}
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
                <TagGamesRoutePage
                  onGameClick={handleGameClick}
                  onGamesLoaded={() => {
                    // Games are now managed by LibraryGamesContext, no need to update here
                  }}
                  onPlay={openLauncher}
                  allCollections={allCollections}
                  tagKey="categories"
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platforms/:platformId"
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
                <TagGamesRoutePage
                  onGameClick={handleGameClick}
                  onGamesLoaded={() => {
                    // Games are now managed by LibraryGamesContext, no need to update here
                  }}
                  onPlay={openLauncher}
                  allCollections={allCollections}
                  tagKey="platforms"
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/themes/:themeId"
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
                <TagGamesRoutePage
                  onGameClick={handleGameClick}
                  onGamesLoaded={() => {
                    // Games are now managed by LibraryGamesContext, no need to update here
                  }}
                  onPlay={openLauncher}
                  allCollections={allCollections}
                  tagKey="themes"
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/developers/:developerId"
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
                <LibraryItemDetailPage
                  onGameClick={handleGameClick}
                  onGamesLoaded={() => {}}
                  onPlay={openLauncher}
                  allCollections={allCollections}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/publishers/:publisherId"
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
                <LibraryItemDetailPage
                  onGameClick={handleGameClick}
                  onGamesLoaded={() => {}}
                  onPlay={openLauncher}
                  allCollections={allCollections}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game-engines/:gameEngineId"
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
                <TagGamesRoutePage
                  onGameClick={handleGameClick}
                  onGamesLoaded={() => {
                    // Games are now managed by LibraryGamesContext, no need to update here
                  }}
                  onPlay={openLauncher}
                  allCollections={allCollections}
                  tagKey="gameEngines"
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game-modes/:gameModeId"
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
                <TagGamesRoutePage
                  onGameClick={handleGameClick}
                  onGamesLoaded={() => {
                    // Games are now managed by LibraryGamesContext, no need to update here
                  }}
                  onPlay={openLauncher}
                  allCollections={allCollections}
                  tagKey="gameModes"
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player-perspectives/:playerPerspectiveId"
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
                <TagGamesRoutePage
                  onGameClick={handleGameClick}
                  onGamesLoaded={() => {
                    // Games are now managed by LibraryGamesContext, no need to update here
                  }}
                  onPlay={openLauncher}
                  allCollections={allCollections}
                  tagKey="playerPerspectives"
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
  const fetchingGameRef = useRef<boolean>(false);
  const lastGameIdRef = useRef<string | undefined>(undefined);

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

  // Listen for game updates (e.g. add to developer/publisher) so the detail view reflects changes
  useEffect(() => {
    const handleGameUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ game: GameItem }>;
      const updatedGame = customEvent.detail?.game;
      if (!updatedGame || !gameId) return;
      if (String(updatedGame.id) !== String(gameId)) return;
      const parsed: GameItem = {
        id: String(updatedGame.id),
        title: updatedGame.title,
        summary: updatedGame.summary,
        cover: updatedGame.cover,
        background: updatedGame.background,
        day: updatedGame.day,
        month: updatedGame.month,
        year: updatedGame.year,
        stars: updatedGame.stars,
        genre: updatedGame.genre,
        criticratings: updatedGame.criticratings,
        userratings: updatedGame.userratings,
        executables: updatedGame.executables ?? null,
        themes: updatedGame.themes ?? undefined,
        platforms: updatedGame.platforms ?? undefined,
        gameModes: updatedGame.gameModes ?? undefined,
        playerPerspectives: updatedGame.playerPerspectives ?? undefined,
        websites: updatedGame.websites ?? undefined,
        ageRatings: updatedGame.ageRatings ?? undefined,
        developers: updatedGame.developers ?? undefined,
        publishers: updatedGame.publishers ?? undefined,
        franchise: updatedGame.franchise ?? undefined,
        collection: updatedGame.collection ?? undefined,
        series: updatedGame.series ?? updatedGame.collection ?? undefined,
        screenshots: updatedGame.screenshots ?? undefined,
        videos: updatedGame.videos ?? undefined,
        gameEngines: updatedGame.gameEngines ?? undefined,
        keywords: updatedGame.keywords ?? undefined,
        alternativeNames: updatedGame.alternativeNames ?? undefined,
        similarGames: updatedGame.similarGames ?? undefined,
      };
      setGame(parsed);
    };
    window.addEventListener("gameUpdated", handleGameUpdated as EventListener);
    return () => {
      window.removeEventListener("gameUpdated", handleGameUpdated as EventListener);
    };
  }, [gameId]);

  useEffect(() => {
    if (gameId && gameId !== lastGameIdRef.current) {
      lastGameIdRef.current = gameId;
      fetchingGameRef.current = false; // Reset flag when gameId changes
      // Always fetch from API to get background field
      fetchGame(gameId);
    }
  }, [gameId]);

  async function fetchGame(gameId: string) {
    // Prevent multiple simultaneous calls for the same game
    if (fetchingGameRef.current) {
      return;
    }
    
    fetchingGameRef.current = true;
    setLoading(true);
    try {
      // Fetch single game from dedicated endpoint
        const url = buildApiUrlWithBase(`/games/${gameId}`);
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
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
        executables: found.executables || null,
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
        series: found.series ?? found.collection ?? null,
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
      fetchingGameRef.current = false; // Reset flag when done
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
