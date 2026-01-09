import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { buildApiUrl } from "../../utils/api";
import Cover from "../games/Cover";
import EditCollectionModal from "../collections/EditCollectionModal";
import { useCollectionHasPlayableGame } from "../common/hooks/useCollectionHasPlayableGame";
import type { CollectionItem, CollectionInfo, GameItem } from "../../types";
import "./CollectionsList.css";

type CollectionsListProps = {
  collections: CollectionItem[];
  onCollectionClick: (collection: CollectionItem) => void;
  onPlay?: (game: GameItem) => void;
  onCollectionUpdate?: (updatedCollection: CollectionItem) => void;
  onCollectionDelete?: (deletedCollection: CollectionItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  coverSize?: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
};

type CollectionListItemProps = {
  collection: CollectionItem;
  onCollectionClick: (collection: CollectionItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick: (collection: CollectionItem) => void;
  onCollectionDelete?: (deletedCollection: CollectionItem) => void;
  onCollectionUpdate?: (updatedCollection: CollectionItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  coverSize: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
};

function CollectionListItem({
  collection,
  onCollectionClick,
  onPlay,
  onEditClick,
  onCollectionDelete,
  onCollectionUpdate,
  buildCoverUrl,
  coverSize,
  itemRefs,
}: CollectionListItemProps) {
  const { t } = useTranslation();
  const coverHeight = coverSize * 1.5;
  
  // Check if any game in collection has command
  // Always enable the hook, not just when onPlay is defined
  const { hasPlayableGame } = useCollectionHasPlayableGame(
    collection.id,
    true // Always enabled to check if collection has playable games
  );

  const handlePlayClick = async () => {
    if (!onPlay) return;
    
    try {
      const url = buildApiUrl(API_BASE, `/collections/${collection.id}/games`);
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Auth-Token": getApiToken(),
        },
      });
      if (res.ok) {
        const json = await res.json();
        const games = json.games || [];
        // Find the first game that has a command (for playing)
        const gameWithCommand = games.find((g: any) => !!g.command);
        if (gameWithCommand) {
          const gameItem: GameItem = {
            id: gameWithCommand.id,
            title: gameWithCommand.title,
            summary: gameWithCommand.summary || "",
            cover: gameWithCommand.cover,
            day: gameWithCommand.day || null,
            month: gameWithCommand.month || null,
            year: gameWithCommand.year || null,
            stars: gameWithCommand.stars || null,
            genre: gameWithCommand.genre || null,
            command: gameWithCommand.command || null,
          };
          onPlay(gameItem);
        }
      }
    } catch (err) {
      console.error("Error fetching collection games for play:", err);
    }
  };

  return (
    <div
      key={collection.id}
      ref={(el) => {
        if (el && itemRefs?.current) {
          itemRefs.current.set(collection.id, el);
        }
      }}
      className="group cursor-pointer collections-list-item"
      style={{ width: `${coverSize}px`, minWidth: `${coverSize}px` }}
    >
      <Cover
        key={`${collection.id}-${collection.cover}`}
        title={collection.title}
        coverUrl={buildCoverUrl(API_BASE, collection.cover, true)}
        width={coverSize}
        height={coverHeight}
        onPlay={onPlay ? handlePlayClick : undefined}
        onClick={() => onCollectionClick(collection)}
        onEdit={() => onEditClick(collection)}
        collectionId={collection.id}
        collectionTitle={collection.title}
        onCollectionDelete={onCollectionDelete ? (collectionId: string) => {
          if (collection.id === collectionId) {
            onCollectionDelete(collection);
          }
        } : undefined}
        onCollectionUpdate={onCollectionUpdate ? (updatedCollection) => {
          // Convert CollectionInfo to CollectionItem
          const updatedItem: CollectionItem = {
            id: updatedCollection.id,
            title: updatedCollection.title,
            summary: updatedCollection.summary,
            cover: updatedCollection.cover,
            gameCount: collection.gameCount, // Mantieni il gameCount esistente
          };
          if (updatedItem.id === collection.id) {
            onCollectionUpdate(updatedItem);
          }
        } : undefined}
        showTitle={true}
        subtitle={collection.gameCount !== undefined ? `${collection.gameCount} ${t("common.elements")}` : undefined}
        detail={true}
        play={hasPlayableGame === true}
        showBorder={true}
      />
    </div>
  );
}

export default function CollectionsList({
  collections,
  onCollectionClick,
  onPlay,
  onCollectionUpdate,
  onCollectionDelete,
  buildCoverUrl,
  coverSize = 150,
  itemRefs,
}: CollectionsListProps) {
  const { t } = useTranslation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CollectionInfo | null>(null);
  
  if (collections.length === 0) {
    return <div className="text-gray-400 text-center">{t("table.noGames")}</div>;
  }

  const handleEditClick = (collection: CollectionItem) => {
    // Convert CollectionItem to CollectionInfo using available data
    const collectionInfo: CollectionInfo = {
      id: collection.id,
      title: collection.title,
      summary: collection.summary,
      cover: collection.cover,
      background: collection.background,
    };
    setSelectedCollection(collectionInfo);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedCollection(null);
  };

  const handleCollectionUpdate = (updatedCollection: CollectionInfo) => {
    if (onCollectionUpdate) {
      const updatedItem: CollectionItem = {
        id: updatedCollection.id,
        title: updatedCollection.title,
        summary: updatedCollection.summary,
        cover: updatedCollection.cover,
        background: updatedCollection.background,
      };
      onCollectionUpdate(updatedItem);
    }
    handleEditModalClose();
  };

  return (
    <>
      <div
        className="collections-list-container"
        style={{ gridTemplateColumns: `repeat(auto-fill, ${coverSize}px)` }}
      >
        {collections.map((collection) => (
          <CollectionListItem
            key={collection.id}
            collection={collection}
            onCollectionClick={onCollectionClick}
            onPlay={onPlay}
            onEditClick={handleEditClick}
            onCollectionDelete={onCollectionDelete}
            onCollectionUpdate={onCollectionUpdate}
            buildCoverUrl={buildCoverUrl}
            coverSize={coverSize}
            itemRefs={itemRefs}
          />
        ))}
      </div>
      {selectedCollection && (
        <EditCollectionModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          collection={selectedCollection}
          onCollectionUpdate={handleCollectionUpdate}
        />
      )}
    </>
  );
}

