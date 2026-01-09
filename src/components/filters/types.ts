import type { GameItem } from "../../types";

export type FilterField = "all" | "genre" | "year" | "decade" | "collection" | "ageRating";

export type FilterType = "year" | "genre" | "decade" | "collection" | "ageRating";

export type { GameItem };

export type FilterValue = number | string | null;

