import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { API_BASE, getApiToken } from "../config";
import { buildApiUrl, buildApiHeaders } from "../utils/api";
import { useAuth } from "./AuthContext";

export type CategoryItem = {
  id: string | number;
  title: string;
  cover?: string;
};

interface CategoriesContextType {
  categories: CategoryItem[];
  isLoading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
  addCategory: (category: CategoryItem) => void;
  updateCategory: (category: CategoryItem) => void;
  removeCategory: (categoryId: string | number) => void;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: authLoading, token: authToken } = useAuth();

  const fetchCategories = useCallback(async () => {
    // Wait for authentication to complete before making API requests
    if (authLoading) {
      return;
    }
    
    const apiToken = getApiToken() || authToken;
    if (!apiToken) {
      return;
    }

    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const url = buildApiUrl(API_BASE, "/categories");
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.categories || []) as any[];
      // Server returns objects with numeric id and title (like collections)
      const parsed = items.map((item) => ({
        id: item.id,
        title: item.title,
        cover: item.cover,
      }));
      setCategories(parsed);
    } catch (err: any) {
      clearTimeout(timeoutId);
      const errorMessage = String(err.message || err);
      console.error("Error fetching categories:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, authToken]);

  // Load categories on mount and when auth is ready
  useEffect(() => {
    if (!authLoading) {
      fetchCategories();
    }
  }, [authLoading, fetchCategories]);

  // Listen for category update events
  useEffect(() => {
    const handleCategoryUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ category: CategoryItem }>;
      const updatedCategory = customEvent.detail?.category;
      if (updatedCategory) {
        setCategories((prev) =>
          prev.map((cat) =>
            String(cat.id) === String(updatedCategory.id) ? updatedCategory : cat
          )
        );
      }
    };

    const handleMetadataReloaded = () => {
      fetchCategories();
    };

    window.addEventListener("categoryUpdated", handleCategoryUpdated as EventListener);
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    return () => {
      window.removeEventListener("categoryUpdated", handleCategoryUpdated as EventListener);
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
    };
  }, [fetchCategories]);

  const refreshCategories = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback((category: CategoryItem) => {
    setCategories((prev) => {
      // Check if category already exists
      if (prev.some((c) => String(c.id) === String(category.id))) {
        return prev;
      }
      const updated = [...prev, category];
      updated.sort((a, b) => a.title.localeCompare(b.title));
      return updated;
    });
  }, []);

  const updateCategory = useCallback((category: CategoryItem) => {
    setCategories((prev) =>
      prev.map((cat) =>
        String(cat.id) === String(category.id) ? category : cat
      )
    );
  }, []);

  const removeCategory = useCallback((categoryId: string | number) => {
    setCategories((prev) =>
      prev.filter((cat) => String(cat.id) !== String(categoryId))
    );
  }, []);

  const value: CategoriesContextType = useMemo(
    () => ({
      categories,
      isLoading,
      error,
      refreshCategories,
      addCategory,
      updateCategory,
      removeCategory,
    }),
    [categories, isLoading, error, refreshCategories, addCategory, updateCategory, removeCategory]
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within a CategoriesProvider");
  }
  return context;
}
