import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../../utils/api";
import { API_BASE, getApiToken } from "../../../config";
import { useLoading } from "../../../contexts/LoadingContext";
import type { CollectionItem } from "../../../types";

type UseCreateDeveloperParams = {
  onSuccess?: (developer: CollectionItem) => void;
  onError?: (error: string) => void;
};

type UseCreateDeveloperReturn = {
  isCreating: boolean;
  createDeveloper: (title: string, summary?: string) => Promise<CollectionItem | null>;
};

export function useCreateDeveloper({
  onSuccess,
  onError,
}: UseCreateDeveloperParams = {}): UseCreateDeveloperReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [isCreating, setIsCreating] = useState(false);

  const createDeveloper = async (
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
      const url = buildApiUrl(API_BASE, "/developers");
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
        if (response.status === 409 && data.developer) {
          const existing: CollectionItem = {
            id: String(data.developer.id),
            title: data.developer.title,
            gameCount: undefined,
          };
          onSuccess?.(existing);
          return existing;
        }
        throw new Error(data.error || `Failed to create developer: ${response.status}`);
      }

      const dev = data.developer;
      const newDeveloper: CollectionItem = {
        id: String(dev.id),
        title: dev.title,
        summary: dev.summary,
        cover: dev.cover ?? undefined,
        gameCount: dev.gameCount ?? 0,
      };

      window.dispatchEvent(new CustomEvent("developerAdded", { detail: { developer: newDeveloper } }));
      onSuccess?.(newDeveloper);
      return newDeveloper;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error creating developer:", errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setIsCreating(false);
      setLoading(false);
    }
  };

  return {
    isCreating,
    createDeveloper,
  };
}
