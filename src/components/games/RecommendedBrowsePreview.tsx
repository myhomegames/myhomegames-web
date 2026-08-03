import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Summary from "../common/Summary";
import InlineTagList from "../common/InlineTagList";
import StarRating from "../common/StarRating";
import AgeRatings, { filterAgeRatingsByLocale } from "./AgeRatings";
import Tooltip from "../common/Tooltip";
import type { GameItem } from "../../types";
import { formatGameDate } from "../../utils/date";
import { displayGameType, toGameTypeId } from "../../utils/gameType";
import { useTagLists } from "../../contexts/TagListsContext";

type RecommendedBrowsePreviewProps = {
  game: GameItem | null;
};

function formatRating(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const num = Number(value);
  if (num >= 0 && num <= 100) {
    const converted = num / 10;
    return converted % 1 === 0 ? converted.toString() : converted.toFixed(1);
  }
  if (num >= 0 && num <= 10) {
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  }
  return null;
}

/**
 * Smart TV Recommended top panel: detail chrome through Summary only (no Play row).
 * Driven by the focused/hovered cover in the strips below.
 */
export default function RecommendedBrowsePreview({ game }: RecommendedBrowsePreviewProps) {
  const { t, i18n } = useTranslation();
  const { tagLabels, tagLabelsReady } = useTagLists();

  const genreTitles = useMemo(() => {
    if (!tagLabelsReady) return [];
    const raw = Array.isArray(game?.genre)
      ? game.genre
      : game?.genre != null
        ? [game.genre]
        : [];
    return raw.map((id) => {
      if (typeof id === "object" && id && "title" in id) return String(id.title);
      return tagLabels.categories.get(String(id)) ?? String(id);
    });
  }, [game?.genre, tagLabels.categories, tagLabelsReady]);

  if (!game) {
    return <div className="mhg-recommended-browse-preview mhg-recommended-browse-preview--empty" />;
  }

  const releaseDate = formatGameDate(game, t, i18n);
  const gameTypeLabel = displayGameType(toGameTypeId(game.type));
  const validAgeRatings =
    game.ageRatings && game.ageRatings.length > 0
      ? filterAgeRatingsByLocale(game.ageRatings, i18n.language)
      : [];
  const hasValidAgeRatings = validAgeRatings.length > 0;
  const criticRating = formatRating(game.criticratings);
  const userRating = formatRating(game.userratings);
  const starRating = typeof game.stars === "number" ? game.stars : 0;

  return (
    <div className="mhg-recommended-browse-preview" data-mhg-recommended-browse-preview="">
      <div className="mhg-recommended-browse-preview-info game-detail-info-panel">
        <div className="game-detail-info-content">
          <div className="game-detail-info-primary">
            <div className="game-detail-title-row">
              <h1 className="text-white game-detail-title mhg-recommended-browse-preview-title">
                {game.title}
              </h1>
            </div>
            {(releaseDate || gameTypeLabel || hasValidAgeRatings) && (
              <div className="text-white game-detail-release-date">
                {releaseDate ? <span>{releaseDate}</span> : null}
                {releaseDate && gameTypeLabel ? (
                  <span className="game-detail-age-ratings-inline">{" • "}</span>
                ) : null}
                {gameTypeLabel ? (
                  <span className="game-detail-type-label">{gameTypeLabel}</span>
                ) : null}
                {(releaseDate || gameTypeLabel) && hasValidAgeRatings ? (
                  <span className="game-detail-age-ratings-inline">{" • "}</span>
                ) : null}
                {hasValidAgeRatings ? (
                  <span className="game-detail-age-ratings-inline">
                    <AgeRatings ageRatings={game.ageRatings || []} />
                  </span>
                ) : null}
              </div>
            )}
            {tagLabelsReady && genreTitles.length > 0 && (
              <InlineTagList
                items={genreTitles}
                getLabel={(genre) => t(`genre.${genre}`, genre)}
                showMoreLabel={t("gameDetail.andMore", ", and more")}
              />
            )}
            <div className="game-detail-ratings">
              {(criticRating !== null || userRating !== null) && (
                <>
                  {criticRating !== null && (
                    <Tooltip text={t("gameDetail.criticRating")}>
                      <div className="text-white game-detail-rating-item">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="#FFD700"
                          stroke="#FFA500"
                          strokeWidth="1.5"
                          className="game-detail-rating-icon"
                        >
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        {criticRating}
                      </div>
                    </Tooltip>
                  )}
                  {userRating !== null && (
                    <Tooltip text={t("gameDetail.userRating")}>
                      <div className="text-white game-detail-rating-item">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="#4CAF50"
                          stroke="#2E7D32"
                          strokeWidth="1.5"
                          className="game-detail-rating-icon"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        {userRating}
                      </div>
                    </Tooltip>
                  )}
                </>
              )}
              {starRating > 0 ? <StarRating rating={starRating} readOnly /> : null}
            </div>
            {game.summary ? (
              <div className="game-detail-summary">
                <Summary summary={game.summary} maxLines={6} truncateOnly />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
