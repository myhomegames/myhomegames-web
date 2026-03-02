import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useLibraryGames } from "../../contexts/LibraryGamesContext";
import SearchResultsList from "../search/SearchResultsList";
import type { GameItem } from "../../types";
import "./GameSearchModal.css";

type GameSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (game: GameItem) => void;
  excludeGameIds?: string[];
  title?: string;
};

export default function GameSearchModal({
  isOpen,
  onClose,
  onSelectGame,
  excludeGameIds = [],
  title,
}: GameSearchModalProps) {
  const { t } = useTranslation();
  const { games: allGames } = useLibraryGames();
  const [searchQuery, setSearchQuery] = useState("");
  const excludeSet = useMemo(() => new Set(excludeGameIds), [excludeGameIds]);

  const filteredGames = useMemo(() => {
    const base = allGames.filter((g) => !excludeSet.has(String(g.id)));
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter((g) => g.title.toLowerCase().includes(q));
  }, [allGames, excludeSet, searchQuery]);

  useEffect(() => {
    if (isOpen) setSearchQuery("");
  }, [isOpen]);

  const handleGameClick = (game: GameItem) => {
    onSelectGame(game);
    onClose();
  };

  if (!isOpen) return null;

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
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("gameDetail.searchGamePlaceholder", "Cerca per titolo...")}
            autoFocus
          />
        </div>
        <div className="game-search-modal-list">
          {filteredGames.length === 0 ? (
            <div className="game-search-modal-empty">
              {t("gameDetail.noGamesFound", "Nessun gioco trovato")}
            </div>
          ) : (
            <SearchResultsList
              games={filteredGames}
              collections={[]}
              developers={[]}
              publishers={[]}
              onGameClick={handleGameClick}
              variant="popup"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
