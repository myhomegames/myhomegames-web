import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";

type UseDeleteGameParams = {
  gameId?: string;
  collectionId?: string;
  developerId?: string;
  publisherId?: string;
  onGameDelete?: (gameId: string) => void;
  onCollectionDelete?: (collectionId: string) => void;
  onDeveloperDelete?: (developerId: string) => void;
  onPublisherDelete?: (publisherId: string) => void;
  onModalClose?: () => void;
};

type UseDeleteGameReturn = {
  isDeleting: boolean;
  deleteError: string | null;
  showConfirmModal: boolean;
  handleDeleteClick: () => void;
  handleConfirmDelete: () => Promise<void>;
  handleCancelDelete: () => void;
};

export function useDeleteGame({
  gameId,
  collectionId,
  developerId,
  publisherId,
  onGameDelete,
  onCollectionDelete,
  onDeveloperDelete,
  onPublisherDelete,
  onModalClose,
}: UseDeleteGameParams): UseDeleteGameReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleDeleteClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    const apiToken = getApiToken();
    if (!apiToken) return;

    setIsDeleting(true);
    setDeleteError(null);
    setLoading(true);

    try {
      let url: string;
      let affectedCollectionIds: string[] = [];

      // Determine if we're deleting a game or a collection
      if (gameId) {
        // Find all collections that contain this game BEFORE deleting it
        try {
          const collectionsUrl = buildApiUrl(API_BASE, "/collections");
          const collectionsResponse = await fetch(collectionsUrl, {
            headers: {
              Accept: "application/json",
              "X-Auth-Token": apiToken,
            },
          });
          
          if (collectionsResponse.ok) {
            const collectionsData = await collectionsResponse.json();
            const collections = collectionsData.collections || [];
            
            // For each collection, check if it contains the game we're about to delete
            for (const collection of collections) {
              const gamesUrl = buildApiUrl(API_BASE, `/collections/${collection.id}/games`);
              const gamesResponse = await fetch(gamesUrl, {
                headers: {
                  Accept: "application/json",
                  "X-Auth-Token": apiToken,
                },
              });
              
              if (gamesResponse.ok) {
                const gamesData = await gamesResponse.json();
                const gameIds = (gamesData.games || []).map((g: any) => String(g.id));
                
                // If this collection contains the game, save its ID
                if (gameIds.includes(String(gameId))) {
                  affectedCollectionIds.push(String(collection.id));
                }
              }
            }
          }
        } catch (error) {
          console.error("Error finding collections for game before deletion:", error);
        }

        url = buildApiUrl(API_BASE, `/games/${gameId}`);
      } else if (developerId) {
        url = buildApiUrl(API_BASE, `/developers/${developerId}`);
      } else if (publisherId) {
        url = buildApiUrl(API_BASE, `/publishers/${publisherId}`);
      } else if (collectionId) {
        url = buildApiUrl(API_BASE, `/collections/${collectionId}`);
      } else {
        return;
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "X-Auth-Token": apiToken,
        },
      });

      if (response.ok) {
        if (gameId && onGameDelete) {
          onGameDelete(gameId);
        } else if (developerId && onDeveloperDelete) {
          onDeveloperDelete(developerId);
        } else if (publisherId && onPublisherDelete) {
          onPublisherDelete(publisherId);
        } else if (collectionId && onCollectionDelete) {
          onCollectionDelete(collectionId);
        }
        
        // Emit custom event to notify App.tsx and other components
        if (gameId) {
          window.dispatchEvent(new CustomEvent("gameDeleted", { detail: { gameId } }));
          
          // Emit collectionUpdated for all collections that contained the deleted game
          affectedCollectionIds.forEach((collectionId) => {
            window.dispatchEvent(new CustomEvent("collectionUpdated", { 
              detail: { collectionId } 
            }));
          });
        } else if (developerId) {
          window.dispatchEvent(new CustomEvent("developerDeleted", { detail: { developerId } }));
        } else if (publisherId) {
          window.dispatchEvent(new CustomEvent("publisherDeleted", { detail: { publisherId } }));
        } else if (collectionId) {
          window.dispatchEvent(new CustomEvent("collectionDeleted", { detail: { collectionId } }));
        }
        
        setShowConfirmModal(false);
        if (onModalClose) {
          onModalClose();
        }
      } else {
        setDeleteError(t("common.deleteError"));
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      setDeleteError(t("common.deleteError"));
    } finally {
      setIsDeleting(false);
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setDeleteError(null);
    if (onModalClose) {
      onModalClose();
    }
  };

  return {
    isDeleting,
    deleteError,
    showConfirmModal,
    handleDeleteClick,
    handleConfirmDelete,
    handleCancelDelete,
  };
}

