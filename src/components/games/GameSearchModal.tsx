import { useState, useMemo, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLibraryGames } from "../../contexts/LibraryGamesContext";
import { useSettings } from "../../contexts/SettingsContext";
import Cover from "./Cover";
import type { CatalogGame, GameItem } from "../../types";
import { formatCatalogGameDate } from "../../utils/date";
import { displayGameType } from "../../utils/gameType";
import { isIgdbSearchQueryReady, searchIgdbGames } from "../../utils/igdbSearch";

export type GameSearchSelection = {
  id: number;
  name: string;
};

type GameSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (game: GameSearchSelection) => void;
  excludeGameIds?: string[];
  title?: string;
};

function catalogToSelection(game: CatalogGame): GameSearchSelection {
  return { id: Number(game.id), name: game.name };
}

function libraryToSelection(game: GameItem): GameSearchSelection {
  return { id: Number(game.id), name: game.title };
}

export default function GameSearchModal({
  isOpen,
  onClose,
  onSelectGame,
  excludeGameIds = [],
  title,
}: GameSearchModalProps) {
  const searchInputId = useId();
  const { t, i18n } = useTranslation();
  const { games: allGames } = useLibraryGames();
  const { catalogSearchEnabled } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogGame[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const excludeSet = useMemo(() => new Set(excludeGameIds.map(String)), [excludeGameIds]);

  const libraryMatches = useMemo(() => {
    const base = allGames.filter((g) => !excludeSet.has(String(g.id)));
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter((g) => g.title.toLowerCase().includes(q));
  }, [allGames, excludeSet, searchQuery]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery("");
    setCatalogResults([]);
    setError(null);
    setIsSearching(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (!catalogSearchEnabled) {
      setCatalogResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    const trimmed = searchQuery.trim();
    if (!isIgdbSearchQueryReady(trimmed)) {
      setCatalogResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      searchTimeoutRef.current = null;
      const controller = new AbortController();
      abortRef.current = controller;
      void searchIgdbGames(trimmed, controller.signal)
        .then((games) => {
          if (controller.signal.aborted) return;
          setCatalogResults(games.filter((g) => !excludeSet.has(String(g.id))));
          setError(null);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : String(err);
          console.error("Similar-games catalog search error:", err);
          setError(message);
          setCatalogResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [isOpen, searchQuery, catalogSearchEnabled, excludeSet]);

  const handleSelect = (selection: GameSearchSelection) => {
    if (Number.isNaN(selection.id)) return;
    onSelectGame(selection);
    onClose();
  };

  if (!isOpen) return null;

  const showCatalogUi = catalogSearchEnabled;
  const trimmedQuery = searchQuery.trim();
  const queryReady = isIgdbSearchQueryReady(trimmedQuery);

  return createPortal(
    <div className="game-search-modal-overlay" onClick={onClose}>
      <div className="game-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="game-search-modal-header">
          <h2>{title ?? t("gameDetail.searchGameToAdd", "Cerca un gioco da aggiungere")}</h2>
          <button
            type="button"
            className="game-search-modal-close"
            onClick={onClose}
            aria-label={t("common.close", "Chiudi")}
          >
            ×
          </button>
        </div>
        <div className="game-search-modal-search">
          <label htmlFor={searchInputId} className="game-search-modal-sr-only">
            {t("gameDetail.searchGamePlaceholder", "Cerca per titolo...")}
          </label>
          <input
            id={searchInputId}
            name="gameSearchModalQuery"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("gameDetail.searchGamePlaceholder", "Cerca per titolo...")}
            autoComplete="off"
            autoFocus
          />
        </div>
        <div className="game-search-modal-list">
          {showCatalogUi ? (
            <>
              {error && (
                <div className="game-search-modal-empty">
                  {t("addGame.error")}: {error}
                </div>
              )}
              {isSearching ? (
                <div className="game-search-modal-empty">
                  {t("addGame.loading", "Searching...")}
                </div>
              ) : catalogResults.length === 0 && queryReady ? (
                <div className="game-search-modal-empty">
                  {t("gameDetail.noGamesFound", "Nessun gioco trovato")}
                </div>
              ) : catalogResults.length === 0 ? (
                <div className="game-search-modal-empty">
                  {t("addGame.typeToSearch")}
                </div>
              ) : (
                <div className="add-game-results-list">
                  {catalogResults.map((game) => {
                    const inLibrary = allGames.some((g) => String(g.id) === String(game.id));
                    const typeLabel = game.type != null ? displayGameType(game.type) : "";
                    return (
                      <button
                        key={game.id}
                        type="button"
                        className="add-game-result-item"
                        onClick={() => handleSelect(catalogToSelection(game))}
                      >
                        <div className="add-game-result-cover-wrap">
                          <Cover
                            title={game.name}
                            coverUrl={game.cover || ""}
                            width={80}
                            height={120}
                            showTitle={false}
                            detail={false}
                            play={false}
                            showBorder={false}
                          />
                        </div>
                        <div className="add-game-result-content">
                          <div className="add-game-result-title-row">
                            <div className="add-game-result-title">{game.name}</div>
                            {typeLabel ? (
                              <span className="add-game-result-type-label">{typeLabel}</span>
                            ) : null}
                            {!inLibrary && (
                              <span className="add-game-result-new-label">{t("addGame.new")}</span>
                            )}
                          </div>
                          {formatCatalogGameDate(game, t, i18n) && (
                            <div className="add-game-result-date">
                              {formatCatalogGameDate(game, t, i18n)}
                            </div>
                          )}
                          {game.summary && (
                            <div className="add-game-result-summary">{game.summary}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : libraryMatches.length === 0 ? (
            <div className="game-search-modal-empty">
              {t("gameDetail.noGamesFound", "Nessun gioco trovato")}
            </div>
          ) : (
            <div className="add-game-results-list">
              {libraryMatches.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  className="add-game-result-item"
                  onClick={() => handleSelect(libraryToSelection(game))}
                >
                  <div className="add-game-result-cover-wrap">
                    <Cover
                      title={game.title}
                      coverUrl={game.cover || ""}
                      width={80}
                      height={120}
                      showTitle={false}
                      detail={false}
                      play={false}
                      showBorder={false}
                    />
                  </div>
                  <div className="add-game-result-content">
                    <div className="add-game-result-title-row">
                      <div className="add-game-result-title">{game.title}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
