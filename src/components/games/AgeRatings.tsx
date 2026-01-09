import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import "./AgeRatings.css";

// Map language codes to age rating category (organization)
// 1 = ESRB (USA/Canada), 2 = PEGI (Europe), 3 = CERO (Japan), 4 = USK (Germany), 5 = GRAC (Korea), 6 = CLASS_IND (Brazil), 7 = ACB (Australia)
const LANGUAGE_TO_RATING_CATEGORY: Record<string, number> = {
  en: 1,  // English -> ESRB
  it: 2,  // Italian -> PEGI
  es: 2,  // Spanish -> PEGI
  fr: 2,  // French -> PEGI
  pt: 2,  // Portuguese -> PEGI
  de: 4,  // German -> USK
  ja: 3,  // Japanese -> CERO
  zh: 1,  // Chinese -> ESRB (default)
};

type AgeRating = {
  category: number;
  rating: number;
};

type AgeRatingsProps = {
  ageRatings: AgeRating[];
};

// Map IGDB age rating category numbers to names
const AGE_RATING_CATEGORIES: Record<number, string> = {
  1: "ESRB",
  2: "PEGI",
  3: "CERO",
  4: "USK",
  5: "GRAC",
  6: "CLASS_IND",
  7: "ACB",
};

// Map IGDB rating_category values to rating names for each organization
// Format: organization -> rating_category -> rating name
const AGE_RATING_VALUES_BY_ORG: Record<number, Record<number, string>> = {
  // ESRB (1)
  1: {
    6: "EC",
    7: "E",
    8: "E10",
    9: "T",
    10: "M",
    11: "AO",
    12: "RP",
  },
  // PEGI (2)
  2: {
    1: "Three",
    2: "Seven",
    3: "Twelve",
    4: "Sixteen",
    5: "Eighteen",
  },
  // CERO (3)
  3: {
    1: "A",
    2: "B",
    3: "C",
    4: "D",
    5: "Z",
  },
  // USK (4)
  4: {
    1: "Zero",
    2: "Six",
    3: "Twelve",
    4: "Sixteen",
    5: "Eighteen",
  },
  // GRAC (5)
  5: {
    1: "ALL",
    2: "Twelve",
    3: "Fifteen",
    4: "Eighteen",
  },
  // CLASS_IND (6)
  6: {
    1: "L",
    2: "Ten",
    3: "Twelve",
    4: "Fourteen",
    5: "Sixteen",
    6: "Eighteen",
  },
  // ACB (7)
  7: {
    1: "G",
    2: "PG",
    3: "M",
    4: "MA15",
    5: "R18",
  },
};

// Helper function to filter age ratings by user's locale
export function filterAgeRatingsByLocale(
  ageRatings: Array<{ category: number; rating: number }>,
  language: string
): Array<{ category: number; rating: number }> {
  const userLanguage = language.split('-')[0]; // Get base language (e.g., 'en' from 'en-US')
  const preferredCategory = LANGUAGE_TO_RATING_CATEGORY[userLanguage] || 1; // Default to ESRB

  return ageRatings.filter(
    (ar) => ar && 
    (ar.category !== undefined && ar.category !== null) && 
    (ar.rating !== undefined && ar.rating !== null) &&
    ar.category === preferredCategory
  );
}

// Helper function to format age rating
export function formatAgeRating(category: number | undefined | null, rating: number | undefined | null, t: TFunction): string {
  // Handle undefined/null values
  if (category === undefined || category === null || rating === undefined || rating === null) {
    return "";
  }
  
  const categoryName = AGE_RATING_CATEGORIES[category];
  if (!categoryName) {
    return `Category ${category} Rating ${rating}`;
  }
  
  // Get rating name from organization-specific mapping
  const orgRatings = AGE_RATING_VALUES_BY_ORG[category];
  const ratingName = orgRatings?.[rating];
  
  if (!ratingName) {
    // Fallback: try to use the rating number directly
    return `${categoryName} ${rating}`;
  }
  
  // Try to get translation, fallback to formatted string
  const translationKey = `igdbInfo.ageRating.${categoryName}.${ratingName}`;
  const translation = t(translationKey);
  
  // If translation exists and is different from the key, use it
  if (translation !== translationKey) {
    return translation;
  }
  
  // Fallback: return formatted string like "ESRB M" or "PEGI 18"
  return `${categoryName} ${ratingName}`;
}

export default function AgeRatings({ ageRatings }: AgeRatingsProps) {
  const { t, i18n } = useTranslation();

  if (!ageRatings || ageRatings.length === 0) {
    return null;
  }

  // Filter out invalid age ratings and only show ratings from the user's region
  const validAgeRatings = filterAgeRatingsByLocale(ageRatings, i18n.language);

  if (validAgeRatings.length === 0) {
    return null;
  }

  return (
    <div className="age-ratings-list">
      {validAgeRatings.map((ar, index, filteredArray) => {
        const formatted = formatAgeRating(ar.category, ar.rating, t);
        if (!formatted) return null;
        return (
          <span key={index}>
            <span className="age-rating-item">
              {formatted}
            </span>
            {index < filteredArray.length - 1 && (
              <span className="age-rating-separator">
                ,{" "}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

