import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../config";
import { buildApiUrl, buildApiHeaders } from "../../utils/api";
import { dispatchCollectionLikeChildLinked } from "../../utils/companyProfileSync";
import type { CollectionItem } from "../../types";
import type { CollectionLikeResourceType } from "./EditCollectionLikeModal";
import {
  useCreateCollection,
  useCreateDeveloper,
  useCreatePublisher,
} from "../common/actions";
const RESOURCE_CONFIG: Record<
  CollectionLikeResourceType,
  {
    titleKey: string;
    searchKey: string;
    emptyKey: string;
    newTitlePlaceholderKey: string;
  }
> = {
  collections: {
    titleKey: "collections.addToCollection",
    searchKey: "collections.searchCollections",
    emptyKey: "collections.noCollectionsFound",
    newTitlePlaceholderKey: "collections.newCollectionTitle",
  },
  developers: {
    titleKey: "catalogInfo.addToDeveloper",
    searchKey: "catalogInfo.searchDevelopers",
    emptyKey: "catalogInfo.noDevelopersFound",
    newTitlePlaceholderKey: "catalogInfo.newDeveloperName",
  },
  publishers: {
    titleKey: "catalogInfo.addToPublisher",
    searchKey: "catalogInfo.searchPublishers",
    emptyKey: "catalogInfo.noPublishersFound",
    newTitlePlaceholderKey: "catalogInfo.newPublisherName",
  },
};

type AddCollectionLikeToCollectionLikeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sourceItem: CollectionItem;
  resourceType: CollectionLikeResourceType;
  allItems: CollectionItem[];
  onLinked?: () => void;
};

export default function AddCollectionLikeToCollectionLikeModal({
  isOpen,
  onClose,
  sourceItem,
  resourceType,
  allItems,
  onLinked,
}: AddCollectionLikeToCollectionLikeModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState(
    resourceType === "collections" ? sourceItem.title : ""
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const config = RESOURCE_CONFIG[resourceType];

  const createCollection = useCreateCollection({ onError: setError });
  const createDeveloper = useCreateDeveloper({ onError: setError });
  const createPublisher = useCreatePublisher({ onError: setError });

  const isCreating =
    resourceType === "collections"
      ? createCollection.isCreating
      : resourceType === "developers"
        ? createDeveloper.isCreating
        : createPublisher.isCreating;

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery("");
    setError(null);
    setNewItemTitle(resourceType === "collections" ? sourceItem.title : "");
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      createInputRef.current?.focus();
      if (resourceType === "collections" && createInputRef.current?.value) {
        createInputRef.current.select();
      }
    }, 0);
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, resourceType, sourceItem.title]);

  const availableParents = useMemo(() => {
    const sourceId = String(sourceItem.id);
    return allItems.filter((item) => {
      if (String(item.id) === sourceId) return false;
      const childs = Array.isArray(item.childs) ? item.childs.map((id) => String(id)) : [];
      return !childs.includes(sourceId);
    });
  }, [allItems, sourceItem.id]);

  const filteredParents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableParents;
    return availableParents.filter((item) => (item.title || "").toLowerCase().includes(q));
  }, [searchQuery, availableParents]);

  const linkToParent = async (parent: CollectionItem) => {
    setIsLinking(true);
    setError(null);
    try {
      const url = buildApiUrl(
        API_BASE,
        `/${resourceType}/${encodeURIComponent(String(parent.id))}/childs/${encodeURIComponent(String(sourceItem.id))}`
      );
      const res = await fetch(url, {
        method: "POST",
        headers: buildApiHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const recentKey = `recentCollectionLikeParents_${resourceType}`;
      const current = JSON.parse(localStorage.getItem(recentKey) || "[]") as string[];
      const next = [String(parent.id), ...current.filter((id) => String(id) !== String(parent.id))].slice(0, 5);
      localStorage.setItem(recentKey, JSON.stringify(next));

      if (resourceType === "collections") {
        window.dispatchEvent(
          new CustomEvent("collectionUpdated", { detail: { collectionId: String(parent.id) } })
        );
      } else {
        dispatchCollectionLikeChildLinked(resourceType, parent.id, sourceItem.id);
        if (resourceType === "developers") {
          window.dispatchEvent(new CustomEvent("developerUpdated", { detail: {} }));
        } else {
          window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: {} }));
        }
      }

      onLinked?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLinking(false);
    }
  };

  const handleLink = (parent: CollectionItem) => {
    if (!isLinking && !isCreating) void linkToParent(parent);
  };

  const handleCreateNew = async () => {
    const title = newItemTitle.trim();
    if (!title || isLinking || isCreating) return;
    setError(null);

    let parent: CollectionItem | null = null;
    if (resourceType === "collections") {
      parent = await createCollection.createCollection(title);
    } else if (resourceType === "developers") {
      parent = await createDeveloper.createDeveloper(title);
    } else {
      parent = await createPublisher.createPublisher(title);
    }

    if (parent) {
      await linkToParent(parent);
    }
  };

  if (!isOpen) return null;

  const busy = isLinking || isCreating;

  return createPortal(
    <div className="add-to-collection-modal-overlay" onClick={onClose}>
      <div className="add-to-collection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-to-collection-modal-header">
          <h2>{t(config.titleKey)}</h2>
          <button type="button" className="add-to-collection-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && (
          <div className="add-to-collection-modal-error" role="alert">
            {error}
          </div>
        )}

        <div className="add-to-collection-modal-search">
          <input
            ref={searchRef}
            id="add-collectionlike-to-parent-search"
            name="search"
            type="text"
            placeholder={t(config.searchKey)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t(config.searchKey)}
          />
        </div>

        <div className="add-to-collection-modal-collections">
          {filteredParents.length > 0 ? (
            filteredParents.map((item) => (
              <div
                key={String(item.id)}
                className="add-to-collection-modal-collection-item"
                onClick={() => handleLink(item)}
              >
                <div className="add-to-collection-modal-collection-title">{item.title}</div>
              </div>
            ))
          ) : (
            <div className="add-to-collection-modal-empty">{t(config.emptyKey)}</div>
          )}
        </div>

        <div className="add-to-collection-modal-create">
          <input
            ref={createInputRef}
            id="add-collectionlike-to-parent-create-title"
            name="newItemTitle"
            type="text"
            placeholder={t(config.newTitlePlaceholderKey)}
            value={newItemTitle}
            onChange={(e) => {
              setNewItemTitle(e.target.value);
              setError(null);
            }}
            onFocus={(e) => {
              if (e.target.value) e.target.select();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateNew();
            }}
            aria-label={t(config.newTitlePlaceholderKey)}
          />
          <button
            type="button"
            onClick={() => void handleCreateNew()}
            disabled={!newItemTitle.trim() || busy}
            className="add-to-collection-modal-create-button"
          >
            {busy
              ? isCreating
                ? t("common.creating", "Creating...")
                : t("common.adding", "Adding...")
              : t("common.create", "Create")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
