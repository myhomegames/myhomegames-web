import type { FilterType, FilterValue, GameItem } from "./types";
import { YearFilter, GenreFilter, DecadeFilter, CollectionFilter, AgeRatingFilter } from "./index";

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

