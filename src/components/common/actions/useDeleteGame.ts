import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";

type UseDeleteGameParams = {
  gameId?: string;
  collectionId?: string;
  onGameDelete?: (gameId: string) => void;
  onCollectionDelete?: (collectionId: string) => void;
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
  onGameDelete,
  onCollectionDelete,
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

      // Determine if we're deleting a game or a collection
      if (gameId) {
        url = buildApiUrl(API_BASE, `/games/${gameId}`);
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
        } else if (collectionId && onCollectionDelete) {
          onCollectionDelete(collectionId);
        }
        
        // Emit custom event to notify App.tsx and other components
        if (gameId) {
          window.dispatchEvent(new CustomEvent("gameDeleted", { detail: { gameId } }));
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

