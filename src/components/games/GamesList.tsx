import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, API_TOKEN } from "../../config";
import Cover from "./Cover";
import EditGameModal from "./EditGameModal";
import { useEditGame } from "../common/actions";
import VirtualizedGamesList from "./VirtualizedGamesList";
import type { GameItem } from "../../types";
import "./GamesList.css";

const VIRTUALIZATION_THRESHOLD = 100; // Use virtual scrolling when there are more than this many items

type GamesListProps = {
  games: GameItem[];
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  coverSize?: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  draggable?: boolean;
  onDragEnd?: (sourceIndex: number, destinationIndex: number) => void;
  style?: React.CSSProperties;
  viewMode?: "grid" | "detail" | "table";
  allCollections?: import("../../types").CollectionItem[];
  collectionId?: string;
  onRemoveFromCollection?: (gameId: string) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  enableVirtualization?: boolean;
};


type GameListItemProps = {
  game: GameItem;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (game: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  coverSize: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  draggable?: boolean;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dragOverIndex: number | null;
  viewMode?: "grid" | "detail" | "table";
  allCollections?: import("../../types").CollectionItem[];
  collectionId?: string;
  onRemoveFromCollection?: (gameId: string) => void;
};

export function GameListItem({
  game,
  onGameClick,
  onPlay,
  onEditClick,
  onGameDelete,
  onGameUpdate,
  buildCoverUrl,
  coverSize,
  itemRefs,
  draggable = false,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  dragOverIndex,
  viewMode,
  allCollections = [],
  collectionId,
  onRemoveFromCollection,
}: GameListItemProps) {
  const coverHeight = coverSize * 1.5;
  
  // Track previous cover value to detect changes
  const prevCoverRef = useRef<string | undefined>(game.cover);
  const coverChanged = prevCoverRef.current !== game.cover;
  if (coverChanged) {
    prevCoverRef.current = game.cover;
  }
  
  // Memoize cover URL - only add timestamp when cover actually changes
  const coverUrl = useMemo(() => {
    return game.cover ? buildCoverUrl(API_BASE, game.cover, coverChanged) : "";
  }, [game.cover, coverChanged, buildCoverUrl]);

  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", index.toString());
    onDragStart(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!draggable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver(index);
  };

  const handleDragEnd = () => {
    if (!draggable) return;
    onDragEnd();
  };

  const isDragOver = dragOverIndex === index && isDragging;

  return (
    <div
      ref={(el) => {
        if (el && itemRefs?.current) {
          itemRefs.current.set(game.id, el);
        }
      }}
      className={`group cursor-pointer games-list-item ${draggable ? 'games-list-item-draggable' : ''} ${isDragOver ? 'games-list-item-drag-over' : ''}`}
      style={{ width: `${coverSize}px`, minWidth: `${coverSize}px` }}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragLeave={(e) => {
        if (!draggable) return;
        // Only clear dragOver if we're actually leaving the element
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
          if (dragOverIndex === index) {
            onDragOver(-1);
          }
        }
      }}
    >
      <Cover
        key={`${game.id}-${game.cover}`}
        title={game.title}
        coverUrl={coverUrl}
        width={coverSize}
        height={coverHeight}
        onPlay={onPlay ? () => onPlay(game) : undefined}
        onClick={() => onGameClick(game)}
        onEdit={() => onEditClick(game)}
        gameId={game.id}
        gameTitle={game.title}
        game={game}
        onGameDelete={onGameDelete ? (gameId: string) => {
          const deletedGame = game.id === gameId ? game : null;
          if (deletedGame) {
            onGameDelete(deletedGame);
          }
        } : undefined}
        onGameUpdate={onGameUpdate ? (updatedGame) => {
          if (updatedGame.id === game.id) {
            onGameUpdate(updatedGame);
          }
        } : undefined}
        collectionId={collectionId}
        onRemoveFromCollection={onRemoveFromCollection ? () => onRemoveFromCollection(game.id) : undefined}
        showTitle={true}
        subtitle={game.year}
        detail={true}
        play={!!(game.executables && game.executables.length > 0)}
        showBorder={viewMode !== "detail"}
        allCollections={allCollections}
      />
    </div>
  );
}

export default function GamesList({
  games,
  onGameClick,
  onPlay,
  onGameUpdate,
  onGameDelete,
  buildCoverUrl,
  coverSize = 150,
  itemRefs,
  draggable = false,
  onDragEnd,
  style,
  viewMode,
  allCollections = [],
  collectionId,
  onRemoveFromCollection,
  scrollContainerRef,
  enableVirtualization = true,
}: GamesListProps) {
  const { t } = useTranslation();
  const editGame = useEditGame();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex && onDragEnd) {
      onDragEnd(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleGameUpdate = (updatedGame: GameItem) => {
    if (onGameUpdate) {
      onGameUpdate(updatedGame);
    }
    editGame.closeEditModal();
  };

  // Use virtual scrolling for large lists
  const useVirtualization =
    enableVirtualization && games.length > VIRTUALIZATION_THRESHOLD && !draggable; // Don't use virtualization when dragging is enabled
  const containerRef = useRef<HTMLDivElement>(null);

  if (games.length === 0) {
    return (
      <div className="centered-content h-full min-h-[400px]">
        <div className="text-gray-400 text-center">{t("table.noGames")}</div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="games-list-container"
        style={{
          gridTemplateColumns: useVirtualization ? undefined : `repeat(auto-fill, ${coverSize}px)`,
          height: useVirtualization ? "100%" : undefined,
          ...style,
        }}
      >
        {useVirtualization ? (
          <VirtualizedGamesList
            games={games}
            coverSize={coverSize}
            containerRef={scrollContainerRef || containerRef}
            itemRefs={itemRefs}
            onGameClick={onGameClick}
            onPlay={onPlay}
            onEditClick={editGame.openEditModal}
            onGameDelete={onGameDelete}
            onGameUpdate={onGameUpdate}
            buildCoverUrl={buildCoverUrl}
            allCollections={allCollections}
            collectionId={collectionId}
            onRemoveFromCollection={onRemoveFromCollection}
          />
        ) : (
          games.map((game, index) => (
            <GameListItem
              key={game.id}
              game={game}
              onGameClick={onGameClick}
              onPlay={onPlay}
              onEditClick={editGame.openEditModal}
              onGameDelete={onGameDelete}
              onGameUpdate={onGameUpdate}
              buildCoverUrl={buildCoverUrl}
              coverSize={coverSize}
              itemRefs={itemRefs}
              draggable={draggable}
              index={index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              isDragging={draggedIndex !== null}
              dragOverIndex={dragOverIndex}
              viewMode={viewMode}
              allCollections={allCollections}
              collectionId={collectionId}
              onRemoveFromCollection={onRemoveFromCollection}
            />
          ))
        )}
      </div>
      {editGame.selectedGame && API_TOKEN && (
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
