import { useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useGameEvents } from "../hooks/useGameEvents";
import SearchResultsList from "../components/search/SearchResultsList";
import type { GameItem, CollectionItem } from "../types";
import "./SearchResultsPage.css";

type SearchResultsPageProps = {
  onGameClick: (game: GameItem) => void;
  onPlay?: (item: GameItem | CollectionItem) => void;
};

export default function SearchResultsPage({
  onGameClick,
  onPlay,
}: SearchResultsPageProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [gamesState, setGamesState] = useState<GameItem[]>([]);
  const [collectionsState, setCollectionsState] = useState<CollectionItem[]>([]);
  const [developersState, setDevelopersState] = useState<CollectionItem[]>([]);
  const [publishersState, setPublishersState] = useState<CollectionItem[]>([]);

  useScrollRestoration(scrollContainerRef);

  const { searchQuery, games, collections, developers, publishers } =
    (location.state as { searchQuery?: string; games?: GameItem[]; collections?: CollectionItem[]; developers?: CollectionItem[]; publishers?: CollectionItem[] }) || {};

  useLayoutEffect(() => {
    if (games) setGamesState(games);
    if (collections) setCollectionsState(collections);
    if (developers) setDevelopersState(developers);
    if (publishers) setPublishersState(publishers);
  }, [games, collections, developers, publishers]);

  // Listen for game events to update games state
  useGameEvents({ 
    setGames: setGamesState, 
    enabledEvents: ["gameUpdated", "gameDeleted"] 
  });

  // Sync gamesState with location.state when it changes (but not on initial load)
  useLayoutEffect(() => {
    if (location.state && typeof location.state === 'object' && gamesState.length > 0) {
      const currentState = location.state as { games?: GameItem[]; collections?: CollectionItem[]; searchQuery?: string };
      const currentGames = currentState.games || [];
      // Only update if gamesState is different from current location.state games
      if (currentGames.length !== gamesState.length || 
          currentGames.some((g, i) => String(g.id) !== String(gamesState[i]?.id) || g.title !== gamesState[i]?.title)) {
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
        String(game.id) === String(updatedGame.id) ? updatedGame : game
      )
    );
    // Update location state as well
    if (location.state && typeof location.state === 'object') {
      const currentState = location.state as { games?: GameItem[]; collections?: CollectionItem[]; searchQuery?: string };
      const updatedGames = (currentState.games || []).map((game) =>
        String(game.id) === String(updatedGame.id) ? updatedGame : game
      );
      navigate(location.pathname, {
        state: { ...currentState, games: updatedGames },
        replace: true,
      });
    }
  };

  const handleGameDelete = (deletedGame: GameItem) => {
    setGamesState((prevGames) =>
      prevGames.filter((game) => String(game.id) !== String(deletedGame.id))
    );
    // Update location state as well
    if (location.state && typeof location.state === 'object') {
      const currentState = location.state as { games?: GameItem[]; collections?: CollectionItem[]; searchQuery?: string };
      const updatedGames = (currentState.games || []).filter((game) =>
        String(game.id) !== String(deletedGame.id)
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
        collection.id === updatedCollection.id ? updatedCollection : collection
      )
    );
    // Update location state as well
    if (location.state && typeof location.state === 'object') {
      const currentState = location.state as { games?: GameItem[]; collections?: CollectionItem[]; searchQuery?: string };
      const updatedCollections = (currentState.collections || []).map((collection) =>
        collection.id === updatedCollection.id ? updatedCollection : collection
      );
      navigate(location.pathname, {
        state: { ...currentState, collections: updatedCollections },
        replace: true,
      });
    }
  };

  // Check if we came from game detail page and should redirect
  useLayoutEffect(() => {
    const savedFrom = sessionStorage.getItem("gameDetailFrom");
    // If we have a saved "from" that's not search-results, and we don't have search state,
    // redirect to the saved location
    if (!searchQuery && savedFrom && savedFrom !== "/search-results") {
      sessionStorage.removeItem("gameDetailFrom");
      navigate(savedFrom, { replace: true });
    }
  }, [searchQuery, navigate]);

  useLayoutEffect(() => {
    if (gamesState.length > 0 || collectionsState.length > 0 || developersState.length > 0 || publishersState.length > 0) {
      // Wait for next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    } else {
      setIsReady(false);
    }
  }, [gamesState, collectionsState, developersState, publishersState]);

  if (!searchQuery || searchQuery.trim().length < 2) {
    return (
      <div className="bg-[#1a1a1a] text-white flex items-center justify-center search-results-page-empty">
        <div className="text-center">
          <div className="text-gray-400">
            {!searchQuery 
              ? t("searchResults.noResults")
              : t("search.minimumCharacters", "Please enter at least 2 characters to search")
            }
          </div>
        </div>
      </div>
    );
  }

  const totalResults = gamesState.length + collectionsState.length + developersState.length + publishersState.length;
  if (totalResults === 0) {
    return (
      <div className="bg-[#1a1a1a] text-white search-results-page">
        <div className="search-results-header">
          <div className="search-results-header-content">
            <div className="search-results-title">
              {t("searchResults.title", { query: searchQuery })}
            </div>
          </div>
        </div>
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
  }

  return (
    <div 
      className="bg-[#1a1a1a] text-white search-results-page"
      style={{
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      <div className="search-results-header">
        <div className="search-results-header-content">
          <div className="search-results-title">
            {t("searchResults.title", { query: searchQuery })}
          </div>
          <div className="search-results-count">
            {t("searchResults.foundGames", { count: totalResults })}
          </div>
        </div>
      </div>
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
}
