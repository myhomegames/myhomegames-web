import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import TagValueFilter from "./TagValueFilter";
import type { FilterValue, GameItem } from "./types";

type PlayerPerspectivesFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
};

export default function PlayerPerspectivesFilter(props: PlayerPerspectivesFilterProps) {
  const { t } = useTranslation();
  const formatValue = useMemo(
    () => (value: string) => t(`playerPerspectives.${value}`, value),
    [t]
  );
  return (
    <TagValueFilter
      {...props}
      type="playerPerspectives"
      labelKey="gamesListToolbar.filter.playerPerspectives"
      searchPlaceholderKey="gamesListToolbar.filter.searchPlayerPerspectives"
      valueExtractor={(game) => game.playerPerspectives}
      formatValue={formatValue}
    />
  );
}
