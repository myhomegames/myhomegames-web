import type { TFunction } from "i18next";
import type { GameItem } from "../types";
import type { FilterField } from "../components/filters/types";

export type TagKey =
  | "categories"
  | "platforms"
  | "themes"
  | "developers"
  | "publishers"
  | "gameEngines"
  | "gameModes"
  | "playerPerspectives";

type TranslationFn = TFunction;

type TagDetailConfig = {
  tagField: FilterField;
  paramName: string;
  storageKey: string;
};

type TagListConfig = {
  routeBase: string;
  listEndpoint: string;
  listResponseKey: string;
  valueExtractor: (game: GameItem) => string[] | null | undefined;
  localCoverPrefix: string;
  responseKey: string;
  removeResourceType?:
    | "games"
    | "collections"
    | "categories"
    | "themes"
    | "platforms"
    | "game-engines"
    | "game-modes"
    | "player-perspectives";
  editRouteBase?: string;
  updateEventName?: string;
  updateEventPayloadKey?: string;
};

type TagPageConfig = {
  list: TagListConfig;
  detail: TagDetailConfig;
  supportsEdit?: boolean;
  getDisplayName: (t: TranslationFn) => (value: string) => string;
  getEmptyMessage: (t: TranslationFn) => string;
  getEditTitle: (t: TranslationFn) => string;
  getCoverDescription: (t: TranslationFn) => string;
};

const getGenreValues = (game: GameItem) => {
  if (!game.genre) return null;
  return Array.isArray(game.genre) ? game.genre : [game.genre];
};

const getArrayOrNull = (values?: string[]) => values || null;

export const TAG_PAGE_CONFIGS: Record<TagKey, TagPageConfig> = {
  categories: {
    list: {
      routeBase: "/category",
      listEndpoint: "/categories",
      listResponseKey: "categories",
      valueExtractor: getGenreValues,
      localCoverPrefix: "/category-covers/",
      responseKey: "category",
      removeResourceType: "categories",
      editRouteBase: "/categories",
      updateEventName: "categoryUpdated",
      updateEventPayloadKey: "category",
    },
    detail: {
      tagField: "genre",
      paramName: "categoryId",
      storageKey: "category",
    },
    getDisplayName: (t) => (value) => t(`genre.${value}`, value),
    getEmptyMessage: (t) => t("categories.noCategoriesFound"),
    getEditTitle: (t) => t("category.editCategory", "Edit Category"),
    getCoverDescription: (t) =>
      t("category.coverFormat", "Recommended ratio: 16:9 (e.g., 1280x720px)"),
  },
  platforms: {
    list: {
      routeBase: "/platforms",
      listEndpoint: "/platforms",
      listResponseKey: "platforms",
      valueExtractor: (game) => getArrayOrNull(game.platforms),
      localCoverPrefix: "/platform-covers/",
      responseKey: "platform",
      removeResourceType: "platforms",
    },
    detail: {
      tagField: "platforms",
      paramName: "platformId",
      storageKey: "platforms",
    },
    getDisplayName: () => (value) => value,
    getEmptyMessage: (t) =>
      t("tags.noItemsFound", { type: t("libraries.platforms") }),
    getEditTitle: (t) => `${t("common.edit", "Edit")} ${t("libraries.platforms")}`,
    getCoverDescription: (t) =>
      t("category.coverFormat", "Recommended ratio: 16:9 (e.g., 1280x720px)"),
  },
  themes: {
    list: {
      routeBase: "/themes",
      listEndpoint: "/themes",
      listResponseKey: "themes",
      valueExtractor: (game) => getArrayOrNull(game.themes),
      localCoverPrefix: "/theme-covers/",
      responseKey: "theme",
      removeResourceType: "themes",
    },
    detail: {
      tagField: "themes",
      paramName: "themeId",
      storageKey: "themes",
    },
    getDisplayName: (t) => (value) => t(`themes.${value}`, value),
    getEmptyMessage: (t) =>
      t("tags.noItemsFound", { type: t("libraries.themes") }),
    getEditTitle: (t) => `${t("common.edit", "Edit")} ${t("libraries.themes")}`,
    getCoverDescription: (t) =>
      t("category.coverFormat", "Recommended ratio: 16:9 (e.g., 1280x720px)"),
  },
  developers: {
    list: {
      routeBase: "/developers",
      listEndpoint: "/developers",
      listResponseKey: "developers",
      valueExtractor: (game) => getArrayOrNull(game.developers),
      localCoverPrefix: "/developer-covers/",
      responseKey: "developer",
    },
    detail: {
      tagField: "developers",
      paramName: "developerId",
      storageKey: "developers",
    },
    supportsEdit: false,
    getDisplayName: () => (value) => value,
    getEmptyMessage: (t) =>
      t("tags.noItemsFound", { type: t("igdbInfo.developers", "Developers") }),
    getEditTitle: (t) => `${t("common.edit", "Edit")} ${t("igdbInfo.developers", "Developers")}`,
    getCoverDescription: (t) =>
      t("category.coverFormat", "Recommended ratio: 16:9 (e.g., 1280x720px)"),
  },
  publishers: {
    list: {
      routeBase: "/publishers",
      listEndpoint: "/publishers",
      listResponseKey: "publishers",
      valueExtractor: (game) => getArrayOrNull(game.publishers),
      localCoverPrefix: "/publisher-covers/",
      responseKey: "publisher",
    },
    detail: {
      tagField: "publishers",
      paramName: "publisherId",
      storageKey: "publishers",
    },
    supportsEdit: false,
    getDisplayName: () => (value) => value,
    getEmptyMessage: (t) =>
      t("tags.noItemsFound", { type: t("igdbInfo.publishers", "Publishers") }),
    getEditTitle: (t) => `${t("common.edit", "Edit")} ${t("igdbInfo.publishers", "Publishers")}`,
    getCoverDescription: (t) =>
      t("category.coverFormat", "Recommended ratio: 16:9 (e.g., 1280x720px)"),
  },
  gameEngines: {
    list: {
      routeBase: "/game-engines",
      listEndpoint: "/game-engines",
      listResponseKey: "gameEngines",
      valueExtractor: (game) => getArrayOrNull(game.gameEngines),
      localCoverPrefix: "/game-engine-covers/",
      responseKey: "gameEngine",
      removeResourceType: "game-engines",
    },
    detail: {
      tagField: "gameEngines",
      paramName: "gameEngineId",
      storageKey: "gameEngines",
    },
    getDisplayName: () => (value) => value,
    getEmptyMessage: (t) =>
      t("tags.noItemsFound", { type: t("libraries.gameEngines") }),
    getEditTitle: (t) =>
      `${t("common.edit", "Edit")} ${t("libraries.gameEngines")}`,
    getCoverDescription: (t) =>
      t("category.coverFormat", "Recommended ratio: 16:9 (e.g., 1280x720px)"),
  },
  gameModes: {
    list: {
      routeBase: "/game-modes",
      listEndpoint: "/game-modes",
      listResponseKey: "gameModes",
      valueExtractor: (game) => getArrayOrNull(game.gameModes),
      localCoverPrefix: "/game-mode-covers/",
      responseKey: "gameMode",
      removeResourceType: "game-modes",
    },
    detail: {
      tagField: "gameModes",
      paramName: "gameModeId",
      storageKey: "gameModes",
    },
    getDisplayName: (t) => (value) => t(`gameModes.${value}`, value),
    getEmptyMessage: (t) =>
      t("tags.noItemsFound", { type: t("libraries.gameModes") }),
    getEditTitle: (t) => `${t("common.edit", "Edit")} ${t("libraries.gameModes")}`,
    getCoverDescription: (t) =>
      t("category.coverFormat", "Recommended ratio: 16:9 (e.g., 1280x720px)"),
  },
  playerPerspectives: {
    list: {
      routeBase: "/player-perspectives",
      listEndpoint: "/player-perspectives",
      listResponseKey: "playerPerspectives",
      valueExtractor: (game) => getArrayOrNull(game.playerPerspectives),
      localCoverPrefix: "/player-perspective-covers/",
      responseKey: "playerPerspective",
      removeResourceType: "player-perspectives",
    },
    detail: {
      tagField: "playerPerspectives",
      paramName: "playerPerspectiveId",
      storageKey: "playerPerspectives",
    },
    getDisplayName: (t) => (value) => t(`playerPerspectives.${value}`, value),
    getEmptyMessage: (t) =>
      t("tags.noItemsFound", { type: t("libraries.playerPerspectives") }),
    getEditTitle: (t) =>
      `${t("common.edit", "Edit")} ${t("libraries.playerPerspectives")}`,
    getCoverDescription: (t) =>
      t("category.coverFormat", "Recommended ratio: 16:9 (e.g., 1280x720px)"),
  },
};
