import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import CategoriesList from "../components/lists/CategoriesList";
import EditCategoryModal from "../components/categories/EditCategoryModal";
import type { CategoryItem, GameItem } from "../types";
import { API_BASE } from "../config";
import { buildApiUrl, buildApiHeaders } from "../utils/api";

type CategoriesPageProps = {
  coverSize: number;
};

export default function CategoriesPage({
  coverSize,
}: CategoriesPageProps) {
  const { setLoading, isLoading } = useLoading();
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  // Restore scroll position
  useScrollRestoration(scrollContainerRef);

  useEffect(() => {
    fetchCategories();
    fetchLibraryGames();
  }, []);

  // Listen for metadata reload event
  useEffect(() => {
    const handleMetadataReloaded = () => {
      fetchCategories();
      fetchLibraryGames();
    };
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    return () => {
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
    };
  }, []);

  // Listen for category update events
  useEffect(() => {
    const handleCategoryUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ category: CategoryItem }>;
      const updatedCategory = customEvent.detail?.category;
      if (updatedCategory) {
        setAllCategories((prevCategories) =>
          prevCategories.map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category
          )
        );
      }
    };

    window.addEventListener("categoryUpdated", handleCategoryUpdated as EventListener);
    return () => {
      window.removeEventListener("categoryUpdated", handleCategoryUpdated as EventListener);
    };
  }, []);

  const handleCategoryUpdate = (updatedCategory: CategoryItem) => {
    setAllCategories((prevCategories) =>
      prevCategories.map((category) =>
        category.id === updatedCategory.id ? updatedCategory : category
      )
    );
  };

  const handleCategoryEdit = (category: CategoryItem) => {
    setEditingCategory(category);
  };

  const handleCloseModal = () => {
    setEditingCategory(null);
  };

  // Filter categories to only those with games available
  useEffect(() => {
    if (games.length === 0 || allCategories.length === 0) {
      setCategories([]);
      return;
    }

    // Extract unique genre IDs and titles from games
    const genresInGames = new Set<string>();
    games.forEach((game) => {
      if (game.genre) {
        if (Array.isArray(game.genre)) {
          game.genre.forEach((g) => genresInGames.add(g));
        } else if (typeof game.genre === "string") {
          genresInGames.add(game.genre);
        }
      }
    });

    // Filter categories to only those present in games
    const filteredCategories = allCategories.filter((category) => {
      // Check if the category title matches any genre in games
      return genresInGames.has(category.title);
    });

    setCategories(filteredCategories);
  }, [games, allCategories]);

  // Hide content until fully rendered
  useLayoutEffect(() => {
    if (!isLoading && (categories.length > 0 || (allCategories.length > 0 && games.length > 0))) {
      // Wait for next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    } else if (isLoading) {
      setIsReady(false);
    }
  }, [isLoading, categories.length, allCategories.length, games.length]);

  async function fetchCategories() {
    try {
      const url = buildApiUrl(API_BASE, "/categories");
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.categories || []) as string[];
      const parsed = items.map((title) => ({
        id: title,
        title: title,
        cover: `/category-covers/${encodeURIComponent(title)}`,
      }));
      setAllCategories(parsed);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      console.error("Error fetching categories:", errorMessage);
    }
  }

  async function fetchLibraryGames() {
    setLoading(true);
    try {
      const url = buildApiUrl(API_BASE, "/libraries/library/games", {
        sort: "title",
      });
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.games || []) as any[];
      const parsed = items.map((v) => ({
        id: v.id,
        title: v.title,
        summary: v.summary,
        cover: v.cover,
        day: v.day,
        month: v.month,
        year: v.year,
        stars: v.stars,
        genre: v.genre,
      }));
      setGames(parsed);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      console.error("Error fetching library games:", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 home-page-content">
      <div className="home-page-layout">
        <div 
          className="home-page-content-wrapper"
          style={{
            opacity: isReady ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
          }}
        >
        <div ref={scrollContainerRef} className="home-page-scroll-container">
          {!isLoading && (
            <CategoriesList
              categories={categories}
              coverSize={coverSize * 2}
              itemRefs={itemRefs}
              onCategoryUpdate={handleCategoryUpdate}
              onCategoryEdit={handleCategoryEdit}
            />
          )}
        </div>
      </div>
      </div>
      {editingCategory && (
        <EditCategoryModal
          isOpen={!!editingCategory}
          onClose={handleCloseModal}
          category={editingCategory}
          onCategoryUpdate={handleCategoryUpdate}
        />
      )}
    </main>
  );
}

