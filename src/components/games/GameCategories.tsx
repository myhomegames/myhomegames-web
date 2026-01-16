import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { GameItem } from "../../types";
import { API_BASE, getApiToken } from "../../config";
import { buildApiUrl } from "../../utils/api";

type GameCategoriesProps = {
  game: GameItem;
};

export default function GameCategories({ game }: GameCategoriesProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string | number; title: string }>>([]);

  // Load categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const url = buildApiUrl(API_BASE, "/categories");
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "X-Auth-Token": getApiToken(),
          },
        });
        if (!res.ok) return;
        const json = await res.json();
        const items = (json.categories || []) as any[];
        // Server returns objects with numeric id and title (like collections)
        const parsed = items.map((item) => ({
          id: item.id,
          title: item.title,
        }));
        setCategories(parsed);
      } catch (err) {
        // Silently fail - categories are optional
      }
    }
    fetchCategories();
  }, []);

  if (!game.genre) {
    return null;
  }

  // Convert game.genre to array if it's a string
  const genres = Array.isArray(game.genre) ? game.genre : [game.genre];

  if (genres.length === 0) {
    return null;
  }

  const handleGenreClick = async (genreTitle: string) => {
    // Find category by title and use its ID
    let category = categories.find((c) => c.title === genreTitle);
    
    // If categories not loaded yet, fetch them now
    if (!category && categories.length === 0) {
      try {
        const url = buildApiUrl(API_BASE, "/categories");
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "X-Auth-Token": getApiToken(),
          },
        });
        if (res.ok) {
          const json = await res.json();
          const items = (json.categories || []) as any[];
          // Server returns objects with numeric id and title (like collections)
          const parsed = items.map((item) => ({
            id: item.id,
            title: item.title,
          }));
          setCategories(parsed);
          category = parsed.find((c) => c.title === genreTitle);
        }
      } catch (err) {
        // Silently fail
      }
    }
    
    if (category) {
      // Always use numeric ID for navigation
      navigate(`/category/${category.id}`);
    }
    // If category not found, do nothing (shouldn't happen in normal usage)
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(true);
  };

  const shouldShowMore = genres.length >= 4 && !isExpanded;
  const displayedGenres = shouldShowMore ? genres.slice(0, 2) : genres;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        alignItems: "center",
      }}
    >
      {displayedGenres.map((genre, index) => (
        <span key={index}>
          <span
            onClick={() => handleGenreClick(genre)}
            style={{
              color: "rgba(255, 255, 255, 0.8)",
              fontFamily: "var(--font-body-2-font-family)",
              fontSize: "var(--font-body-2-font-size)",
              lineHeight: "var(--font-body-2-line-height)",
              cursor: "pointer",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
              e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
            }}
          >
            {t(`genre.${genre}`, genre)}
          </span>
          {index < displayedGenres.length - 1 && !shouldShowMore && (
            <span
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontFamily: "var(--font-body-2-font-family)",
                fontSize: "var(--font-body-2-font-size)",
                lineHeight: "var(--font-body-2-line-height)",
              }}
            >
              ,{" "}
            </span>
          )}
          {index === displayedGenres.length - 1 && shouldShowMore && (
            <span
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontFamily: "var(--font-body-2-font-family)",
                fontSize: "var(--font-body-2-font-size)",
                lineHeight: "var(--font-body-2-line-height)",
              }}
            >
              ,{" "}
            </span>
          )}
        </span>
      ))}
      {shouldShowMore && (
        <>
          <span
            onClick={handleExpandClick}
            style={{
              color: "rgba(255, 255, 255, 0.8)",
              fontFamily: "var(--font-body-2-font-family)",
              fontSize: "var(--font-body-2-font-size)",
              lineHeight: "var(--font-body-2-line-height)",
              cursor: "pointer",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
              e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
            }}
          >
            {t("gameDetail.andMore", ", and more")}
          </span>
        </>
      )}
    </div>
  );
}

