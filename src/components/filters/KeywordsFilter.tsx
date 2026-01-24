import TagValueFilter from "./TagValueFilter";
import type { FilterValue, GameItem } from "./types";

type KeywordsFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
};

export default function KeywordsFilter(props: KeywordsFilterProps) {
  return (
    <TagValueFilter
      {...props}
      type="keywords"
      labelKey="gamesListToolbar.filter.keywords"
      searchPlaceholderKey="gamesListToolbar.filter.searchKeywords"
      valueExtractor={(game) => game.keywords}
    />
  );
}
