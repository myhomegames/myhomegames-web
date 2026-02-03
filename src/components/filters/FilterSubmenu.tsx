import type { FilterType, FilterValue, GameItem } from "./types";
import {
  YearFilter,
  GenreFilter,
  ThemesFilter,
  KeywordsFilter,
  PlatformsFilter,
  GameModesFilter,
  PublishersFilter,
  DevelopersFilter,
  PlayerPerspectivesFilter,
  GameEnginesFilter,
  DecadeFilter,
  CollectionFilter,
  AgeRatingFilter,
} from "./index";

type FilterSubmenuProps = {
  type: FilterType;
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
  availableGenres?: Array<{ id: string; title: string }>;
  availableCollections?: Array<{ id: string; title: string }>;
};

export default function FilterSubmenu({
  type,
  isOpen,
  onClose,
  onCloseCompletely,
  selectedValue,
  onSelect,
  games = [],
  availableGenres = [],
  availableCollections = [],
}: FilterSubmenuProps) {
  const commonProps = {
    isOpen,
    onClose,
    onCloseCompletely,
    selectedValue,
    onSelect,
    games,
  };

  switch (type) {
    case "year":
      return <YearFilter {...commonProps} />;
    case "genre":
      return <GenreFilter {...commonProps} availableGenres={availableGenres} />;
    case "themes":
      return <ThemesFilter {...commonProps} />;
    case "keywords":
      return <KeywordsFilter {...commonProps} />;
    case "platforms":
      return <PlatformsFilter {...commonProps} />;
    case "gameModes":
      return <GameModesFilter {...commonProps} />;
    case "publishers":
      return <PublishersFilter {...commonProps} />;
    case "developers":
      return <DevelopersFilter {...commonProps} />;
    case "playerPerspectives":
      return <PlayerPerspectivesFilter {...commonProps} />;
    case "gameEngines":
      return <GameEnginesFilter {...commonProps} />;
    case "decade":
      return <DecadeFilter {...commonProps} />;
    case "collection":
      return <CollectionFilter {...commonProps} availableCollections={availableCollections} />;
    case "ageRating":
      return <AgeRatingFilter {...commonProps} />;
    default:
      return null;
  }
}

