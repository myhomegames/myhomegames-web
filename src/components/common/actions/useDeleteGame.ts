import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../../config";
import { buildApiUrl, buildApiHeaders } from "../../../utils/api";
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
    setIsDeleting(true);
    setDeleteError(null);
    setLoading(true);

    try {
      let url: string;

      if (gameId) {
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
        headers: buildApiHeaders(),
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

        if (gameId) {
          window.dispatchEvent(new CustomEvent("gameDeleted", { detail: { gameId } }));
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
