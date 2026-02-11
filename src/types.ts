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
  genre?: string | string[];
  criticratings?: number | null;
  userratings?: number | null;
  executables?: string[] | null; // Array of executable names (without extension)
  themes?: string[];
  platforms?: string[];
  gameModes?: string[];
  playerPerspectives?: string[];
  websites?: Array<{ url: string; category?: number }>;
  ageRatings?: Array<{ rating: number; category: number }>;
  developers?: string[];
  publishers?: string[];
  franchise?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  collection?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  series?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  screenshots?: string[];
  videos?: string[];
  gameEngines?: string[];
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
  developers?: string[];
  publishers?: string[];
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

