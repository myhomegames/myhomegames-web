import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { buildApiUrl } from "../../utils/api";
import type { CollectionItem } from "../../types";
import type { CollectionLikeResourceType } from "./EditCollectionLikeModal";
import "./../games/AddToCollectionModal.css";

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
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery("");
    setError(null);
    document.body.style.overflow = "hidden";
    setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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

  const typeKey =
    resourceType === "collections"
      ? "collections.addToCollection"
      : resourceType === "developers"
        ? "igdbInfo.addToDeveloper"
        : "igdbInfo.addToPublisher";

  const searchKey =
    resourceType === "collections"
      ? "collections.searchCollections"
      : resourceType === "developers"
        ? "igdbInfo.searchDevelopers"
        : "igdbInfo.searchPublishers";

  const emptyKey =
    resourceType === "collections"
      ? "collections.noCollectionsFound"
      : resourceType === "developers"
        ? "igdbInfo.noDevelopersFound"
        : "igdbInfo.noPublishersFound";

  const handleLink = async (parent: CollectionItem) => {
    const token = getApiToken();
    if (!token) return;
    setIsLinking(true);
    setError(null);
    try {
      const url = buildApiUrl(
        API_BASE,
        `/${resourceType}/${encodeURIComponent(String(parent.id))}/childs/${encodeURIComponent(String(sourceItem.id))}`
      );
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "X-Auth-Token": token,
        },
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
      } else if (resourceType === "developers") {
        window.dispatchEvent(new CustomEvent("developerUpdated", { detail: {} }));
      } else {
        window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: {} }));
      }

      onLinked?.();
      onClose();
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setIsLinking(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="add-to-collection-modal-overlay" onClick={onClose}>
      <div className="add-to-collection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-to-collection-modal-header">
          <h2>{t(typeKey)}</h2>
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
            placeholder={t(searchKey)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t(searchKey)}
          />
        </div>

        <div className="add-to-collection-modal-collections">
          {filteredParents.length > 0 ? (
            filteredParents.map((item) => (
              <div
                key={String(item.id)}
                className="add-to-collection-modal-collection-item"
                onClick={() => !isLinking && handleLink(item)}
              >
                <div className="add-to-collection-modal-collection-title">{item.title}</div>
              </div>
            ))
          ) : (
            <div className="add-to-collection-modal-empty">{t(emptyKey)}</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
