import { useState, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../config";
import Cover from "./Cover";
import EditGameModal from "./EditGameModal";
import { useEditGame } from "../common/actions";
import VirtualizedGamesList from "./VirtualizedGamesList";
import type { CollectionInfo, CollectionItem, GameItem } from "../../types";
import type { CollectionLikeResourceType } from "../collections/EditCollectionLikeModal";
import { parseCollectionLikePseudoGameId } from "../../utils/collectionLikePseudoGame";
import { gameHasExecutableForPlatform, getExecutablesForPlatform } from "../../utils/gameExecutables";
const VIRTUALIZATION_THRESHOLD = 100; // Use virtual scrolling when there are more than this many items

type GamesListProps = {
  games: GameItem[];
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean, customTimestamp?: number) => string;
  coverSize?: number;
  coverCacheBustTimestamp?: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  draggable?: boolean;
  onDragEnd?: (sourceIndex: number, destinationIndex: number) => void;
  style?: React.CSSProperties;
  viewMode?: "grid" | "detail" | "table";
  allCollections?: import("../../types").CollectionItem[];
  collectionId?: string;
  onRemoveFromCollection?: (gameId: string) => void;
  developerId?: string;
  publisherId?: string;
  onRemoveFromDeveloper?: (gameId: string) => void;
  onRemoveFromPublisher?: (gameId: string) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  enableVirtualization?: boolean;
  forceSingleColumnVirtualized?: boolean;
  platformIdForPlay?: string;
  /** When games include `collectionlike:…` synthetic ids (e.g. parent sliders), wire collection-like actions */
  allCollectionLikes?: CollectionItem[];
  collectionLikeResourceType?: CollectionLikeResourceType;
  sliderParentCollectionLikeId?: string;
  onRemoveChildFromSliderParent?: (childId: string) => void | Promise<void>;
  onCollectionLikePseudoEdit?: (game: GameItem) => void;
  onPlayFirstInCollectionLike?: (resourceType: string, cid: string) => void | Promise<void>;
  onCollectionLikePseudoAddToParent?: (source: CollectionItem, parentId?: string) => void | Promise<void>;
  onCollectionLikePseudoUpdated?: (updated: CollectionInfo) => void;
};


type GameListItemProps = {
  game: GameItem;
  onGameClick: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (game: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean, customTimestamp?: number) => string;
  coverSize: number;
  coverCacheBustTimestamp?: number;
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
  developerId?: string;
  publisherId?: string;
  onRemoveFromDeveloper?: (gameId: string) => void;
  onRemoveFromPublisher?: (gameId: string) => void;
  platformIdForPlay?: string;
  allCollectionLikes?: CollectionItem[];
  collectionLikeResourceType?: CollectionLikeResourceType;
  sliderParentCollectionLikeId?: string;
  onRemoveChildFromSliderParent?: (childId: string) => void | Promise<void>;
  onCollectionLikePseudoEdit?: (game: GameItem) => void;
  onPlayFirstInCollectionLike?: (resourceType: string, cid: string) => void | Promise<void>;
  onCollectionLikePseudoAddToParent?: (source: CollectionItem, parentId?: string) => void | Promise<void>;
  onCollectionLikePseudoUpdated?: (updated: CollectionInfo) => void;
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
  coverCacheBustTimestamp,
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
  developerId,
  publisherId,
  onRemoveFromDeveloper,
  onRemoveFromPublisher,
  platformIdForPlay,
  allCollectionLikes = [],
  collectionLikeResourceType,
  sliderParentCollectionLikeId,
  onRemoveChildFromSliderParent,
  onCollectionLikePseudoEdit,
  onPlayFirstInCollectionLike,
  onCollectionLikePseudoAddToParent,
  onCollectionLikePseudoUpdated,
}: GameListItemProps) {
  const { t } = useTranslation();
  const isIgdbOnly = (game as GameItem & { isIgdbOnly?: boolean }).isIgdbOnly;
  const coverHeight = coverSize * 1.5;
  const gameForCover = useMemo(() => {
    if (!platformIdForPlay) return game;
    const f = getExecutablesForPlatform(game, platformIdForPlay);
    if (!f) return { ...game, executables: [], executableFileNames: [] };
    return { ...game, executables: f.executables, executableFileNames: f.executableFileNames };
  }, [game, platformIdForPlay]);

  // Track previous cover value to detect changes
  const prevCoverRef = useRef<string | undefined>(game.cover);
  const coverChanged = prevCoverRef.current !== game.cover;
  if (coverChanged) {
    prevCoverRef.current = game.cover;
  }
  
  // Memoize cover URL - only add timestamp when cover actually changes
  const coverUrl = useMemo(() => {
    const timestamp = coverChanged ? Date.now() : coverCacheBustTimestamp;
    return game.cover ? buildCoverUrl(API_BASE, game.cover, !!timestamp, timestamp) : "";
  }, [game.cover, coverChanged, coverCacheBustTimestamp, buildCoverUrl]);

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

  const pseudo = parseCollectionLikePseudoGameId(game.id);
  const isPseudoCollectionLikeCard = Boolean(
    pseudo && collectionLikeResourceType && pseudo.resourceType === collectionLikeResourceType
  );

  const sourceCollectionLikeForPseudo: CollectionItem | undefined =
    isPseudoCollectionLikeCard && pseudo
      ? {
          id: pseudo.childId,
          title: game.title,
          summary: typeof game.summary === "string" ? game.summary : "",
          cover: game.cover,
          childs: [],
          showTitle: (game as { showTitle?: boolean }).showTitle !== false,
        }
      : undefined;

  const handleEditClickForCover = () => {
    if (isPseudoCollectionLikeCard) {
      if (onCollectionLikePseudoEdit) {
        onCollectionLikePseudoEdit(game);
      }
      return;
    }
    onEditClick(game);
  };

  const coverGameId = isPseudoCollectionLikeCard ? undefined : String(game.id);
  const coverCollectionId = isPseudoCollectionLikeCard
    ? pseudo!.resourceType === "collections"
      ? pseudo!.childId
      : undefined
    : collectionId;
  const coverDeveloperId = isPseudoCollectionLikeCard
    ? pseudo!.resourceType === "developers"
      ? pseudo!.childId
      : undefined
    : developerId;
  const coverPublisherId = isPseudoCollectionLikeCard
    ? pseudo!.resourceType === "publishers"
      ? pseudo!.childId
      : undefined
    : publisherId;

  const coverOnRemoveFromParent =
    isPseudoCollectionLikeCard &&
    pseudo &&
    sliderParentCollectionLikeId &&
    onRemoveChildFromSliderParent
      ? () => {
          void onRemoveChildFromSliderParent(pseudo.childId);
        }
      : undefined;

  const coverOnAddToCollection =
    isPseudoCollectionLikeCard && sourceCollectionLikeForPseudo && onCollectionLikePseudoAddToParent
      ? (parentId?: string) => {
          void onCollectionLikePseudoAddToParent(sourceCollectionLikeForPseudo, parentId);
        }
      : undefined;

  return (
    <div
      ref={(el) => {
        if (el && itemRefs?.current) {
          itemRefs.current.set(game.id, el);
        }
      }}
      className={`group cursor-pointer games-list-item games-list-item--cover-sized ${draggable ? "games-list-item-draggable" : ""} ${isDragOver ? "games-list-item-drag-over" : ""}`}
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
        onPlay={
          isPseudoCollectionLikeCard && onPlay && onPlayFirstInCollectionLike && pseudo
            ? () => {
                void onPlayFirstInCollectionLike(pseudo.resourceType, pseudo.childId);
              }
            : !isIgdbOnly && onPlay
              ? (executableName?: string) => {
                  if (executableName !== undefined) {
                    (onPlay as (g: typeof game, ex?: string) => void)(game, executableName);
                  } else {
                    const ex =
                      platformIdForPlay && gameForCover.executables?.length
                        ? gameForCover.executables[0]
                        : undefined;
                    (onPlay as (g: typeof game, ex?: string) => void)(gameForCover, ex);
                  }
                }
              : undefined
        }
        onClick={() => onGameClick(game)}
        onEdit={
          isPseudoCollectionLikeCard || !isIgdbOnly ? handleEditClickForCover : undefined
        }
        gameId={coverGameId}
        gameTitle={game.title}
        game={isPseudoCollectionLikeCard || isIgdbOnly ? undefined : gameForCover}
        fullGameForActions={isPseudoCollectionLikeCard || isIgdbOnly ? undefined : game}
        platformIdForPlay={platformIdForPlay}
        onGameDelete={
          !isPseudoCollectionLikeCard && !isIgdbOnly && onGameDelete
            ? (gameId: string) => {
                const deletedGame = game.id === gameId ? game : null;
                if (deletedGame) {
                  onGameDelete(deletedGame);
                }
              }
            : undefined
        }
        onGameUpdate={
          !isPseudoCollectionLikeCard && !isIgdbOnly && onGameUpdate
            ? (updatedGame) => {
                if (updatedGame.id === game.id) {
                  onGameUpdate(updatedGame);
                }
              }
            : undefined
        }
        collectionId={coverCollectionId}
        collectionTitle={isPseudoCollectionLikeCard ? game.title : undefined}
        onRemoveFromCollection={
          !isPseudoCollectionLikeCard && !isIgdbOnly && onRemoveFromCollection
            ? () => onRemoveFromCollection(String(game.id))
            : undefined
        }
        developerId={coverDeveloperId}
        publisherId={coverPublisherId}
        onRemoveFromDeveloper={
          !isPseudoCollectionLikeCard && !isIgdbOnly && onRemoveFromDeveloper
            ? () => onRemoveFromDeveloper(String(game.id))
            : undefined
        }
        onRemoveFromPublisher={
          !isPseudoCollectionLikeCard && !isIgdbOnly && onRemoveFromPublisher
            ? () => onRemoveFromPublisher(String(game.id))
            : undefined
        }
        onRemoveFromParent={coverOnRemoveFromParent}
        sourceCollectionLike={isPseudoCollectionLikeCard ? sourceCollectionLikeForPseudo : undefined}
        allCollectionLikes={isPseudoCollectionLikeCard ? (allCollectionLikes ?? []) : undefined}
        collectionLikeResourceType={isPseudoCollectionLikeCard ? pseudo!.resourceType : undefined}
        onCollectionUpdate={isPseudoCollectionLikeCard && onCollectionLikePseudoUpdated ? onCollectionLikePseudoUpdated : undefined}
        onAddToCollection={coverOnAddToCollection}
        showTitle={game.showTitle !== false}
        subtitle={game.subtitle ?? game.year}
        detail={true}
        play={
          isPseudoCollectionLikeCard
            ? !!(onPlay && onPlayFirstInCollectionLike)
            : platformIdForPlay
              ? gameHasExecutableForPlatform(game, platformIdForPlay)
              : !!(game.executables && game.executables.length > 0)
        }
        showBorder={viewMode !== "detail"}
        allCollections={allCollections}
        overlayContent={isIgdbOnly ? <span className="game-detail-similar-cover-badge">{t("addGame.new", "New")}</span> : undefined}
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
  coverCacheBustTimestamp,
  itemRefs,
  draggable = false,
  onDragEnd,
  style,
  viewMode,
  allCollections = [],
  collectionId,
  onRemoveFromCollection,
  developerId,
  publisherId,
  onRemoveFromDeveloper,
  onRemoveFromPublisher,
  scrollContainerRef,
  enableVirtualization = true,
  forceSingleColumnVirtualized = false,
  platformIdForPlay,
  allCollectionLikes,
  collectionLikeResourceType,
  sliderParentCollectionLikeId,
  onRemoveChildFromSliderParent,
  onCollectionLikePseudoEdit,
  onPlayFirstInCollectionLike,
  onCollectionLikePseudoAddToParent,
  onCollectionLikePseudoUpdated,
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
    enableVirtualization &&
    (forceSingleColumnVirtualized || games.length > VIRTUALIZATION_THRESHOLD) &&
    !draggable; // Don't use virtualization when dragging is enabled
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
        className={`games-list-container${useVirtualization ? " games-list-container--virtualized" : ""}`}
        style={{ ["--games-list-cover-size" as string]: `${coverSize}px`, ...style } as CSSProperties}
      >
        {useVirtualization ? (
          <VirtualizedGamesList
            games={games}
            coverSize={coverSize}
            forceSingleColumn={forceSingleColumnVirtualized}
            coverCacheBustTimestamp={coverCacheBustTimestamp}
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
            developerId={developerId}
            publisherId={publisherId}
            onRemoveFromDeveloper={onRemoveFromDeveloper}
            onRemoveFromPublisher={onRemoveFromPublisher}
            platformIdForPlay={platformIdForPlay}
            allCollectionLikes={allCollectionLikes}
            collectionLikeResourceType={collectionLikeResourceType}
            sliderParentCollectionLikeId={sliderParentCollectionLikeId}
            onRemoveChildFromSliderParent={onRemoveChildFromSliderParent}
            onCollectionLikePseudoEdit={onCollectionLikePseudoEdit}
            onPlayFirstInCollectionLike={onPlayFirstInCollectionLike}
            onCollectionLikePseudoAddToParent={onCollectionLikePseudoAddToParent}
            onCollectionLikePseudoUpdated={onCollectionLikePseudoUpdated}
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
              coverCacheBustTimestamp={coverCacheBustTimestamp}
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
              developerId={developerId}
              publisherId={publisherId}
              onRemoveFromDeveloper={onRemoveFromDeveloper}
              onRemoveFromPublisher={onRemoveFromPublisher}
              platformIdForPlay={platformIdForPlay}
              allCollectionLikes={allCollectionLikes}
              collectionLikeResourceType={collectionLikeResourceType}
              sliderParentCollectionLikeId={sliderParentCollectionLikeId}
              onRemoveChildFromSliderParent={onRemoveChildFromSliderParent}
              onCollectionLikePseudoEdit={onCollectionLikePseudoEdit}
              onPlayFirstInCollectionLike={onPlayFirstInCollectionLike}
              onCollectionLikePseudoAddToParent={onCollectionLikePseudoAddToParent}
              onCollectionLikePseudoUpdated={onCollectionLikePseudoUpdated}
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
