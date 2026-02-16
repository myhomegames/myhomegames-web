import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../../utils/api";
import { API_BASE, getApiToken } from "../../../config";
import { useLoading } from "../../../contexts/LoadingContext";
import type { CollectionItem } from "../../../types";

type UseCreatePublisherParams = {
  onSuccess?: (publisher: CollectionItem) => void;
  onError?: (error: string) => void;
};

type UseCreatePublisherReturn = {
  isCreating: boolean;
  createPublisher: (title: string, summary?: string) => Promise<CollectionItem | null>;
};

export function useCreatePublisher({
  onSuccess,
  onError,
}: UseCreatePublisherParams = {}): UseCreatePublisherReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [isCreating, setIsCreating] = useState(false);

  const createPublisher = async (
    title: string,
    summary?: string
  ): Promise<CollectionItem | null> => {
    const apiToken = getApiToken();
    if (!apiToken) {
      onError?.(t("common.unauthorized", "Unauthorized"));
      return null;
    }

    if (!title || title.trim() === "") {
      onError?.(t("collections.titleRequired", "Title is required"));
      return null;
    }

    setIsCreating(true);
    setLoading(true);

    try {
      const url = buildApiUrl(API_BASE, "/publishers");
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

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409 && data.publisher) {
          const existing: CollectionItem = {
            id: String(data.publisher.id),
            title: data.publisher.title,
            gameCount: undefined,
          };
          onSuccess?.(existing);
          return existing;
        }
        throw new Error(data.error || `Failed to create publisher: ${response.status}`);
      }

      const pub = data.publisher;
      const newPublisher: CollectionItem = {
        id: String(pub.id),
        title: pub.title,
        summary: pub.summary,
        cover: pub.cover ?? undefined,
        gameCount: pub.gameCount ?? 0,
      };

      window.dispatchEvent(new CustomEvent("publisherAdded", { detail: { publisher: newPublisher } }));
      onSuccess?.(newPublisher);
      return newPublisher;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error creating publisher:", errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setIsCreating(false);
      setLoading(false);
    }
  };

  return {
    isCreating,
    createPublisher,
  };
}
