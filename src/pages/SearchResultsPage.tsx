import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LibrariesBar from "../components/layout/LibrariesBar";
import { TopDockSlotProvider } from "../contexts/TopDockSlotContext";
import { useCollections } from "../contexts/CollectionsContext";
import { useDevelopers } from "../contexts/DevelopersContext";
import { usePublishers } from "../contexts/PublishersContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import { useLoading } from "../contexts/LoadingContext";
import { useSkin } from "../contexts/SkinContext";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useGameEvents } from "../hooks/useGameEvents";
import { useLibrariesShellState } from "../layouts/useLibrariesShellState";
import SearchResultsList from "../components/search/SearchResultsList";
import type { GameItem, CollectionItem } from "../types";

type SearchResultsPageProps = {
  onGameClick: (game: GameItem) => void;
  onPlay?: (item: GameItem | CollectionItem) => void;
  onAddGameClick?: () => void;
};

export default function SearchResultsPage({
  onGameClick,
  onPlay,
  onAddGameClick,
}: SearchResultsPageProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeSkinWeb } = useSkin();
  const { isLoading } = useLoading();
  const { games: allGamesForSearch } = useLibraryGames();
  const { collections: allCollections } = useCollections();
  const { developers: allDevelopersForSearch } = useDevelopers();
  const { publishers: allPublishersForSearch } = usePublishers();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [gamesState, setGamesState] = useState<GameItem[]>([]);
  const [collectionsState, setCollectionsState] = useState<CollectionItem[]>([]);
  const [developersState, setDevelopersState] = useState<CollectionItem[]>([]);
  const [publishersState, setPublishersState] = useState<CollectionItem[]>([]);

  const {
    libraries,
    activeLibrary,
    error,
    coverSize,
    handleCoverSizeChange,
    viewMode,
    handleViewModeChange,
    mainGamesOnly,
    setMainGamesOnly,
    onSelectLibrary,
  } = useLibrariesShellState({
    syncCoverSizeWithPathname: false,
    navigateHomeWhenLibraryChanges: true,
  });

  const collectionsPageEnabled = libraries.some((lib) => lib.key === "collections");
  const showCollectionShortcuts =
    activeSkinWeb.collectionsShortcutList && collectionsPageEnabled;

  /** PS3: dock + library bar on this route. Plex and other skins keep the classic full-page layout. */
  const useLibrariesShellOnSearchResults = activeSkinWeb.topRightToolDock;
  const pageSurfaceClass = useLibrariesShellOnSearchResults ? "" : "bg-[#1a1a1a] ";

  useScrollRestoration(scrollContainerRef);

  const { searchQuery, games, collections, developers, publishers } =
    (location.state as {
      searchQuery?: string;
      games?: GameItem[];
      collections?: CollectionItem[];
      developers?: CollectionItem[];
      publishers?: CollectionItem[];
    }) || {};

  useLayoutEffect(() => {
    if (games) setGamesState(games);
    if (collections) setCollectionsState(collections);
    if (developers) setDevelopersState(developers);
    if (publishers) setPublishersState(publishers);
  }, [games, collections, developers, publishers]);

  useGameEvents({
    setGames: setGamesState,
    enabledEvents: ["gameUpdated", "gameDeleted"],
  });

  useLayoutEffect(() => {
    if (location.state && typeof location.state === "object" && gamesState.length > 0) {
      const currentState = location.state as {
        games?: GameItem[];
        collections?: CollectionItem[];
        searchQuery?: string;
      };
      const currentGames = currentState.games || [];
      if (
        currentGames.length !== gamesState.length ||
        currentGames.some(
          (g, i) =>
            String(g.id) !== String(gamesState[i]?.id) || g.title !== gamesState[i]?.title,
        )
      ) {
        navigate(location.pathname, {
          state: { ...currentState, games: gamesState },
          replace: true,
        });
      }
    }
  }, [gamesState, location.pathname, navigate]);

  const handleGameUpdate = (updatedGame: GameItem) => {
    setGamesState((prevGames) =>
      prevGames.map((game) =>
        String(game.id) === String(updatedGame.id) ? updatedGame : game,
      ),
    );
    if (location.state && typeof location.state === "object") {
      const currentState = location.state as {
        games?: GameItem[];
        collections?: CollectionItem[];
        searchQuery?: string;
      };
      const updatedGames = (currentState.games || []).map((game) =>
        String(game.id) === String(updatedGame.id) ? updatedGame : game,
      );
      navigate(location.pathname, {
        state: { ...currentState, games: updatedGames },
        replace: true,
      });
    }
  };

  const handleGameDelete = (deletedGame: GameItem) => {
    setGamesState((prevGames) =>
      prevGames.filter((game) => String(game.id) !== String(deletedGame.id)),
    );
    if (location.state && typeof location.state === "object") {
      const currentState = location.state as {
        games?: GameItem[];
        collections?: CollectionItem[];
        searchQuery?: string;
      };
      const updatedGames = (currentState.games || []).filter(
        (game) => String(game.id) !== String(deletedGame.id),
      );
      navigate(location.pathname, {
        state: { ...currentState, games: updatedGames },
        replace: true,
      });
    }
  };

  const handleCollectionUpdate = (updatedCollection: CollectionItem) => {
    setCollectionsState((prevCollections) =>
      prevCollections.map((collection) =>
        collection.id === updatedCollection.id ? updatedCollection : collection,
      ),
    );
    if (location.state && typeof location.state === "object") {
      const currentState = location.state as {
        games?: GameItem[];
        collections?: CollectionItem[];
        searchQuery?: string;
      };
      const updatedCollections = (currentState.collections || []).map((collection) =>
        collection.id === updatedCollection.id ? updatedCollection : collection,
      );
      navigate(location.pathname, {
        state: { ...currentState, collections: updatedCollections },
        replace: true,
      });
    }
  };

  useLayoutEffect(() => {
    const savedFrom = sessionStorage.getItem("gameDetailFrom");
    if (!searchQuery && savedFrom && savedFrom !== "/search-results") {
      sessionStorage.removeItem("gameDetailFrom");
      navigate(savedFrom, { replace: true });
    }
  }, [searchQuery, navigate]);

  useLayoutEffect(() => {
    if (
      gamesState.length > 0 ||
      collectionsState.length > 0 ||
      developersState.length > 0 ||
      publishersState.length > 0
    ) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    } else {
      setIsReady(false);
    }
  }, [gamesState, collectionsState, developersState, publishersState]);

  const renderSearchResultsHeader = (options?: { showCount?: boolean; count?: number }) => (
    <div className="search-results-header">
      <div className="search-results-header-content">
        <div className="search-results-title">
          {t("searchResults.title", { query: searchQuery })}
        </div>
        {options?.showCount && options.count != null ? (
          <div className="search-results-count">
            {t("searchResults.foundGames", { count: options.count })}
          </div>
        ) : null}
      </div>
    </div>
  );

  const wrapPage = (content: ReactNode, options?: { betweenDockAndStrip?: ReactNode }) => {
    if (useLibrariesShellOnSearchResults) {
      return (
        <TopDockSlotProvider>
          <div className="search-results-shell">
            <LibrariesBar
              registerTopDockSlot
              betweenDockAndStrip={options?.betweenDockAndStrip}
              libraries={libraries}
              activeLibrary={activeLibrary}
              onSelectLibrary={onSelectLibrary}
              loading={isLoading}
              error={error}
              coverSize={coverSize}
              onCoverSizeChange={handleCoverSizeChange}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              showMainGamesToggle={false}
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
                showCollectionShortcuts
                  ? (collectionId) =>
                      navigate(`/collections/${encodeURIComponent(collectionId)}`)
                  : undefined
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
              onAddGameClick={onAddGameClick}
            />
            {content}
          </div>
        </TopDockSlotProvider>
      );
    }

    return content;
  };

  if (!searchQuery || searchQuery.trim().length < 2) {
    return wrapPage(
      <div
        className={`${pageSurfaceClass}text-white flex items-center justify-center search-results-page-empty`}
      >
        <div className="text-center">
          <div className="text-gray-400">
            {!searchQuery
              ? t("searchResults.noResults")
              : t("search.minimumCharacters", "Please enter at least 2 characters to search")}
          </div>
        </div>
      </div>,
    );
  }

  const totalResults =
    gamesState.length +
    collectionsState.length +
    developersState.length +
    publishersState.length;

  if (totalResults === 0) {
    const emptyPage = (
      <div className={`${pageSurfaceClass}text-white search-results-page`}>
        {!useLibrariesShellOnSearchResults ? renderSearchResultsHeader() : null}
        <div className="search-results-content">
          <div className="search-results-content-inner">
            <div className="search-results-empty">
              <div className="search-results-empty-icon">
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="8"
                    stroke="#E5A00D"
                    strokeWidth="2.5"
                    fill="none"
                  />
                  <path
                    d="m20 20-4.5-4.5"
                    stroke="#000000"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="search-results-empty-message">
                {t("searchResults.noResultsFound")}
              </div>
              <div className="search-results-empty-hint">
                {t("searchResults.tryModifyingSearch")}
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    return wrapPage(emptyPage, {
      betweenDockAndStrip: renderSearchResultsHeader(),
    });
  }

  const resultsPage = (
    <div
      className={`${pageSurfaceClass}text-white search-results-page search-results-page--fade${isReady ? " search-results-page--fade-ready" : ""}`}
    >
      {!useLibrariesShellOnSearchResults
        ? renderSearchResultsHeader({ showCount: true, count: totalResults })
        : null}
      <div ref={scrollContainerRef} className="search-results-content">
        <div className="search-results-content-inner">
          <SearchResultsList
            games={gamesState}
            collections={collectionsState}
            developers={developersState}
            publishers={publishersState}
            onGameClick={onGameClick}
            onPlay={onPlay}
            onGameUpdate={handleGameUpdate}
            onGameDelete={handleGameDelete}
            onCollectionUpdate={handleCollectionUpdate}
          />
        </div>
      </div>
    </div>
  );

  return wrapPage(resultsPage, {
    betweenDockAndStrip: renderSearchResultsHeader({ showCount: true, count: totalResults }),
  });
}
