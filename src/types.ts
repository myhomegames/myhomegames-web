// Common types used across the application

export type GameItem = {
  id: string;
  title: string;
  summary?: string;
  cover?: string;
  background?: string;
  showTitle?: boolean;
  day?: number | null;
  month?: number | null;
  year?: number | null;
  stars?: number | null;
  /** Categories/genres: API returns [{ id, title }]; legacy may use string[]. */
  genre?: Array<{ id: number; title: string }> | string | string[];
  criticratings?: number | null;
  userratings?: number | null;
  executables?: string[] | null; // Array of executable names (without extension)
  /** Tag fields: API returns [{ id, title }]; legacy may use string[]. */
  themes?: Array<{ id: number; title: string }> | string[];
  platforms?: Array<{ id: number; title: string }> | string[];
  gameModes?: Array<{ id: number; title: string }> | string[];
  playerPerspectives?: Array<{ id: number; title: string }> | string[];
  websites?: Array<{ url: string; category?: number }>;
  ageRatings?: Array<{ rating: number; category: number }>;
  developers?: Array<{ id: number; name: string }>;
  publishers?: Array<{ id: number; name: string }>;
  franchise?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  collection?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  series?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  screenshots?: string[];
  videos?: string[];
  gameEngines?: Array<{ id: number; title: string }> | string[];
  keywords?: string[];
  alternativeNames?: string[];
  similarGames?: Array<{ id: number; name: string }>;
};

export type CollectionItem = {
  id: string;
  title: string;
  summary?: string;
  cover?: string;
  background?: string;
  showTitle?: boolean;
  gameCount?: number;
};

export type CategoryItem = {
  id: string;
  title: string;
  cover?: string;
  showTitle?: boolean;
};

export type CollectionInfo = {
  id: string;
  title: string;
  summary?: string;
  cover?: string;
  background?: string;
  showTitle?: boolean;
};

export type IGDBGame = {
  id: number;
  name: string;
  summary: string;
  cover: string | null;
  background?: string | null;
  releaseDate: number | null;
  releaseDateFull?: {
    year: number;
    month: number;
    day: number;
    timestamp: number;
  } | null;
  genres?: string[];
  themes?: string[];
  platforms?: string[];
  gameModes?: string[];
  playerPerspectives?: string[];
  websites?: Array<{ url: string; category?: number }>;
  ageRatings?: Array<{ rating: number; category: number }>;
  developers?: Array<{ id: number; name: string }>;
  publishers?: Array<{ id: number; name: string }>;
  franchise?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  collection?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  series?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  screenshots?: string[];
  videos?: string[];
  gameEngines?: string[];
  keywords?: string[];
  alternativeNames?: string[];
  similarGames?: Array<{ id: number; name: string }>;
  criticRating?: number | null;
  userRating?: number | null;
};

export type SortField = "title" | "year" | "stars" | "releaseDate" | "criticRating" | "userRating" | "ageRating";

export type ViewMode = "grid" | "detail" | "table";

export type GameLibrarySection = {
  key: string;
  title?: string; // Optional, will be translated using key
  type: string;
};

