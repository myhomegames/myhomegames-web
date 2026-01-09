import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../../utils/api";
import { API_BASE, getApiToken } from "../../../config";
import { useLoading } from "../../../contexts/LoadingContext";
import type { CollectionItem } from "../../../types";

type UseCreateCollectionParams = {
  onSuccess?: (collection: CollectionItem) => void;
  onError?: (error: string) => void;
};

type UseCreateCollectionReturn = {
  isCreating: boolean;
  createCollection: (title: string, summary?: string) => Promise<CollectionItem | null>;
};

export function useCreateCollection({
  onSuccess,
  onError,
}: UseCreateCollectionParams = {}): UseCreateCollectionReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [isCreating, setIsCreating] = useState(false);

  const createCollection = async (
    title: string,
    summary?: string
  ): Promise<CollectionItem | null> => {
    const apiToken = getApiToken();
    if (!apiToken) {
      onError?.(t("common.unauthorized", "Unauthorized"));
      return null;
    }

    if (!title || title.trim() === "") {
      onError?.(t("collections.titleRequired", "Collection title is required"));
      return null;
    }

    setIsCreating(true);
    setLoading(true);

    try {
      // Create collection via POST endpoint
      const url = buildApiUrl(API_BASE, "/collections");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": apiToken,
        },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary?.trim() || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create collection: ${response.status}`);
      }

      const data = await response.json();
      const newCollection: CollectionItem = {
        id: data.collection.id,
        title: data.collection.title,
        summary: data.collection.summary,
        cover: data.collection.cover,
        gameCount: 0,
      };

      // Emit custom event for collection addition
      window.dispatchEvent(new CustomEvent("collectionAdded", { detail: { collection: newCollection } }));

      onSuccess?.(newCollection);
      return newCollection;
    } catch (error: any) {
      const errorMessage = String(error.message || error);
      console.error("Error creating collection:", errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setIsCreating(false);
      setLoading(false);
    }
  };

  return {
    isCreating,
    createCollection,
  };
}

