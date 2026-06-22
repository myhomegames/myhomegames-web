// Common types used across the application

export type GameItem = {
  id: string;
  title: string;
  subtitle?: string | number | null;
  summary?: string;
  cover?: string;
  background?: string;
  /** Remote cover URL stored in metadata when no local cover.webp */
  externalCoverUrl?: string | null;
  /** Remote background URL stored in metadata when no local background.webp */
  externalBackgroundUrl?: string | null;
  showTitle?: boolean;
  day?: number | null;
  month?: number | null;
  year?: number | null;
  stars?: number | null;
  /** Categories/genres: API returns [{ id, title }]; legacy may use string[]. */
  genre?: Array<{ id: number; title: string }> | string | string[];
  criticratings?: number | null;
  userratings?: number | null;
  executables?: string[] | null; // Array of executable labels
  /** File basenames (label-id) in same order as executables; used to derive platform from id after hyphen */
  executableFileNames?: (string | null)[] | null;
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
  /** IGDB game_type id (0–14); label via i18n `igdbGameTypes.{id}`. */
  type?: number | null;
  /** True when game is from IGDB only (not in library); click navigates to igdb-game page, cover shows "Nuovo" badge */
  isIgdbOnly?: boolean;
};

export type CollectionItem = {
  id: string;
  title: string;
  summary?: string;
  cover?: string;
  background?: string;
  externalCoverUrl?: string | null;
  showTitle?: boolean;
  gameCount?: number;
  childs?: Array<string | number>;
};

export type TagItem = {
  id: string;
  title: string;
  cover?: string;
  showTitle?: boolean;
  /** True when the cover file exists on server; false when only fallback URL is used. Used by EditTagModal for remove button. */
  hasCover?: boolean;
};

export type IgdbCompanyInfo = {
  /** IGDB `Company.status.name`; label via i18n `igdbCompanyStatuses.{name.toLowerCase()}`. */
  status?: string;
  updatedTo?: { id: number; name: string };
  /** IGDB `country` ISO 3166-1 numeric code; label via `formatIgdbCountryCode`. */
  countryCode?: number;
  changedOn?: string;
  /** Company founding date from IGDB `start_date`. */
  started?: string;
  /** IGDB company type history: Known as. */
  knownAs?: string;
  /** IGDB company type history: Legal name. */
  legalName?: string;
  /** IGDB `company_size.name`. */
  companySize?: string;
  /** IGDB `company_size.id`; label via i18n `igdbCompanySizes.{id}`. */
  companySizeId?: number;
  /** IGDB company type history or renamed predecessor. */
  formerly?: { id: number; name: string };
  /** IGDB `parent` or company type history: Parent company. */
  parentCompany?: { id: number; name: string };
};

export type CollectionInfo = {
  id: string;
  title: string;
  summary?: string;
  cover?: string;
  background?: string;
  /** Remote cover URL in metadata when no local cover.webp */
  externalCoverUrl?: string | null;
  /** Remote background URL in metadata when no local background.webp */
  externalBackgroundUrl?: string | null;
  showTitle?: boolean;
  childs?: Array<string | number>;
  /** IGDB company metadata imported at first creation (developers/publishers with IGDB id). */
  igdbCompanyInfo?: IgdbCompanyInfo | null;
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
  themes?: Array<{ id: number; name: string }> | string[];
  platforms?: Array<{ id: number; name: string }> | string[];
  gameModes?: Array<{ id: number; name: string }> | string[];
  playerPerspectives?: Array<{ id: number; name: string }> | string[];
  websites?: Array<{ url: string; category?: number }>;
  ageRatings?: Array<{ rating: number; category: number }>;
  developers?: Array<{ id: number; name: string }>;
  publishers?: Array<{ id: number; name: string }>;
  franchise?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  collection?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  series?: (string | { id: number; name: string }) | (string | { id: number; name: string })[];
  screenshots?: string[];
  videos?: string[];
  gameEngines?: Array<{ id: number; name: string }> | string[];
  keywords?: string[];
  alternativeNames?: string[];
  similarGames?: Array<{ id: number; name: string }>;
  criticRating?: number | null;
  userRating?: number | null;
  /** IGDB game_type id (0–14) */
  type?: number | null;
};

export type SortField =
  | "title"
  | "year"
  | "stars"
  | "releaseDate"
  | "gameType"
  | "criticRating"
  | "userRating"
  | "ageRating";

export type ViewMode = "grid" | "detail" | "table";

export type GameLibrarySection = {
  key: string;
  title?: string; // Optional, will be translated using key
  type: string;
};

