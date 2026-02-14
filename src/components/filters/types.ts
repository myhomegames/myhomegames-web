import type { GameItem } from "../../types";

export type FilterField =
  | "all"
  | "genre"
  | "themes"
  | "keywords"
  | "platforms"
  | "gameModes"
  | "publishers"
  | "developers"
  | "playerPerspectives"
  | "gameEngines"
  | "year"
  | "decade"
  | "collection"
  | "series"
  | "franchise"
  | "ageRating";

export type FilterType =
  | "year"
  | "genre"
  | "themes"
  | "keywords"
  | "platforms"
  | "gameModes"
  | "publishers"
  | "developers"
  | "playerPerspectives"
  | "gameEngines"
  | "decade"
  | "collection"
  | "series"
  | "franchise"
  | "ageRating";

export type { GameItem };

export type FilterValue = number | string | null;

