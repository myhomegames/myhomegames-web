import TagValueFilter from "./TagValueFilter";
import type { FilterValue, GameItem } from "./types";

type PublishersFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
};

export default function PublishersFilter(props: PublishersFilterProps) {
  return (
    <TagValueFilter
      {...props}
      type="publishers"
      labelKey="gamesListToolbar.filter.publishers"
      searchPlaceholderKey="gamesListToolbar.filter.searchPublishers"
      valueExtractor={(game) => game.publishers}
    />
  );
}
