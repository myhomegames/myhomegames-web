import { useMemo, type Dispatch, type SetStateAction } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import LibrariesBar from "../components/layout/LibrariesBar";
import { useSkin } from "../contexts/SkinContext";
import type { CollectionItem, GameItem, GameLibrarySection, ViewMode } from "../types";
import { useLibrariesShellState } from "./useLibrariesShellState";

function activeCollectionShortcutIdFromPathname(pathname: string): string | null {
  const prefix = "/collections/";
  if (!pathname.startsWith(prefix)) return null;
  const segment = pathname.slice(prefix.length).split("/")[0];
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export type MainAppOutletContext = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  onReloadMetadata?: () => Promise<void>;
  allCollections: CollectionItem[];
  activeLibrary: GameLibrarySection | null;
  coverSize: number;
  viewMode: ViewMode;
  mainGamesOnly: boolean;
  setMainGamesOnly: Dispatch<SetStateAction<boolean>>;
};

export type MainAppLayoutProps = {
  onPlay: (game: GameItem) => void;
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onReloadMetadata: () => Promise<void>;
  allCollections: CollectionItem[];
  allGames: GameItem[];
  allDevelopers: CollectionItem[];
  allPublishers: CollectionItem[];
  onGameSelect: (game: GameItem) => void;
  onSettingsClick: () => void;
  onAddGameClick: () => void;
};

export default function MainAppLayout({
  onPlay,
  onGameClick,
  onGamesLoaded,
  onReloadMetadata,
  allCollections,
  allGames,
  allDevelopers,
  allPublishers,
  onGameSelect,
  onSettingsClick,
  onAddGameClick,
}: MainAppLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { activeSkinWeb } = useSkin();
  const {
    libraries,
    activeLibrary,
    error,
    isLoading,
    coverSize,
    handleCoverSizeChange,
    viewMode,
    handleViewModeChange,
    mainGamesOnly,
    setMainGamesOnly,
    onSelectLibrary,
  } = useLibrariesShellState({
    syncCoverSizeWithPathname: true,
    navigateHomeWhenLibraryChanges: true,
  });

  const outletContext = useMemo<MainAppOutletContext>(
    () => ({
      onGameClick,
      onGamesLoaded,
      onPlay,
      onReloadMetadata,
      allCollections,
      activeLibrary,
      coverSize,
      viewMode,
      mainGamesOnly,
      setMainGamesOnly,
    }),
    [
      onGameClick,
      onGamesLoaded,
      onPlay,
      onReloadMetadata,
      allCollections,
      activeLibrary,
      coverSize,
      viewMode,
      mainGamesOnly,
    ]
  );

  return (
    <>
      <Header
        onPlay={onPlay}
        allGames={allGames}
        allCollections={allCollections}
        allDevelopers={allDevelopers}
        allPublishers={allPublishers}
        onGameSelect={onGameSelect}
        onHomeClick={() => navigate("/")}
        onSettingsClick={onSettingsClick}
        onAddGameClick={onAddGameClick}
      />
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
        showMainGamesToggle={
          activeLibrary?.key === "library" && (viewMode === "grid" || viewMode === "detail")
        }
        mainGamesOnly={mainGamesOnly}
        onMainGamesOnlyChange={setMainGamesOnly}
        collectionShortcuts={
          activeSkinWeb.collectionsShortcutList
            ? allCollections.map((c) => ({ id: c.id, title: c.title }))
            : []
        }
        onSelectCollectionShortcut={
          activeSkinWeb.collectionsShortcutList
            ? (collectionId) =>
                navigate(`/collections/${encodeURIComponent(collectionId)}`)
            : undefined
        }
        activeCollectionShortcutId={
          activeSkinWeb.collectionsShortcutList
            ? activeCollectionShortcutIdFromPathname(pathname)
            : null
        }
      />
      <Outlet context={outletContext} />
    </>
  );
}
