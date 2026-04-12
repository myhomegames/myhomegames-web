import { useState, useRef, useMemo } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { buildApiUrl } from "../../utils/api";
import Cover from "../games/Cover";
import EditCollectionLikeModal, { type CollectionLikeResourceType } from "../collections/EditCollectionLikeModal";
import AddCollectionLikeToCollectionLikeModal from "../collections/AddCollectionLikeToCollectionLikeModal";
import { useCollectionHasPlayableGame } from "../common/hooks/useCollectionHasPlayableGame";
import VirtualizedCollectionsList from "./VirtualizedCollectionsList";
import type { CollectionItem, CollectionInfo, GameItem } from "../../types";
import { filterRootCollectionLikes } from "../../utils/stringUtils";
const VIRTUALIZATION_THRESHOLD = 100; // Use virtual scrolling when there are more than this many items

export type GamesPathType = "collections" | "developers" | "publishers";

type CollectionsListProps = {
  collections: CollectionItem[];
  /** Full list (root + children) for computing display count (games + sub-collections). When not set, uses collections. */
  allItemsForCount?: CollectionItem[];
  onCollectionClick: (collection: CollectionItem) => void;
  onPlay?: (game: GameItem) => void;
  onCollectionUpdate?: (updatedCollection: CollectionItem) => void;
  onCollectionDelete?: (deletedCollection: CollectionItem) => void;
  /** Quando true, non mostrare il messaggio "nessun *** trovato" (come in Library) */
  isLoading?: boolean;
  /** When false, hide edit/delete (e.g. for developers/publishers list) */
  showEdit?: boolean;
  /** Games endpoint path for play button (collections vs developers vs publishers) */
  gamesPath?: GamesPathType;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  coverSize?: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

type CollectionListItemProps = {
  collection: CollectionItem;
  /** Total count to show (games + sub-collections). When set, used for subtitle instead of gameCount. */
  displayCount?: number;
  onCollectionClick: (collection: CollectionItem) => void;
  onPlay?: (game: GameItem) => void;
  onEditClick?: (collection: CollectionItem) => void;
  onCollectionDelete?: (deletedCollection: CollectionItem) => void;
  onCollectionUpdate?: (updatedCollection: CollectionItem) => void;
  onAddToCollectionLike?: (collection: CollectionItem, parentId?: string) => void;
  allCollectionLikes?: CollectionItem[];
  gamesPath?: GamesPathType;
  buildCoverUrl: (apiBase: string, cover?: string, addTimestamp?: boolean) => string;
  coverSize: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
};

export function CollectionListItem({
  collection,
  displayCount,
  onCollectionClick,
  onPlay,
  onEditClick,
  onCollectionDelete,
  onCollectionUpdate,
  onAddToCollectionLike,
  allCollectionLikes = [],
  gamesPath = "collections",
  buildCoverUrl,
  coverSize,
  itemRefs,
}: CollectionListItemProps) {
  const { t } = useTranslation();
  const coverHeight = coverSize * 1.5;
  const count = displayCount ?? collection.gameCount;
  const subtitle = count !== undefined ? t("common.elements", { count }) : undefined;

  // Track previous cover value to detect changes (same as GameListItem – stable URL avoids flicker on scroll)
  const prevCoverRef = useRef<string | undefined>(collection.cover);
  const coverChanged = prevCoverRef.current !== collection.cover;
  if (coverChanged) {
    prevCoverRef.current = collection.cover;
  }
  const coverUrl = useMemo(() => {
    return collection.cover ? buildCoverUrl(API_BASE, collection.cover, coverChanged) : "";
  }, [collection.cover, coverChanged, buildCoverUrl]);
  
  // Check if any game in collection has executables (only for collections)
  const { hasPlayableGame } = useCollectionHasPlayableGame(
    collection.id,
    gamesPath === "collections"
  );

  const handlePlayClick = async () => {
    if (!onPlay) return;
    
    try {
      const url = buildApiUrl(API_BASE, `/${gamesPath}/${collection.id}/games`);
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
      className="group cursor-pointer collections-list-item collections-list-item--sized"
    >
      <Cover
        key={`${collection.id}-${collection.cover}`}
        title={collection.title}
        coverUrl={coverUrl}
        width={coverSize}
        height={coverHeight}
        onPlay={onPlay ? handlePlayClick : undefined}
        onClick={() => onCollectionClick(collection)}
        onEdit={onEditClick ? () => onEditClick(collection) : undefined}
        collectionId={gamesPath === "collections" ? collection.id : undefined}
        developerId={gamesPath === "developers" ? collection.id : undefined}
        publisherId={gamesPath === "publishers" ? collection.id : undefined}
        collectionTitle={collection.title}
        onCollectionDelete={onCollectionDelete ? (deletedId: string) => {
          if (String(collection.id) === String(deletedId)) {
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
        onAddToCollection={onAddToCollectionLike ? (parentId?: string) => onAddToCollectionLike(collection, parentId) : undefined}
        sourceCollectionLike={collection}
        allCollectionLikes={allCollectionLikes}
        collectionLikeResourceType={gamesPath as CollectionLikeResourceType}
        showTitle={collection.showTitle !== false}
        subtitle={subtitle}
        detail={true}
        play={gamesPath === "collections" ? hasPlayableGame === true : !!onPlay}
        showBorder={true}
      />
    </div>
  );
}

export default function CollectionsList({
  collections,
  allItemsForCount,
  onCollectionClick,
  onPlay,
  onCollectionUpdate,
  onCollectionDelete,
  isLoading = false,
  showEdit = true,
  gamesPath = "collections",
  buildCoverUrl,
  coverSize = 150,
  itemRefs,
  scrollContainerRef,
}: CollectionsListProps) {
  const { t } = useTranslation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CollectionInfo | null>(null);
  const [linkSourceCollectionLike, setLinkSourceCollectionLike] = useState<CollectionItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Display count = games assigned directly + first-level sub-collections only (not grandchildren).
  const displayCountById = useMemo(() => {
    const listForCount = allItemsForCount ?? collections;
    const byId = new Map(listForCount.map((i) => [String(i.id), i]));
    const map: Record<string, number> = {};
    for (const c of collections) {
      const childIds = Array.isArray(c.childs) ? c.childs : [];
      const directChildrenOnly = filterRootCollectionLikes(
        childIds
          .map((id) => byId.get(String(id)))
          .filter((v): v is CollectionItem => Boolean(v))
      );
      const subCount = directChildrenOnly.length;
      map[String(c.id)] = (c.gameCount ?? 0) + subCount;
    }
    return map;
  }, [collections, allItemsForCount]);

  // Durante il caricamento non mostrare nulla (come in Library)
  if (isLoading && collections.length === 0) return null;
  // Messaggio "nessun *** trovato" solo a caricamento finito
  if (!isLoading && collections.length === 0) {
    const emptyMessageKey =
      gamesPath === "developers"
        ? "igdbInfo.noDevelopersFound"
        : gamesPath === "publishers"
          ? "igdbInfo.noPublishersFound"
          : "collections.noCollectionsFound";
    return (
      <div className="collections-list-empty">
        <div className="text-gray-400 text-center">{t(emptyMessageKey)}</div>
      </div>
    );
  }

  const handleEditClick = (collection: CollectionItem) => {
    if (!showEdit) return;
    // Convert CollectionItem to CollectionInfo using available data
    const collectionInfo: CollectionInfo = {
      id: collection.id,
      title: collection.title,
      summary: collection.summary,
      cover: collection.cover,
      background: collection.background,
      showTitle: (collection as any).showTitle !== false,
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
      const current = collections.find((c) => String(c.id) === String(updatedCollection.id));
      const updatedItem: CollectionItem = {
        id: updatedCollection.id,
        title: updatedCollection.title,
        summary: updatedCollection.summary,
        cover: updatedCollection.cover,
        background: updatedCollection.background,
        showTitle: (updatedCollection as any).showTitle !== false,
        gameCount: current?.gameCount,
      };
      onCollectionUpdate(updatedItem);
    }
    handleEditModalClose();
  };

  const addCollectionLikeToParent = async (source: CollectionItem, parentId?: string) => {
    if (!parentId) {
      setLinkSourceCollectionLike(source);
      return;
    }
    const token = getApiToken();
    if (!token) return;
    try {
      const url = buildApiUrl(
        API_BASE,
        `/${gamesPath}/${encodeURIComponent(String(parentId))}/childs/${encodeURIComponent(String(source.id))}`
      );
      const res = await fetch(url, {
        method: "POST",
        headers: { "X-Auth-Token": token },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const recentKey = `recentCollectionLikeParents_${gamesPath}`;
      const current = JSON.parse(localStorage.getItem(recentKey) || "[]") as string[];
      const next = [String(parentId), ...current.filter((id) => String(id) !== String(parentId))].slice(0, 5);
      localStorage.setItem(recentKey, JSON.stringify(next));

      if (gamesPath === "collections") {
        window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collectionId: String(parentId) } }));
      } else if (gamesPath === "developers") {
        window.dispatchEvent(new CustomEvent("developerUpdated", { detail: {} }));
      } else {
        window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: {} }));
      }
    } catch (err) {
      console.error("Error adding collection-like to parent:", err);
    }
  };

  // Use virtual scrolling for large lists
  const useVirtualization = collections.length > VIRTUALIZATION_THRESHOLD;

  return (
    <>
      <div
        ref={containerRef}
        className={`collections-list-container${useVirtualization ? " collections-list-container--virtualized" : ""}`}
        style={{ ["--collections-list-cover-size" as string]: `${coverSize}px` } as CSSProperties}
      >
        {useVirtualization ? (
          <VirtualizedCollectionsList
            collections={collections}
            displayCountById={displayCountById}
            coverSize={coverSize}
            containerRef={scrollContainerRef || containerRef}
            itemRefs={itemRefs}
            onCollectionClick={onCollectionClick}
            onPlay={onPlay}
            onEditClick={showEdit ? handleEditClick : undefined}
            onCollectionDelete={onCollectionDelete}
            onCollectionUpdate={onCollectionUpdate}
            onAddToCollectionLike={(collection, parentId) => addCollectionLikeToParent(collection, parentId)}
            allCollectionLikes={allItemsForCount ?? collections}
            gamesPath={gamesPath}
            buildCoverUrl={buildCoverUrl}
          />
        ) : (
          collections.map((collection) => (
            <CollectionListItem
              key={String(collection.id)}
              collection={collection}
              displayCount={displayCountById[String(collection.id)]}
              onCollectionClick={onCollectionClick}
              onPlay={onPlay}
              onEditClick={showEdit ? handleEditClick : undefined}
              onCollectionDelete={onCollectionDelete}
              onCollectionUpdate={onCollectionUpdate}
              onAddToCollectionLike={(collection, parentId) => addCollectionLikeToParent(collection, parentId)}
              allCollectionLikes={allItemsForCount ?? collections}
              gamesPath={gamesPath}
              buildCoverUrl={buildCoverUrl}
              coverSize={coverSize}
              itemRefs={itemRefs}
            />
          ))
        )}
      </div>
      {selectedCollection && (
        <EditCollectionLikeModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          resourceType={gamesPath as CollectionLikeResourceType}
          item={selectedCollection}
          onItemUpdate={handleCollectionUpdate}
        />
      )}
      {linkSourceCollectionLike && (
        <AddCollectionLikeToCollectionLikeModal
          isOpen={true}
          onClose={() => setLinkSourceCollectionLike(null)}
          sourceItem={linkSourceCollectionLike}
          resourceType={gamesPath as CollectionLikeResourceType}
          allItems={allItemsForCount ?? collections}
          onLinked={() => setLinkSourceCollectionLike(null)}
        />
      )}
    </>
  );
}

