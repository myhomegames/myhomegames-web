import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import { useLoading } from "../contexts/LoadingContext";
import { useCategories } from "../contexts/CategoriesContext";
import { useLibraryGames } from "../contexts/LibraryGamesContext";
import CategoriesList from "../components/lists/CategoriesList";
import EditCategoryModal from "../components/categories/EditCategoryModal";
import type { CategoryItem } from "../types";

type CategoriesPageProps = {
  coverSize: number;
};

export default function CategoriesPage({
  coverSize,
}: CategoriesPageProps) {
  const { isLoading } = useLoading();
  const { categories: allCategories, refreshCategories, updateCategory } = useCategories();
  const { games } = useLibraryGames();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  // Restore scroll position
  useScrollRestoration(scrollContainerRef);

  // Listen for metadata reload event
  useEffect(() => {
    const handleMetadataReloaded = () => {
      refreshCategories();
    };
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    return () => {
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
    };
  }, [refreshCategories]);

  const handleCategoryUpdate = (updatedCategory: CategoryItem) => {
    // Update category in context
    updateCategory(updatedCategory);
    // Update editingCategory if it's the same category
    if (editingCategory && String(editingCategory.id) === String(updatedCategory.id)) {
      setEditingCategory(updatedCategory);
    }
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
    // Convert context CategoryItem (id: string | number) to types CategoryItem (id: string)
    const filteredCategories = allCategories
      .filter((category) => {
        // Check if the category title matches any genre in games
        return genresInGames.has(category.title);
      })
      .map((category) => ({
        id: String(category.id),
        title: category.title,
        cover: category.cover,
      }));

    setCategories(filteredCategories);
  }, [games, allCategories]);

  // Update editingCategory when allCategories changes (to reflect cover removal)
  useEffect(() => {
    if (editingCategory) {
      const updatedCategory = allCategories.find(cat => String(cat.id) === String(editingCategory.id));
      if (updatedCategory) {
        // Only update if cover actually changed to avoid infinite loops
        const newCover = updatedCategory.cover || undefined;
        const currentCover = editingCategory.cover || undefined;
        if (newCover !== currentCover) {
          setEditingCategory({
            id: String(updatedCategory.id),
            title: updatedCategory.title,
            cover: updatedCategory.cover,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCategories]);

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

  // Categories and games are now loaded via context, no need for fetch functions

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

