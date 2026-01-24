import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import TagValueFilter from "./TagValueFilter";
import type { FilterValue, GameItem } from "./types";

type GameModesFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
};

export default function GameModesFilter(props: GameModesFilterProps) {
  const { t } = useTranslation();
  const formatValue = useMemo(
    () => (value: string) => t(`gameModes.${value}`, value),
    [t]
  );
  return (
    <TagValueFilter
      {...props}
      type="gameModes"
      labelKey="gamesListToolbar.filter.gameModes"
      searchPlaceholderKey="gamesListToolbar.filter.searchGameModes"
      valueExtractor={(game) => game.gameModes}
      formatValue={formatValue}
    />
  );
}
