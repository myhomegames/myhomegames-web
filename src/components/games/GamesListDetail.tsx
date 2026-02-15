import { useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../config";
import Cover from "./Cover";
import EditGameModal from "./EditGameModal";
import DropdownMenu from "../common/DropdownMenu";
import AddToCollectionDropdown from "./AddToCollectionDropdown";
import AdditionalExecutablesDropdown from "./AdditionalExecutablesDropdown";
import StarRating from "../common/StarRating";
import Summary from "../common/Summary";
import { useEditGame } from "../common/actions";
import VirtualizedGamesListDetail from "./VirtualizedGamesListDetail";
import type { GameItem, CollectionItem } from "../../types";
import { formatGameDate } from "../../utils/date";
import "./GamesListDetail.css";

const VIRTUALIZATION_THRESHOLD = 100; // Use virtual scrolling when there are more than this many items

type GamesListDetailProps = {
  games: GameItem[];
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  allCollections?: CollectionItem[];
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

const FIXED_COVER_SIZE = 100; // Fixed size corresponding to minimum slider position

type GameDetailItemProps = {
  game: GameItem;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (game: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  index: number;
  allCollections?: CollectionItem[];
};

export function GameDetailItem({
  game,
  onGameClick,
  onPlay,
  onEditClick,
  onGameDelete,
  onGameUpdate,
  buildCoverUrl,
  itemRefs,
  index,
  allCollections = [],
}: GameDetailItemProps) {
  const { t, i18n } = useTranslation();
  const isEven = index % 2 === 0;
  const coverHeight = FIXED_COVER_SIZE * 1.5;
  
  // Track previous cover value to detect changes
  const prevCoverRef = useRef<string | undefined>(game.cover);
  const coverChanged = prevCoverRef.current !== game.cover;
  if (coverChanged) {
    prevCoverRef.current = game.cover;
  }
  
  // Memoize cover URL - only add timestamp when cover actually changes
  const coverUrl = useMemo(() => {
    return buildCoverUrl(API_BASE, game.cover, coverChanged);
  }, [game.cover, coverChanged, buildCoverUrl]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(game);
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  useEffect(() => {
    const handleOpened = (e: Event) => {
      const ev = e as CustomEvent<{ gameId?: string }>;
      if (ev.detail?.gameId === game.id) setIsDropdownOpen(true);
    };
    const handleClosed = (e: Event) => {
      const ev = e as CustomEvent<{ gameId?: string }>;
      if (ev.detail?.gameId === game.id) setIsDropdownOpen(false);
    };
    window.addEventListener("dropdownMenuOpened", handleOpened);
    window.addEventListener("dropdownMenuClosed", handleClosed);
    return () => {
      window.removeEventListener("dropdownMenuOpened", handleOpened);
      window.removeEventListener("dropdownMenuClosed", handleClosed);
    };
  }, [game.id]);

  return (
    <div
      ref={(el) => {
        if (el && itemRefs?.current) {
          itemRefs.current.set(game.id, el);
        }
      }}
      className={`group cursor-pointer mb-6 games-list-detail-item ${
        isEven ? "even" : "odd"
      }${isDropdownOpen ? " detail-dropdown-open" : ""}`}
      onClick={() => onGameClick(game)}
    >
      <Cover
        key={`${game.id}-${game.cover}`}
        title={game.title}
        coverUrl={coverUrl}
        width={FIXED_COVER_SIZE}
        height={coverHeight}
        onPlay={onPlay ? () => onPlay(game) : undefined}
        showTitle={false}
        detail={false}
        play={!!(game.executables && game.executables.length > 0)}
        showBorder={false}
      />
      <div className="games-list-detail-content">
        <div className="text-white mb-2 games-list-detail-title">
          {game.title}
        </div>
        {(game.year !== null && game.year !== undefined) || (game.stars !== null && game.stars !== undefined) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {game.year !== null && game.year !== undefined && (
              <div className="text-gray-500" style={{ fontSize: "0.85rem" }}>
                {formatGameDate(game, t, i18n) || game.year.toString()}
              </div>
            )}
            {game.stars !== null && game.stars !== undefined && (
              <StarRating rating={(game.stars / 10) * 5} starSize={14} gap={3} />
            )}
          </div>
        ) : null}
        {game.summary && (
          <Summary summary={game.summary} truncateOnly={true} maxLines={2} fontSize="0.85rem" />
        )}
      </div>
      <div className="games-list-detail-actions">
        <button
          onClick={handleEditClick}
          className="games-list-detail-edit-button"
          aria-label="Edit"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <AddToCollectionDropdown
          game={game}
          allCollections={allCollections}
        />
        {game.executables && game.executables.length > 1 && onPlay && (
          <AdditionalExecutablesDropdown
            gameId={game.id}
            gameExecutables={game.executables}
            onPlayExecutable={(executableName: string) => {
              if (onPlay) {
                (onPlay as any)(game, executableName);
              }
            }}
          />
        )}
        <DropdownMenu
          gameId={game.id}
          gameTitle={game.title}
          gameExecutables={game.executables}
          onAddToCollection={() => {}}
          onGameDelete={onGameDelete ? (gameId: string) => {
            if (game.id === gameId) {
              onGameDelete(game);
            }
          } : undefined}
          onGameUpdate={onGameUpdate ? (updatedGame) => {
            if (updatedGame.id === game.id) {
              onGameUpdate(updatedGame);
            }
          } : undefined}
          className="games-list-detail-dropdown-menu"
        />
      </div>
    </div>
  );
}

export default function GamesListDetail({
  games,
  onGameClick,
  onPlay,
  onGameUpdate,
  onGameDelete,
  buildCoverUrl,
  itemRefs,
  allCollections = [],
  scrollContainerRef,
}: GamesListDetailProps) {
  const { t } = useTranslation();
  const editGame = useEditGame();
  
  if (games.length === 0) {
    return (
      <div className="centered-content h-full min-h-[400px]">
        <div className="text-gray-400 text-center">{t("table.noGames")}</div>
      </div>
    );
  }

  const handleGameUpdate = (updatedGame: GameItem) => {
    if (onGameUpdate) {
      onGameUpdate(updatedGame);
    }
    editGame.closeEditModal();
  };

  // Use virtual scrolling for large lists
  const useVirtualization = games.length > VIRTUALIZATION_THRESHOLD;
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div 
        ref={containerRef}
        className="games-list-detail-container"
        style={{
          height: useVirtualization ? "100%" : undefined,
        }}
      >
        {useVirtualization ? (
          <VirtualizedGamesListDetail
            games={games}
            containerRef={scrollContainerRef || containerRef}
            itemRefs={itemRefs}
            onGameClick={onGameClick}
            onPlay={onPlay}
            onEditClick={editGame.openEditModal}
            onGameDelete={onGameDelete}
            onGameUpdate={onGameUpdate}
            buildCoverUrl={buildCoverUrl}
            allCollections={allCollections}
          />
        ) : (
          games.map((game, index) => (
            <GameDetailItem
              key={game.id}
              game={game}
              onGameClick={onGameClick}
              onPlay={onPlay}
              onEditClick={editGame.openEditModal}
              onGameDelete={onGameDelete}
              onGameUpdate={onGameUpdate}
              buildCoverUrl={buildCoverUrl}
              itemRefs={itemRefs}
              index={index}
              allCollections={allCollections}
            />
          ))
        )}
      </div>
      {editGame.selectedGame && (
        <EditGameModal
          isOpen={editGame.isEditModalOpen}
          onClose={editGame.closeEditModal}
          game={editGame.selectedGame}
          onGameUpdate={handleGameUpdate}
        />
      )}
    </>
  );
}
