import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterValue, GameItem } from "./types";

const yearFilterConfig: FilterConfig = {
  type: "year",
  labelKey: "gamesListToolbar.filter.year",
  searchPlaceholderKey: "gamesListToolbar.filter.searchYear",
  getAvailableValues: (games: GameItem[]): Array<{ value: FilterValue; label: string }> => {
    const years = new Set<number>();
    games.forEach((game) => {
      if (game.year !== null && game.year !== undefined) {
        years.add(game.year);
      }
    });
    return Array.from(years)
      .sort((a, b) => b - a) // Sort descending (newest first)
      .map((year) => ({
        value: year,
        label: year.toString(),
      }));
  },
  formatValue: (value: FilterValue): string => {
    return typeof value === "number" ? value.toString() : "";
  },
  isScrollable: false,
};

interface YearFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
}

export default function YearFilter(props: YearFilterProps) {
  return <BaseFilter {...props} config={yearFilterConfig} />;
}

