import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import TagValueFilter from "./TagValueFilter";
import type { FilterValue, GameItem } from "./types";

type ThemesFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
};

export default function ThemesFilter(props: ThemesFilterProps) {
  const { t } = useTranslation();

  const formatValue = useMemo(
    () => (value: string) => t(`themes.${value}`, value),
    [t]
  );

  return (
    <TagValueFilter
      {...props}
      type="themes"
      labelKey="gamesListToolbar.filter.themes"
      searchPlaceholderKey="gamesListToolbar.filter.searchThemes"
      valueExtractor={(game) => game.themes}
      formatValue={formatValue}
    />
  );
}
