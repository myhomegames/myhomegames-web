import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterValue, GameItem } from "./types";
import { getGameTypeLabel, toGameTypeId } from "../../utils/gameType";

const gameTypeFilterConfig: FilterConfig = {
  type: "gameType",
  labelKey: "gamesListToolbar.filter.gameType",
  searchPlaceholderKey: "gamesListToolbar.filter.searchGameType",
  getAvailableValues: (games: GameItem[]): Array<{ value: FilterValue; label: string }> => {
    const ids = new Set<number>();
    games.forEach((game) => {
      const id = toGameTypeId(game.type);
      if (id !== undefined) ids.add(id);
    });
    return Array.from(ids)
      .sort((a, b) => a - b)
      .map((id) => ({
        value: String(id),
        label: getGameTypeLabel(id),
      }));
  },
  formatValue: (value: FilterValue): string => {
    if (value === null || value === undefined) return "";
    const n = typeof value === "string" ? parseInt(value, 10) : typeof value === "number" ? value : NaN;
    if (Number.isNaN(n)) return "";
    return getGameTypeLabel(n);
  },
  isScrollable: true,
};

interface GameTypeFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
}

export default function GameTypeFilter(props: GameTypeFilterProps) {
  return <BaseFilter {...props} config={gameTypeFilterConfig} />;
}
