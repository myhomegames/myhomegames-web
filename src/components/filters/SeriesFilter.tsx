import { useMemo } from "react";
import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterValue, GameItem } from "./types";

interface SeriesFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
  availableSeries?: Array<{ id: string; title: string }>;
}

export default function SeriesFilter({
  availableSeries = [],
  ...props
}: SeriesFilterProps) {
  const config: FilterConfig = useMemo(() => ({
    type: "series",
    labelKey: "gamesListToolbar.filter.series",
    searchPlaceholderKey: "gamesListToolbar.filter.searchSeries",
    getAvailableValues: (_games: GameItem[], additionalData?: { availableSeries?: Array<{ id: string; title: string }> }): Array<{ value: FilterValue; label: string }> => {
      const list = additionalData?.availableSeries ?? availableSeries;
      return list.map((item) => ({ value: item.id, label: item.title }));
    },
    formatValue: (value: FilterValue): string => {
      if (value === null || value === undefined) return "";
      const item = availableSeries.find((s) => String(s.id) === String(value));
      return item ? item.title : "";
    },
    isScrollable: true,
  }), [availableSeries]);

  const additionalData = useMemo(() => ({ availableSeries }), [availableSeries]);

  return <BaseFilter {...props} config={config} additionalData={additionalData} />;
}
