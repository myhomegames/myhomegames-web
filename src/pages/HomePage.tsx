import { useState, useEffect } from "react";
import LibrariesBar from "../components/layout/LibrariesBar";
import { useLoading } from "../contexts/LoadingContext";
import type { ViewMode } from "../types";
import LibraryPage from "./LibraryPage";
import RecommendedPage from "./RecommendedPage";
import CollectionsPage from "./CollectionsPage";
import DevelopersPage from "./DevelopersPage";
import PublishersPage from "./PublishersPage";
import TagListRoutePage from "./TagListRoutePage";
import type { GameItem, CategoryItem, GameLibrarySection, CollectionItem } from "../types";
import { API_BASE, getApiToken } from "../config";
import { buildApiHeaders } from "../utils/api";
import { buildLibrarySections, normalizeVisibleLibraries } from "../utils/librarySections";
import "./HomePage.css";

export type { GameItem, CategoryItem };

type HomePageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  onReloadMetadata?: () => Promise<void>;
  allCollections?: CollectionItem[];
};

export default function HomePage({
  onGameClick,
  onGamesLoaded,
  onPlay,
  onReloadMetadata,
  allCollections = [],
}: HomePageProps) {
  const { isLoading } = useLoading();
  const [libraries, setLibraries] = useState<GameLibrarySection[]>([]);
  const [activeLibrary, setActiveLibrary] = useState<GameLibrarySection | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [coverSize, setCoverSize] = useState(() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  });
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Function to save view mode for a library
  const saveViewModeForLibrary = (libraryKey: string, mode: ViewMode) => {
    localStorage.setItem(`viewMode_${libraryKey}`, mode);
  };

  // Function to load saved view mode for a library
  const loadViewModeForLibrary = (libraryKey: string): ViewMode => {
    const saved = localStorage.getItem(`viewMode_${libraryKey}`);
    return (saved as ViewMode) || "grid";
  };

  // Handler to change view mode (only for library)
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (activeLibrary && activeLibrary.key === "library") {
      saveViewModeForLibrary(activeLibrary.key, mode);
    }
  };

  // Handler to change cover size
  const handleCoverSizeChange = (size: number) => {
    setCoverSize(size);
    localStorage.setItem("coverSize", size.toString());
  };

  useEffect(() => {
    fetchLibraries();
  }, []);

  // Restore last selected library or auto-select first library when libraries are loaded
  useEffect(() => {
    if (libraries.length === 0) {
      return;
    }

    const savedLibraryKey = localStorage.getItem("lastSelectedLibrary");
    const currentIsValid = activeLibrary
      ? libraries.some((lib) => lib.key === activeLibrary.key)
      : false;
    const libraryToSelect = currentIsValid
      ? activeLibrary
      : savedLibraryKey
      ? libraries.find((lib) => lib.key === savedLibraryKey) || libraries[0]
      : libraries[0];

    if (!activeLibrary || activeLibrary.key !== libraryToSelect?.key) {
      setActiveLibrary(libraryToSelect);
    }
    if (libraryToSelect?.key) {
      localStorage.setItem("lastSelectedLibrary", libraryToSelect.key);
    }

    if (libraryToSelect?.key === "library") {
      const savedViewMode = loadViewModeForLibrary(libraryToSelect.key);
      setViewMode(savedViewMode);
    } else {
      setViewMode("grid");
    }
  }, [libraries, activeLibrary]);

  async function fetchLibraries() {
    setError(null);
    try {
      let visibleLibraries: string[] | null = null;
      const apiToken = getApiToken();

      if (API_BASE && apiToken) {
        try {
          const url = new URL("/settings", API_BASE);
          const res = await fetch(url.toString(), {
            headers: buildApiHeaders({ Accept: "application/json" }),
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.visibleLibraries)) {
              visibleLibraries = data.visibleLibraries;
              localStorage.setItem(
                "visibleLibraries",
                JSON.stringify(data.visibleLibraries)
              );
            }
          }
        } catch (err) {
          console.warn("Failed to load visible libraries from settings:", err);
        }
      }

      if (!visibleLibraries) {
        const stored = localStorage.getItem("visibleLibraries");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              visibleLibraries = parsed;
            }
          } catch {
            visibleLibraries = null;
          }
        }
      }

      const normalized = normalizeVisibleLibraries(visibleLibraries || []);
      const libs: GameLibrarySection[] = buildLibrarySections(normalized);
      setLibraries(libs);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      setError(errorMessage);
    }
  }


  function onSelectLibrary(s: GameLibrarySection) {
    localStorage.setItem("lastSelectedLibrary", s.key);
    setActiveLibrary(s);
    if (s.key === "library") {
      const savedViewMode = loadViewModeForLibrary(s.key);
      setViewMode(savedViewMode);
    } else {
      setViewMode("grid");
    }
  }

  function handleGameClick(game: GameItem | CategoryItem) {
    onGameClick(game as GameItem);
  }

  function handleGamesLoaded(loadedGames: GameItem[]) {
    onGamesLoaded(loadedGames);
  }

  return (
    <>
      <LibrariesBar
        libraries={libraries}
        activeLibrary={activeLibrary}
        onSelectLibrary={onSelectLibrary}
        loading={isLoading}
        error={error}
        coverSize={coverSize}
        onCoverSizeChange={handleCoverSizeChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onReloadMetadata={onReloadMetadata}
      />

      <div className="bg-[#1a1a1a] home-page-main-container">
        {!activeLibrary ? (
          <div className="flex items-center justify-center h-full">
          </div>
        ) : (
          <>
            {activeLibrary.key === "library" && (
              <LibraryPage
                onGameClick={handleGameClick}
                onGamesLoaded={handleGamesLoaded}
                onPlay={onPlay}
                coverSize={coverSize}
                viewMode={viewMode}
                allCollections={allCollections}
              />
            )}
            {activeLibrary.key === "recommended" && (
              <RecommendedPage
                onGameClick={handleGameClick}
                onGamesLoaded={handleGamesLoaded}
                onPlay={onPlay}
                coverSize={coverSize}
                allCollections={allCollections}
              />
            )}
            {activeLibrary.key === "collections" && (
              <CollectionsPage
                onPlay={onPlay}
                coverSize={coverSize}
              />
            )}
            {activeLibrary.key === "categories" && (
              <TagListRoutePage coverSize={coverSize} tagKey="categories" />
            )}
            {activeLibrary.key === "series" && (
              <TagListRoutePage coverSize={coverSize} tagKey="series" />
            )}
            {activeLibrary.key === "franchise" && (
              <TagListRoutePage coverSize={coverSize} tagKey="franchise" />
            )}
            {activeLibrary.key === "platforms" && (
              <TagListRoutePage coverSize={coverSize} tagKey="platforms" />
            )}
            {activeLibrary.key === "themes" && (
              <TagListRoutePage coverSize={coverSize} tagKey="themes" />
            )}
            {activeLibrary.key === "developers" && (
              <DevelopersPage coverSize={coverSize} />
            )}
            {activeLibrary.key === "publishers" && (
              <PublishersPage coverSize={coverSize} />
            )}
            {activeLibrary.key === "gameEngines" && (
              <TagListRoutePage coverSize={coverSize} tagKey="gameEngines" />
            )}
            {activeLibrary.key === "gameModes" && (
              <TagListRoutePage coverSize={coverSize} tagKey="gameModes" />
            )}
            {activeLibrary.key === "playerPerspectives" && (
              <TagListRoutePage coverSize={coverSize} tagKey="playerPerspectives" />
            )}
          </>
        )}
      </div>
    </>
  );
}
