import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { GameItem } from "../../types";

type GameCategoriesProps = {
  game: GameItem;
};

export default function GameCategories({ game }: GameCategoriesProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!game.genre) {
    return null;
  }

  // Convert game.genre to array if it's a string
  const genres = Array.isArray(game.genre) ? game.genre : [game.genre];

  if (genres.length === 0) {
    return null;
  }

  const handleGenreClick = (genre: string) => {
    navigate(`/category/${genre}`);
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

