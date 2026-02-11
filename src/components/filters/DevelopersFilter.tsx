import TagValueFilter from "./TagValueFilter";
import type { FilterValue, GameItem } from "./types";
import { toDevPubIds } from "../../utils/devPubUtils";

type DevelopersFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
};

export default function DevelopersFilter(props: DevelopersFilterProps) {
  return (
    <TagValueFilter
      {...props}
      type="developers"
      labelKey="gamesListToolbar.filter.developers"
      searchPlaceholderKey="gamesListToolbar.filter.searchDevelopers"
      valueExtractor={(game) => toDevPubIds(game.developers)}
    />
  );
}
