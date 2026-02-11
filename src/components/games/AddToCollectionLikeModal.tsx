import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { CollectionItem, GameItem } from "../../types";
import {
  useAddGameToCollection,
  useAddGameToDeveloper,
  useAddGameToPublisher,
  useCreateCollection,
} from "../common/actions";
import { useCollections } from "../../contexts/CollectionsContext";
import { useDevelopers } from "../../contexts/DevelopersContext";
import { usePublishers } from "../../contexts/PublishersContext";
import "./AddToCollectionModal.css";

export type AddToResourceType = "collections" | "developers" | "publishers";

const RESOURCE_CONFIG: Record<
  AddToResourceType,
  { titleKey: string; searchKey: string; emptyKey: string; recentKey?: string }
> = {
  collections: {
    titleKey: "collections.addToCollection",
    searchKey: "collections.searchCollections",
    emptyKey: "collections.noCollectionsFound",
    recentKey: "recentCollections",
  },
  developers: {
    titleKey: "igdbInfo.addToDeveloper",
    searchKey: "igdbInfo.searchDevelopers",
    emptyKey: "igdbInfo.noDevelopersFound",
    recentKey: "recentDevelopers",
  },
  publishers: {
    titleKey: "igdbInfo.addToPublisher",
    searchKey: "igdbInfo.searchPublishers",
    emptyKey: "igdbInfo.noPublishersFound",
    recentKey: "recentPublishers",
  },
};

type AddToCollectionLikeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  game: GameItem;
  resourceType: AddToResourceType;
  onAdded?: () => void;
};

export default function AddToCollectionLikeModal({
  isOpen,
  onClose,
  game,
  resourceType,
  onAdded,
}: AddToCollectionLikeModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [newCollectionTitle, setNewCollectionTitle] = useState(game.title);
  const createInputRef = useRef<HTMLInputElement>(null);

  const config = RESOURCE_CONFIG[resourceType];
  const { collections, collectionGameIds } = useCollections();
  const { developers } = useDevelopers();
  const { publishers } = usePublishers();

  const allItems: CollectionItem[] =
    resourceType === "collections"
      ? collections
      : resourceType === "developers"
        ? developers
        : publishers;

  const addGameToCollection = useAddGameToCollection({
    onSuccess: () => {
      onAdded?.();
      onClose();
    },
  });

  const addGameToDeveloper = useAddGameToDeveloper({
    onSuccess: () => {
      onAdded?.();
      onClose();
    },
  });

  const addGameToPublisher = useAddGameToPublisher({
    onSuccess: () => {
      onAdded?.();
      onClose();
    },
  });

  const createCollection = useCreateCollection({
    onSuccess: async (newCollection) => {
      if (newCollection) {
        await addGameToCollection.addGameToCollection(game.id, newCollection.id);
      }
    },
  });

  // Filter out items that already contain this game
  const availableItems = useMemo(() => {
    if (resourceType === "collections") {
      return allItems.filter((item) => {
        const gameIds = collectionGameIds.get(String(item.id));
        return !gameIds || !gameIds.includes(String(game.id));
      });
    }
    if (resourceType === "developers") {
      const gameDevIds = (game.developers || []).map((d: any) =>
        Number(typeof d === "object" ? d?.id : d)
      );
      return allItems.filter((item) => !gameDevIds.includes(Number(item.id)));
    }
    if (resourceType === "publishers") {
      const gamePubIds = (game.publishers || []).map((p: any) =>
        Number(typeof p === "object" ? p?.id : p)
      );
      return allItems.filter((item) => !gamePubIds.includes(Number(item.id)));
    }
    return [];
  }, [allItems, collectionGameIds, game.id, game.developers, game.publishers, resourceType]);

  useEffect(() => {
    if (isOpen) {
      setNewCollectionTitle(game.title);
      setSearchQuery("");
      document.body.style.overflow = "hidden";
      if (resourceType === "collections") {
        setTimeout(() => {
          createInputRef.current?.focus();
          createInputRef.current?.select();
        }, 0);
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, game.title, resourceType]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return availableItems;
    const query = searchQuery.toLowerCase();
    return availableItems.filter((item) =>
      (item.title || "").toLowerCase().includes(query)
    );
  }, [searchQuery, availableItems]);

  const handleItemClick = async (item: CollectionItem) => {
    if (resourceType === "collections") {
      await addGameToCollection.addGameToCollection(game.id, item.id);
    } else if (resourceType === "developers") {
      await addGameToDeveloper.addGameToDeveloper(
        game.id,
        String(item.id),
        item.title || ""
      );
    } else if (resourceType === "publishers") {
      await addGameToPublisher.addGameToPublisher(
        game.id,
        String(item.id),
        item.title || ""
      );
    }
  };

  const handleCreateCollection = async () => {
    if (resourceType === "collections" && newCollectionTitle.trim()) {
      await createCollection.createCollection(newCollectionTitle.trim());
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="add-to-collection-modal-overlay" onClick={onClose}>
      <div className="add-to-collection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-to-collection-modal-header">
          <h2>{t(config.titleKey)}</h2>
          <button className="add-to-collection-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="add-to-collection-modal-search">
          <input
            id="add-to-collection-search"
            name="search"
            type="text"
            placeholder={t(config.searchKey)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            aria-label={t(config.searchKey)}
          />
        </div>

        <div className="add-to-collection-modal-collections">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={String(item.id)}
                className="add-to-collection-modal-collection-item"
                onClick={() => handleItemClick(item)}
              >
                <div className="add-to-collection-modal-collection-title">
                  {item.title}
                </div>
                {item.gameCount !== undefined && (
                  <div className="add-to-collection-modal-collection-count">
                    {item.gameCount} {t("collections.games", "games")}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="add-to-collection-modal-empty">
              {t(config.emptyKey)}
            </div>
          )}
        </div>

        {resourceType === "collections" && (
          <div className="add-to-collection-modal-create">
            <input
              ref={createInputRef}
              id="add-to-collection-create-title"
              name="newCollectionTitle"
              type="text"
              placeholder={t("collections.newCollectionTitle", "New collection title")}
              value={newCollectionTitle}
              onChange={(e) => setNewCollectionTitle(e.target.value)}
              onFocus={(e) => {
                if (e.target.value) e.target.select();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCollection();
              }}
              aria-label={t("collections.newCollectionTitle", "New collection title")}
            />
            <button
              onClick={handleCreateCollection}
              disabled={!newCollectionTitle.trim() || createCollection.isCreating}
              className="add-to-collection-modal-create-button"
            >
              {createCollection.isCreating
                ? t("common.creating", "Creating...")
                : t("common.create", "Create")}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
