import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterValue, GameItem } from "./types";
import { useTranslation } from "react-i18next";
import { formatAgeRating, filterAgeRatingsByLocale } from "../games/AgeRatings";

interface AgeRatingFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
}

export default function AgeRatingFilter({
  games = [],
  ...props
}: AgeRatingFilterProps) {
  const { t, i18n } = useTranslation();

  const ageRatingFilterConfig: FilterConfig = {
    type: "ageRating",
    labelKey: "gamesListToolbar.filter.ageRating",
    searchPlaceholderKey: "gamesListToolbar.filter.searchAgeRating",
    getAvailableValues: (games: GameItem[]): Array<{ value: FilterValue; label: string }> => {
      const ageRatingsMap = new Map<string, { category: number; rating: number }>();
      
      games.forEach((game) => {
        if (game.ageRatings && game.ageRatings.length > 0) {
          // Filter age ratings by user's locale
          const filteredRatings = filterAgeRatingsByLocale(game.ageRatings, i18n.language);
          
          filteredRatings.forEach((ar) => {
            // Create a unique key for this age rating
            const key = `${ar.category}-${ar.rating}`;
            if (!ageRatingsMap.has(key)) {
              ageRatingsMap.set(key, { category: ar.category, rating: ar.rating });
            }
          });
        }
      });
      
      // Convert to array and format labels
      return Array.from(ageRatingsMap.values())
        .map((ar) => {
          const label = formatAgeRating(ar.category, ar.rating, t);
          // Use a string key for the value: "category-rating"
          const value = `${ar.category}-${ar.rating}`;
          return { value, label };
        })
        .sort((a, b) => {
          // Sort by category first, then by rating
          const [catA, ratA] = a.value.split('-').map(Number);
          const [catB, ratB] = b.value.split('-').map(Number);
          if (catA !== catB) {
            return catA - catB;
          }
          return ratA - ratB;
        });
    },
    formatValue: (value: FilterValue): string => {
      if (typeof value === "string" && value.includes('-')) {
        const [category, rating] = value.split('-').map(Number);
        return formatAgeRating(category, rating, t);
      }
      return "";
    },
    isScrollable: true,
  };

  return <BaseFilter {...props} config={ageRatingFilterConfig} games={games} />;
}

