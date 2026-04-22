import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LibrariesBar from "../components/layout/LibrariesBar";
import { useLoading } from "../contexts/LoadingContext";
import { useSkin } from "../contexts/SkinContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import { useDevelopers } from "../contexts/DevelopersContext";
import { usePublishers } from "../contexts/PublishersContext";
import type { ViewMode } from "../types";
import LibraryPage from "./LibraryPage";
import RecommendedPage from "./RecommendedPage";
import CollectionsPage from "./CollectionsPage";
import DevelopersPage from "./DevelopersPage";
import PublishersPage from "./PublishersPage";
import TagListRoutePage from "./TagListRoutePage";
import type { GameItem, TagItem, GameLibrarySection, CollectionItem } from "../types";
import { API_BASE } from "../config";
import { buildApiHeaders } from "../utils/api";
import { buildLibrarySections, normalizeVisibleLibraries } from "../utils/librarySections";
export type { GameItem, TagItem };

type HomePageClassicProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  onReloadMetadata?: () => Promise<void>;
  allCollections?: CollectionItem[];
  onOpenCollection?: (collectionId: string) => void;
};

/** Home with libraries bar inline (skins without `persistentLibraryShell`). */
export default function HomePageClassic({
  onGameClick,
  onGamesLoaded,
  onPlay,
  onReloadMetadata,
  allCollections = [],
  onOpenCollection,
}: HomePageClassicProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeSkinWeb } = useSkin();
  const { isLoading } = useLoading();
  const { games: allGamesForSearch } = useLibraryGames();
  const { developers: allDevelopersForSearch } = useDevelopers();
  const { publishers: allPublishersForSearch } = usePublishers();
  const [libraries, setLibraries] = useState<GameLibrarySection[]>(() =>
    buildLibrarySections(normalizeVisibleLibraries([]))
  );
  const [activeLibrary, setActiveLibrary] = useState<GameLibrarySection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverSize, setCoverSize] = useState(() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  });
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mainGamesOnly, setMainGamesOnly] = useState<boolean>(() => {
    return localStorage.getItem("libraryMainGamesOnly") === "true";
  });

  useEffect(() => {
    localStorage.setItem("libraryMainGamesOnly", String(mainGamesOnly));
  }, [mainGamesOnly]);

  const saveViewModeForLibrary = (libraryKey: string, mode: ViewMode) => {
    localStorage.setItem(`viewMode_${libraryKey}`, mode);
  };

  const loadViewModeForLibrary = (libraryKey: string): ViewMode => {
    const saved = localStorage.getItem(`viewMode_${libraryKey}`);
    return (saved as ViewMode) || "grid";
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (activeLibrary && activeLibrary.key === "library") {
      saveViewModeForLibrary(activeLibrary.key, mode);
    }
  };

  const handleCoverSizeChange = (size: number) => {
    setCoverSize(size);
    localStorage.setItem("coverSize", size.toString());
  };

  useEffect(() => {
    fetchLibraries();
  }, []);

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

      if (API_BASE) {
        try {
          const url = new URL("/settings", API_BASE);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);
          const res = await fetch(url.toString(), {
            headers: buildApiHeaders({ Accept: "application/json" }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.visibleLibraries)) {
              visibleLibraries = data.visibleLibraries;
              localStorage.setItem("visibleLibraries", JSON.stringify(data.visibleLibraries));
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
      setLibraries(buildLibrarySections(normalized));
    } catch (err: unknown) {
      setError(String(err instanceof Error ? err.message : err));
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

  function handleGameClick(game: GameItem | TagItem) {
    onGameClick(game as GameItem);
  }

  function handleGamesLoaded(loadedGames: GameItem[]) {
    onGamesLoaded(loadedGames);
  }

  const collectionsPageEnabled = libraries.some((lib) => lib.key === "collections");
  const showCollectionShortcuts =
    activeSkinWeb.collectionsShortcutList && collectionsPageEnabled;

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
        showMainGamesToggle={activeLibrary?.key === "library" && (viewMode === "grid" || viewMode === "detail")}
        mainGamesOnly={mainGamesOnly}
        onMainGamesOnlyChange={setMainGamesOnly}
        collectionShortcuts={
          showCollectionShortcuts
            ? allCollections.map((collection) => ({
                id: collection.id,
                title: collection.title,
              }))
            : []
        }
        onSelectCollectionShortcut={
          showCollectionShortcuts ? onOpenCollection : undefined
        }
        sidebarSearchGames={allGamesForSearch}
        sidebarSearchCollections={allCollections}
        sidebarSearchDevelopers={allDevelopersForSearch}
        sidebarSearchPublishers={allPublishersForSearch}
        onSidebarSearchGameSelect={(game) =>
          navigate(`/game/${game.id}`, {
            state: { from: location.pathname + location.search },
          })
        }
        onSidebarSearchPlay={onPlay}
      />

      <div className="bg-[#1a1a1a] home-page-main-container">
        {!activeLibrary ? (
          <div className="flex items-center justify-center h-full" />
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
                mainGamesOnly={mainGamesOnly}
                setMainGamesOnly={setMainGamesOnly}
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
              <CollectionsPage onPlay={onPlay} coverSize={coverSize} />
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
              <DevelopersPage onPlay={onPlay} coverSize={coverSize} />
            )}
            {activeLibrary.key === "publishers" && (
              <PublishersPage onPlay={onPlay} coverSize={coverSize} />
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
