import TagValueFilter from "./TagValueFilter";
import type { FilterValue, GameItem } from "./types";

type PlatformsFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
};

export default function PlatformsFilter(props: PlatformsFilterProps) {
  return (
    <TagValueFilter
      {...props}
      type="platforms"
      labelKey="gamesListToolbar.filter.platforms"
      searchPlaceholderKey="gamesListToolbar.filter.searchPlatforms"
      valueExtractor={(game) => game.platforms}
    />
  );
}
