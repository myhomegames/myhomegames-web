import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCollections } from "../../contexts/CollectionsContext";
import { useDevelopers } from "../../contexts/DevelopersContext";
import { usePublishers } from "../../contexts/PublishersContext";
import { useLibraryGames } from "../../contexts/LibraryGamesContext";
import { useGameEvents } from "../../hooks/useGameEvents";
import type { CollectionItem, GameItem } from "../../types";
import {
  filterSearchCatalog,
  loadLastSearchQuery,
  loadRecentSearches,
  MIN_SEARCH_QUERY_LENGTH,
  removeRecentSearch,
  saveLastSearchQuery,
  saveRecentSearch,
  type SearchCatalogHit,
} from "../../utils/searchCatalog";
import SearchResultsList from "./SearchResultsList";
import TvOnScreenKeyboard from "./TvOnScreenKeyboard";

type TvSearchPageProps = {
  onGameClick: (game: GameItem) => void;
  onPlay?: (item: GameItem | CollectionItem) => void;
};

type RouteSearchState = {
  searchQuery?: string;
  games?: GameItem[];
  collections?: CollectionItem[];
  developers?: CollectionItem[];
  publishers?: CollectionItem[];
};

function hitsSignature(hits: SearchCatalogHit): string {
  return [
    hits.searchQuery,
    hits.games.map((g) => g.id).join(","),
    hits.collections.map((c) => c.id).join(","),
    hits.developers.map((d) => d.id).join(","),
    hits.publishers.map((p) => p.id).join(","),
  ].join("|");
}

export default function TvSearchPage({ onGameClick, onPlay }: TvSearchPageProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { games: allGames } = useLibraryGames();
  const { collections: allCollections } = useCollections();
  const { developers: allDevelopers } = useDevelopers();
  const { publishers: allPublishers } = usePublishers();
  const queryBoxRef = useRef<HTMLButtonElement>(null);
  const lastNavSignatureRef = useRef<string>("");

  const routeState = (location.state as RouteSearchState | null) || {};
  const [query, setQuery] = useState(() => {
    const fromRoute =
      typeof routeState.searchQuery === "string" ? routeState.searchQuery : "";
    return fromRoute;
  });
  const [recentSearches, setRecentSearches] = useState(() => loadRecentSearches());
  const [gamesState, setGamesState] = useState<GameItem[]>(() => routeState.games || []);
  const [collectionsState, setCollectionsState] = useState<CollectionItem[]>(
    () => routeState.collections || [],
  );
  const [developersState, setDevelopersState] = useState<CollectionItem[]>(
    () => routeState.developers || [],
  );
  const [publishersState, setPublishersState] = useState<CollectionItem[]>(
    () => routeState.publishers || [],
  );
  const [resultsLabelQuery, setResultsLabelQuery] = useState(
    () =>
      (typeof routeState.searchQuery === "string" && routeState.searchQuery.trim()) ||
      loadLastSearchQuery(),
  );
  const [showingLastResults, setShowingLastResults] = useState(false);

  useGameEvents({
    setGames: setGamesState,
    enabledEvents: ["gameUpdated", "gameDeleted"],
  });

  useLayoutEffect(() => {
    queryBoxRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    let hits: SearchCatalogHit;
    let asLast = false;

    if (trimmed.length >= MIN_SEARCH_QUERY_LENGTH) {
      hits = filterSearchCatalog(
        trimmed,
        allGames,
        allCollections,
        allDevelopers,
        allPublishers,
      );
    } else {
      const last = loadLastSearchQuery();
      if (last.length >= MIN_SEARCH_QUERY_LENGTH) {
        hits = filterSearchCatalog(
          last,
          allGames,
          allCollections,
          allDevelopers,
          allPublishers,
        );
        asLast = true;
      } else {
        hits = {
          searchQuery: trimmed,
          games: [],
          collections: [],
          developers: [],
          publishers: [],
        };
      }
    }

    setGamesState(hits.games);
    setCollectionsState(hits.collections);
    setDevelopersState(hits.developers);
    setPublishersState(hits.publishers);
    setResultsLabelQuery(hits.searchQuery);
    setShowingLastResults(asLast);

    const signature = `${asLast ? "last" : "live"}:${hitsSignature(hits)}`;
    if (signature !== lastNavSignatureRef.current) {
      lastNavSignatureRef.current = signature;
      navigate("/search-results", {
        replace: true,
        state: {
          searchQuery: trimmed,
          games: hits.games,
          collections: hits.collections,
          developers: hits.developers,
          publishers: hits.publishers,
        },
      });
    }

    if (trimmed.length < MIN_SEARCH_QUERY_LENGTH) return;

    const timer = window.setTimeout(() => {
      saveLastSearchQuery(trimmed);
      setRecentSearches(saveRecentSearch(trimmed));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [query, allGames, allCollections, allDevelopers, allPublishers, navigate]);

  const totalResults =
    gamesState.length +
    collectionsState.length +
    developersState.length +
    publishersState.length;

  const handleGameUpdate = (updatedGame: GameItem) => {
    setGamesState((prev) =>
      prev.map((game) =>
        String(game.id) === String(updatedGame.id) ? updatedGame : game,
      ),
    );
  };

  const handleGameDelete = (deletedGame: GameItem) => {
    setGamesState((prev) =>
      prev.filter((game) => String(game.id) !== String(deletedGame.id)),
    );
  };

  const handleCollectionUpdate = (updatedCollection: CollectionItem) => {
    setCollectionsState((prev) =>
      prev.map((collection) =>
        collection.id === updatedCollection.id ? updatedCollection : collection,
      ),
    );
  };

  const resultsTitle = useMemo(() => {
    if (!resultsLabelQuery) return t("searchResults.noResults");
    if (showingLastResults && query.trim().length < MIN_SEARCH_QUERY_LENGTH) {
      return t("search.lastResults", 'Last results: "{{query}}"', {
        query: resultsLabelQuery,
      });
    }
    return t("searchResults.title", { query: resultsLabelQuery });
  }, [query, resultsLabelQuery, showingLastResults, t]);

  return (
    <div className="tv-search-page" data-mhg-tv-search-page>
      <div className="tv-search-page-left">
        <button
          ref={queryBoxRef}
          type="button"
          className="tv-search-query-box"
          data-mhg-tv-focus
          aria-label={t("search.placeholder")}
          onClick={() => queryBoxRef.current?.focus()}
        >
          <span
            className={`tv-search-query-text${query ? "" : " tv-search-query-text--placeholder"}`}
          >
            {query || t("search.placeholder")}
          </span>
        </button>

        <TvOnScreenKeyboard
          onChar={(char) => setQuery((prev) => `${prev}${char}`)}
          onBackspace={() => setQuery((prev) => prev.slice(0, -1))}
          onClear={() => setQuery("")}
          onSpace={() => setQuery((prev) => `${prev} `)}
        />

        <div className="tv-search-recent">
          <div className="tv-search-recent-title">{t("search.recentSearches")}</div>
          {recentSearches.length === 0 ? (
            <div className="tv-search-recent-empty">{t("searchResults.noResults")}</div>
          ) : (
            <ul className="tv-search-recent-list">
              {recentSearches.map((recent) => (
                <li key={recent} className="tv-search-recent-item">
                  <button
                    type="button"
                    className="tv-search-recent-button"
                    data-mhg-tv-focus
                    onClick={() => setQuery(recent)}
                  >
                    {recent}
                  </button>
                  <button
                    type="button"
                    className="tv-search-recent-remove"
                    data-mhg-tv-focus
                    aria-label={t("search.removeRecent", "Remove")}
                    onClick={() => setRecentSearches(removeRecentSearch(recent))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="tv-search-page-right">
        <div className="tv-search-results-header">
          <div className="tv-search-results-title">{resultsTitle}</div>
          {totalResults > 0 ? (
            <div className="tv-search-results-count">
              {t("searchResults.foundGames", { count: totalResults })}
            </div>
          ) : null}
        </div>
        <div className="tv-search-results-scroll">
          {totalResults === 0 ? (
            <div className="tv-search-results-empty">
              <div className="tv-search-results-empty-message">
                {query.trim().length > 0 &&
                query.trim().length < MIN_SEARCH_QUERY_LENGTH
                  ? t(
                      "search.minimumCharacters",
                      "Please enter at least 2 characters to search",
                    )
                  : t("searchResults.noResultsFound")}
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
