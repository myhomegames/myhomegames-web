import TagValueFilter from "./TagValueFilter";
import type { FilterValue, GameItem } from "./types";

type GameEnginesFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
};

export default function GameEnginesFilter(props: GameEnginesFilterProps) {
  return (
    <TagValueFilter
      {...props}
      type="gameEngines"
      labelKey="gamesListToolbar.filter.gameEngines"
      searchPlaceholderKey="gamesListToolbar.filter.searchGameEngines"
      valueExtractor={(game) => game.gameEngines}
    />
  );
}
