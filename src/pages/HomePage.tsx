import { useState, useEffect } from "react";
import LibrariesBar from "../components/layout/LibrariesBar";
import { useLoading } from "../contexts/LoadingContext";
import type { ViewMode } from "../types";
import LibraryPage from "./LibraryPage";
import RecommendedPage from "./RecommendedPage";
import CollectionsPage from "./CollectionsPage";
import CategoriesPage from "./CategoriesPage";
import type { GameItem, CategoryItem, GameLibrarySection, CollectionItem } from "../types";
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
    if (libraries.length > 0 && !activeLibrary) {
      const savedLibraryKey = localStorage.getItem("lastSelectedLibrary");
      const libraryToSelect = savedLibraryKey
        ? libraries.find((lib) => lib.key === savedLibraryKey) || libraries[0]
        : libraries[0];

      setActiveLibrary(libraryToSelect);
      if (libraryToSelect.key === "library") {
        const savedViewMode = loadViewModeForLibrary(libraryToSelect.key);
        setViewMode(savedViewMode);
      } else {
        setViewMode("grid");
      }
    }
  }, [libraries]);

  async function fetchLibraries() {
    setError(null);
    try {
      // Libraries are now hardcoded, no need to fetch from server
      const libs: GameLibrarySection[] = [
        { key: "recommended", type: "games" },
        { key: "library", type: "games" },
        { key: "collections", type: "collections" },
        { key: "categories", type: "games" },
      ];
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
              <CategoriesPage
                coverSize={coverSize}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
