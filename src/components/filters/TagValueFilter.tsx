import { useMemo } from "react";
import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterType, FilterValue, GameItem } from "./types";

type TagValueFilterProps = {
  type: FilterType;
  labelKey: string;
  searchPlaceholderKey: string;
  valueExtractor: (game: GameItem) => string[] | undefined | null;
  formatValue?: (value: string) => string;
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
};

export default function TagValueFilter({
  type,
  labelKey,
  searchPlaceholderKey,
  valueExtractor,
  formatValue,
  ...props
}: TagValueFilterProps) {
  const filterConfig: FilterConfig = useMemo(() => ({
    type,
    labelKey,
    searchPlaceholderKey,
    getAvailableValues: (games: GameItem[]): Array<{ value: FilterValue; label: string }> => {
      const values = new Set<string>();
      games.forEach((game) => {
        const list = valueExtractor(game) || [];
        list.forEach((item) => {
          if (typeof item === "string") {
            const trimmed = item.trim();
            if (trimmed) {
              values.add(trimmed);
            }
          }
        });
      });
      const sorted = Array.from(values).sort((a, b) =>
        (formatValue ? formatValue(a) : a).localeCompare(formatValue ? formatValue(b) : b)
      );
      return sorted.map((value) => ({
        value,
        label: formatValue ? formatValue(value) : value,
      }));
    },
    formatValue: (value: FilterValue): string => {
      if (typeof value !== "string") return "";
      return formatValue ? formatValue(value) : value;
    },
    isScrollable: true,
  }), [formatValue, labelKey, searchPlaceholderKey, type, valueExtractor]);

  return <BaseFilter {...props} config={filterConfig} />;
}
