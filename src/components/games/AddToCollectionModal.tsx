import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { CollectionItem, GameItem } from "../../types";
import { useAddGameToCollection, useCreateCollection } from "../common/actions";
import { useCollections } from "../../contexts/CollectionsContext";
import "./AddToCollectionModal.css";

type AddToCollectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  game: GameItem;
  allCollections: CollectionItem[];
  onCollectionAdded?: () => void;
};

export default function AddToCollectionModal({
  isOpen,
  onClose,
  game,
  allCollections,
  onCollectionAdded,
}: AddToCollectionModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [newCollectionTitle, setNewCollectionTitle] = useState(game.title);
  const createInputRef = useRef<HTMLInputElement>(null);
  const { collectionGameIds } = useCollections();
  
  // Filter out collections that already contain this game
  const availableCollections = useMemo(() => {
    return allCollections.filter((collection) => {
      const gameIds = collectionGameIds.get(String(collection.id));
      return !gameIds || !gameIds.includes(String(game.id));
    });
  }, [allCollections, collectionGameIds, game.id]);
  
  const addGameToCollection = useAddGameToCollection({
    onSuccess: () => {
      onCollectionAdded?.();
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

  useEffect(() => {
    if (isOpen) {
      setNewCollectionTitle(game.title);
      setSearchQuery("");
      document.body.style.overflow = "hidden";
      // Focus on create input and select text when modal opens
      setTimeout(() => {
        if (createInputRef.current) {
          createInputRef.current.focus();
          createInputRef.current.select();
        }
      }, 0);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, game.title]);

  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableCollections;
    }
    const query = searchQuery.toLowerCase();
    return availableCollections.filter((collection) =>
      collection.title.toLowerCase().includes(query)
    );
  }, [searchQuery, availableCollections]);

  const handleCollectionClick = async (collectionId: string) => {
    await addGameToCollection.addGameToCollection(game.id, collectionId);
  };

  const handleCreateCollection = async () => {
    if (newCollectionTitle.trim()) {
      await createCollection.createCollection(newCollectionTitle.trim());
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="add-to-collection-modal-overlay" onClick={onClose}>
      <div className="add-to-collection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-to-collection-modal-header">
          <h2>{t("collections.addToCollection", "Add to Collection")}</h2>
          <button className="add-to-collection-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="add-to-collection-modal-search">
          <input
            id="add-to-collection-search"
            name="collectionSearch"
            type="text"
            placeholder={t("collections.searchCollections", "Search collections...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            aria-label={t("collections.searchCollections", "Search collections...")}
          />
        </div>

        <div className="add-to-collection-modal-collections">
          {filteredCollections.length > 0 ? (
            filteredCollections.map((collection) => (
              <div
                key={collection.id}
                className="add-to-collection-modal-collection-item"
                onClick={() => handleCollectionClick(collection.id)}
              >
                <div className="add-to-collection-modal-collection-title">
                  {collection.title}
                </div>
                {collection.gameCount !== undefined && (
                  <div className="add-to-collection-modal-collection-count">
                    {collection.gameCount} {t("collections.games", "games")}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="add-to-collection-modal-empty">
              {t("collections.noCollectionsFound", "No collections found")}
            </div>
          )}
        </div>

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
              if (e.target.value) {
                e.target.select();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateCollection();
              }
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
      </div>
    </div>,
    document.body
  );
}

