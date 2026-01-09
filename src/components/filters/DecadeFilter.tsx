import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterValue, GameItem } from "./types";

const decadeFilterConfig: FilterConfig = {
  type: "decade",
  labelKey: "gamesListToolbar.filter.decade",
  searchPlaceholderKey: "gamesListToolbar.filter.searchDecade",
  getAvailableValues: (games: GameItem[]): Array<{ value: FilterValue; label: string }> => {
    const decades = new Set<number>();
    games.forEach((game) => {
      if (game.year !== null && game.year !== undefined) {
        const decade = Math.floor(game.year / 10) * 10;
        decades.add(decade);
      }
    });
    return Array.from(decades)
      .sort((a, b) => b - a) // Sort descending (newest first)
      .map((decade) => ({
        value: decade,
        label: `${decade}s`,
      }));
  },
  formatValue: (value: FilterValue): string => {
    return typeof value === "number" ? `${value}s` : "";
  },
  isScrollable: false,
};

interface DecadeFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
}

export default function DecadeFilter(props: DecadeFilterProps) {
  return <BaseFilter {...props} config={decadeFilterConfig} />;
}

