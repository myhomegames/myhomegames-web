import { useMemo } from "react";
import TagValueFilter from "./TagValueFilter";
import type { FilterValue, GameItem } from "./types";

type DevelopersFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
  availableDevelopers?: Array<{ id: string; title: string }>;
};

export default function DevelopersFilter(props: DevelopersFilterProps) {
  const { availableDevelopers = [], ...rest } = props;
  const formatValue = useMemo(() => {
    if (availableDevelopers.length === 0) return undefined;
    return (value: string) => {
      const found = availableDevelopers.find((d) => String(d.id) === String(value));
      return found ? found.title : value;
    };
  }, [availableDevelopers]);

  return (
    <TagValueFilter
      {...rest}
      type="developers"
      labelKey="gamesListToolbar.filter.developers"
      searchPlaceholderKey="gamesListToolbar.filter.searchDevelopers"
      valueExtractor={(game) => game.developers ?? []}
      formatValue={formatValue}
    />
  );
}
