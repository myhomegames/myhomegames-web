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
import { displayGameType, toGameTypeId } from "../../utils/gameType";
import { gameHasExecutableForPlatform, getExecutablesForPlatform } from "../../utils/gameExecutables";
const VIRTUALIZATION_THRESHOLD = 100; // Use virtual scrolling when there are more than this many items

type GamesListDetailProps = {
  games: GameItem[];
  onGameClick: (game: GameItem) => void;
  onCatalogGameClick?: (gameId: number) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  allCollections?: CollectionItem[];
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  platformIdForPlay?: string;
  saveScrollBeforeEdit?: () => void;
  clearScrollAfterEditRef?: () => void;
  hideGameType?: boolean;
};

const FIXED_COVER_SIZE = 100; // Fixed size corresponding to minimum slider position

type GameDetailItemProps = {
  game: GameItem;
  onGameClick: (game: GameItem) => void;
  onCatalogGameClick?: (gameId: number) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (game: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  index: number;
  allCollections?: CollectionItem[];
  platformIdForPlay?: string;
  hideGameType?: boolean;
};

export function GameDetailItem({
  game,
  onGameClick,
  onCatalogGameClick,
  onPlay,
  onEditClick,
  onGameDelete,
  onGameUpdate,
  buildCoverUrl,
  itemRefs,
  index,
  allCollections = [],
  platformIdForPlay,
  hideGameType = false,
}: GameDetailItemProps) {
  const { t, i18n } = useTranslation();
  const isCatalogOnly = (game as GameItem & { isCatalogOnly?: boolean }).isCatalogOnly;
  const gameForCover = useMemo(() => {
    if (!platformIdForPlay) return game;
    const f = getExecutablesForPlatform(game, platformIdForPlay);
    if (!f) return { ...game, executables: [], executableFileNames: [] };
    return { ...game, executables: f.executables, executableFileNames: f.executableFileNames };
  }, [game, platformIdForPlay]);
  const handleRowClick = () => {
    if (isCatalogOnly && onCatalogGameClick) {
      onCatalogGameClick(Number(game.id));
    } else {
      onGameClick(game);
    }
  };
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

  const gameTypeLabel = useMemo(
    () => displayGameType(toGameTypeId(game.type)),
    [game.type]
  );

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
      onClick={handleRowClick}
    >
      <Cover
        key={`${game.id}-${game.cover}`}
        title={game.title}
        coverUrl={coverUrl}
        width={FIXED_COVER_SIZE}
        height={coverHeight}
        onPlay={!isCatalogOnly && onPlay ? (executableName?: string) => {
          if (executableName !== undefined) {
            (onPlay as (g: typeof game, ex?: string) => void)(game, executableName);
          } else {
            const ex = platformIdForPlay && gameForCover.executables?.length
              ? gameForCover.executables[0]
              : undefined;
            (onPlay as (g: typeof game, ex?: string) => void)(gameForCover, ex);
          }
        } : undefined}
        showTitle={false}
        detail={false}
        play={platformIdForPlay ? gameHasExecutableForPlatform(game, platformIdForPlay) : !!(game.executables && game.executables.length > 0)}
        showBorder={false}
        overlayContent={isCatalogOnly ? <span className="game-detail-similar-cover-badge">{t("addGame.new", "New")}</span> : undefined}
      />
      <div className="games-list-detail-content">
        <div className="games-list-detail-title-row mb-2">
          <div className="text-white games-list-detail-title">{game.title}</div>
          {!hideGameType && gameTypeLabel ? (
            <span className="games-list-detail-type">{gameTypeLabel}</span>
          ) : null}
        </div>
        {(game.year !== null && game.year !== undefined) || (game.stars !== null && game.stars !== undefined) ? (
          <div className="games-list-detail-meta-row">
            {game.year !== null && game.year !== undefined && (
              <div className="text-gray-500 games-list-detail-year">
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
        {!isCatalogOnly && (
        <button
          type="button"
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
        )}
        {!isCatalogOnly && (
        <AddToCollectionDropdown
          game={game}
          allCollections={allCollections}
        />
        )}
        {!isCatalogOnly && gameForCover.executables && gameForCover.executables.length > 1 && onPlay && (
          <AdditionalExecutablesDropdown
            gameId={game.id}
            gameExecutables={gameForCover.executables}
            onPlayExecutable={(executableName: string) => {
              if (onPlay) {
                (onPlay as any)(game, executableName);
              }
            }}
          />
        )}
        {!isCatalogOnly && (
        <DropdownMenu
          gameId={game.id}
          gameTitle={game.title}
          gameExecutables={gameForCover.executables}
          fullGame={game}
          platformIdForPlay={platformIdForPlay}
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
        )}
      </div>
    </div>
  );
}

export default function GamesListDetail({
  games,
  onGameClick,
  onCatalogGameClick,
  onPlay,
  onGameUpdate,
  onGameDelete,
  buildCoverUrl,
  itemRefs,
  allCollections = [],
  scrollContainerRef,
  platformIdForPlay,
  saveScrollBeforeEdit,
  clearScrollAfterEditRef,
  hideGameType = false,
}: GamesListDetailProps) {
  const { t } = useTranslation();
  const editGame = useEditGame();
  const handleEditClick = (game: GameItem) => {
    saveScrollBeforeEdit?.();
    editGame.openEditModal(game);
  };

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
        className={`games-list-detail-container${useVirtualization ? " games-list-detail-container--virtualized" : ""}`}
      >
        {useVirtualization ? (
          <VirtualizedGamesListDetail
            games={games}
            containerRef={scrollContainerRef || containerRef}
            itemRefs={itemRefs}
            onGameClick={onGameClick}
            onCatalogGameClick={onCatalogGameClick}
            onPlay={onPlay}
            onEditClick={handleEditClick}
            onGameDelete={onGameDelete}
            onGameUpdate={onGameUpdate}
            buildCoverUrl={buildCoverUrl}
            allCollections={allCollections}
            platformIdForPlay={platformIdForPlay}
            hideGameType={hideGameType}
          />
        ) : (
          games.map((game, index) => (
            <GameDetailItem
              key={game.id}
              game={game}
              onGameClick={onGameClick}
              onCatalogGameClick={onCatalogGameClick}
              onPlay={onPlay}
              onEditClick={handleEditClick}
              onGameDelete={onGameDelete}
              onGameUpdate={onGameUpdate}
              buildCoverUrl={buildCoverUrl}
              itemRefs={itemRefs}
              index={index}
              allCollections={allCollections}
              platformIdForPlay={platformIdForPlay}
              hideGameType={hideGameType}
            />
          ))
        )}
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
    </>
  );
}
