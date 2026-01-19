import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { buildApiUrl } from "../../utils/api";
import Cover from "../games/Cover";
import EditCollectionModal from "../collections/EditCollectionModal";
import { useCollectionHasPlayableGame } from "../common/hooks/useCollectionHasPlayableGame";
import VirtualizedCollectionsList from "./VirtualizedCollectionsList";
import type { CollectionItem, CollectionInfo, GameItem } from "../../types";
import "./CollectionsList.css";

const VIRTUALIZATION_THRESHOLD = 100; // Use virtual scrolling when there are more than this many items

type CollectionsListProps = {
  collections: CollectionItem[];
  onCollectionClick: (collection: CollectionItem) => void;
  onPlay?: (game: GameItem) => void;
  onCollectionUpdate?: (updatedCollection: CollectionItem) => void;
  onCollectionDelete?: (deletedCollection: CollectionItem) => void;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  coverSize?: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
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

export function CollectionListItem({
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
  
  // Check if any game in collection has executables
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
        // Find the first game that has executables (for playing)
        const gameWithExecutables = games.find((g: any) => g.executables && g.executables.length > 0);
        if (gameWithExecutables) {
          const gameItem: GameItem = {
            id: gameWithExecutables.id,
            title: gameWithExecutables.title,
            summary: gameWithExecutables.summary || "",
            cover: gameWithExecutables.cover,
            day: gameWithExecutables.day || null,
            month: gameWithExecutables.month || null,
            year: gameWithExecutables.year || null,
            stars: gameWithExecutables.stars || null,
            genre: gameWithExecutables.genre || null,
            executables: gameWithExecutables.executables || null,
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
      ref={(el) => {
        if (el && itemRefs?.current) {
          itemRefs.current.set(String(collection.id), el);
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
  scrollContainerRef,
}: CollectionsListProps) {
  const { t } = useTranslation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CollectionInfo | null>(null);
  
  if (collections.length === 0) {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
        }}
      >
        <div className="text-gray-400 text-center">{t("collections.noCollectionsFound")}</div>
      </div>
    );
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

  // Use virtual scrolling for large lists
  const useVirtualization = collections.length > VIRTUALIZATION_THRESHOLD;
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={containerRef}
        className="collections-list-container"
        style={{
          gridTemplateColumns: useVirtualization ? undefined : `repeat(auto-fill, ${coverSize}px)`,
          height: useVirtualization ? "100%" : undefined,
        }}
      >
        {useVirtualization ? (
          <VirtualizedCollectionsList
            collections={collections}
            coverSize={coverSize}
            containerRef={scrollContainerRef || containerRef}
            itemRefs={itemRefs}
            onCollectionClick={onCollectionClick}
            onPlay={onPlay}
            onEditClick={handleEditClick}
            onCollectionDelete={onCollectionDelete}
            onCollectionUpdate={onCollectionUpdate}
            buildCoverUrl={buildCoverUrl}
          />
        ) : (
          collections.map((collection) => (
            <CollectionListItem
              key={String(collection.id)}
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
          ))
        )}
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

