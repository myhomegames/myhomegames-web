import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, API_TOKEN } from "../../config";
import EditGameModal from "./EditGameModal";
import { useEditGame } from "../common/actions";
import { useScrollRestoration } from "../../hooks/useScrollRestoration";
import VirtualizedGamesListTable from "./VirtualizedGamesListTable";
import TableRow from "./TableRow";
import type { GameItem, CollectionItem } from "../../types";
import { buildApiUrl } from "../../utils/api";
import { formatGameDate } from "../../utils/date";
const VIRTUALIZATION_THRESHOLD = 100; // Use virtual scrolling when there are more than this many items

type ColumnVisibility = {
  title: boolean;
  gameType: boolean;
  releaseDate: boolean;
  year: boolean;
  stars: boolean;
  criticRating: boolean;
  ageRating: boolean;
};

type GamesListTableProps = {
  games: GameItem[];
  onGameClick: (game: GameItem) => void;
  onCatalogGameClick?: (gameId: number) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  allCollections?: CollectionItem[];
  columnVisibility: ColumnVisibility;
  platformIdForPlay?: string;
  saveScrollBeforeEdit?: () => void;
  clearScrollAfterEditRef?: () => void;
};

export default function GamesListTable({
  games,
  onGameClick,
  onCatalogGameClick,
  onPlay,
  onGameUpdate,
  onGameDelete,
  itemRefs,
  scrollContainerRef,
  allCollections = [],
  columnVisibility,
  platformIdForPlay,
  saveScrollBeforeEdit,
  clearScrollAfterEditRef,
}: GamesListTableProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const actualScrollRef = scrollContainerRef || internalScrollRef;
  const useVirtualization = games.length > VIRTUALIZATION_THRESHOLD;
  // Only use pathname:table from the hook for non-virtualized table; virtualized table saves/restores in VirtualizedGamesListTable
  useScrollRestoration(actualScrollRef, useVirtualization ? undefined : "table");
  
  const [localGames, setLocalGames] = useState<GameItem[]>(games);
  const editGame = useEditGame();
  const editGameWithSaveScroll = useMemo(
    () =>
      saveScrollBeforeEdit
        ? {
            ...editGame,
            openEditModal: (game: GameItem) => {
              saveScrollBeforeEdit();
              editGame.openEditModal(game);
            },
          }
        : editGame,
    [editGame, saveScrollBeforeEdit]
  );
  
  // Sync localGames when games prop changes
  useEffect(() => {
    setLocalGames(games);
  }, [games]);

  const handleRatingChange = async (gameId: string, newStars: number) => {
    if (!API_TOKEN) return;
    
    try {
      const url = buildApiUrl(API_BASE, `/games/${gameId}`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': API_TOKEN,
        },
        body: JSON.stringify({ stars: newStars }),
      });

      if (response.ok) {
        const updatedGames = localGames.map(game => 
          game.id === gameId 
            ? { ...game, stars: newStars }
            : game
        );
        setLocalGames(updatedGames);
      } else {
        console.error('Failed to update rating');
      }
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  const handleGameUpdate = (updatedGame: GameItem) => {
    const updatedGames = localGames.map(game =>
      game.id === updatedGame.id ? updatedGame : game
    );
    setLocalGames(updatedGames);
    if (onGameUpdate) {
      onGameUpdate(updatedGame);
    }
    editGame.closeEditModal();
  };
  const { t, i18n } = useTranslation();

  if (games.length === 0) {
    return (
      <div className="centered-content h-full min-h-[400px]">
        <div className="text-gray-400 text-center">{t("table.noGames")}</div>
      </div>
    );
  }

  // Helper function to format rating value (0-10 float)
  const formatRating = (value: number | null | undefined): string | null => {
    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }
    const numValue = Number(value);
    if (numValue < 0 || numValue > 10) {
      return null;
    }
    // Format to show decimal only if present (e.g., 8.5 instead of 8.50, but 8 instead of 8.0)
    return numValue % 1 === 0 ? numValue.toString() : numValue.toFixed(1);
  };

  // Use virtual scrolling for large lists
  const containerRef = useRef<HTMLDivElement>(null);

  if (useVirtualization) {
    const theContainerRef = scrollContainerRef ?? containerRef;
    return (
      <div className="games-table-container">
        <div
          className="games-table-scroll virtualized-table-scroll"
          ref={theContainerRef}
        >
          <VirtualizedGamesListTable
            games={localGames}
            containerRef={theContainerRef}
            itemRefs={itemRefs}
            onGameClick={onGameClick}
            onCatalogGameClick={onCatalogGameClick}
            onPlay={onPlay}
            onGameUpdate={onGameUpdate}
            onGameDelete={onGameDelete}
            allCollections={allCollections}
            columnVisibility={columnVisibility}
            handleRatingChange={handleRatingChange}
            formatRating={formatRating}
            formatGameDate={formatGameDate}
            t={t}
            i18n={i18n}
            editGame={editGameWithSaveScroll}
            platformIdForPlay={platformIdForPlay}
          />
        </div>
        {editGame.selectedGame && (
          <EditGameModal
            isOpen={editGame.isEditModalOpen}
            onClose={() => {
              clearScrollAfterEditRef?.();
              editGame.closeEditModal();
            }}
            game={editGame.selectedGame}
            onGameDraftUpdate={(updatedGame: GameItem) => editGame.updateSelectedGame(updatedGame)}
            onGameUpdate={handleGameUpdate}
          />
        )}
      </div>
    );
  }

  return (
    <div className="games-table-container">
      <div
        className="games-table-scroll games-table-scroll-non-virtualized"
        ref={actualScrollRef as React.RefObject<HTMLDivElement>}
      >
        <table className="games-table">
          <tbody>
                    {localGames.map((it, index) => {
              return (
                <TableRow
                  key={it.id}
                  game={it}
                  index={index}
                  itemRefs={itemRefs}
                  onGameClick={onGameClick}
                  onCatalogGameClick={onCatalogGameClick}
                  onPlay={onPlay}
                  onGameUpdate={onGameUpdate}
                  onGameDelete={onGameDelete}
                  allCollections={allCollections}
                  columnVisibility={columnVisibility}
                  handleRatingChange={handleRatingChange}
                  formatRating={formatRating}
                  formatGameDate={formatGameDate}
                  t={t}
                  i18n={i18n}
                  editGame={editGameWithSaveScroll}
                  platformIdForPlay={platformIdForPlay}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {editGame.selectedGame && (
        <EditGameModal
          isOpen={editGame.isEditModalOpen}
          onClose={() => {
            clearScrollAfterEditRef?.();
            editGame.closeEditModal();
          }}
          game={editGame.selectedGame}
          onGameUpdate={handleGameUpdate}
        />
      )}
    </div>
  );
}
