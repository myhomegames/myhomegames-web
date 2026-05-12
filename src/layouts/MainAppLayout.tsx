import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import LibrariesBar from "../components/layout/LibrariesBar";
import { useSkin } from "../contexts/SkinContext";
import { TopDockSlotProvider } from "../contexts/TopDockSlotContext";
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
  setTopBarBeforeMainGamesActions: Dispatch<SetStateAction<ReactNode | null>>;
  setTopBarRightActions: Dispatch<SetStateAction<ReactNode | null>>;
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

  const [topBarBeforeMainGamesActions, setTopBarBeforeMainGamesActions] = useState<ReactNode | null>(
    null
  );
  const [topBarRightActions, setTopBarRightActions] = useState<ReactNode | null>(null);
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

  const collectionsPageEnabled = libraries.some((lib) => lib.key === "collections");
  const showCollectionShortcuts =
    activeSkinWeb.collectionsShortcutList && collectionsPageEnabled;
  /*
   * Collection-like detail pages (/collections/:id, /developers/:id, /publishers/:id) hide
   * their own in-page LibrariesBar under the persistent shell, so the MainGamesToggle must
   * be exposed by the shell bar too. Without this, users landing on a detail from a
   * non-library page (e.g. Collections → detail) would never see the toggle.
   */
  const isCollectionLikeDetailRoute = useMemo(
    () =>
      /^\/collections\/[^/]+/.test(pathname) ||
      /^\/developers\/[^/]+/.test(pathname) ||
      /^\/publishers\/[^/]+/.test(pathname),
    [pathname]
  );
  const isTagGamesDetailRoute = useMemo(
    () =>
      /^\/category\/[^/]+/.test(pathname) ||
      /^\/series\/[^/]+/.test(pathname) ||
      /^\/franchise\/[^/]+/.test(pathname) ||
      /^\/platforms\/[^/]+/.test(pathname) ||
      /^\/themes\/[^/]+/.test(pathname) ||
      /^\/game-engines\/[^/]+/.test(pathname) ||
      /^\/game-modes\/[^/]+/.test(pathname) ||
      /^\/player-perspectives\/[^/]+/.test(pathname) ||
      /^\/keywords\/[^/]+/.test(pathname),
    [pathname]
  );

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
      setTopBarBeforeMainGamesActions,
      setTopBarRightActions,
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
      setTopBarBeforeMainGamesActions,
      setTopBarRightActions,
    ]
  );

  return (
    <TopDockSlotProvider>
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
        registerTopDockSlot
        libraries={libraries}
        activeLibrary={activeLibrary}
        onSelectLibrary={onSelectLibrary}
        loading={isLoading}
        error={error}
        coverSize={coverSize}
        onCoverSizeChange={
          activeSkinWeb.persistentLibraryShell && isTagGamesDetailRoute
            ? undefined
            : handleCoverSizeChange
        }
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onReloadMetadata={onReloadMetadata}
        onAddGameClick={onAddGameClick}
        showMainGamesToggle={
          (activeLibrary?.key === "library" || isCollectionLikeDetailRoute) &&
          (viewMode === "grid" || viewMode === "detail")
        }
        mainGamesOnly={mainGamesOnly}
        onMainGamesOnlyChange={setMainGamesOnly}
        rightActionsBeforeMainGames={topBarBeforeMainGamesActions}
        rightActions={
          <>
            {topBarRightActions}
          </>
        }
        collectionShortcuts={
          showCollectionShortcuts
            ? allCollections.map((c) => ({ id: c.id, title: c.title }))
            : []
        }
        onSelectCollectionShortcut={
          showCollectionShortcuts
            ? (collectionId) =>
                navigate(`/collections/${encodeURIComponent(collectionId)}`)
            : undefined
        }
        activeCollectionShortcutId={
          showCollectionShortcuts ? activeCollectionShortcutIdFromPathname(pathname) : null
        }
        sidebarSearchGames={allGames}
        sidebarSearchCollections={allCollections}
        sidebarSearchDevelopers={allDevelopers}
        sidebarSearchPublishers={allPublishers}
        onSidebarSearchGameSelect={onGameSelect}
        onSidebarSearchPlay={onPlay}
      />
      <Outlet context={outletContext} />
    </TopDockSlotProvider>
  );
}
