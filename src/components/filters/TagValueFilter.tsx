import { useMemo } from "react";
import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterType, FilterValue, GameItem } from "./types";

type TagItem = { id: number; title: string } | { id: number; name: string } | string;

type TagValueFilterProps = {
  type: FilterType;
  labelKey: string;
  searchPlaceholderKey: string;
  valueExtractor: (game: GameItem) => TagItem[] | undefined | null;
  formatValue?: (value: string) => string;
  /** Resolve filter value (e.g. id) to display label when value is id; used for toolbar chip. */
  getLabelForValue?: (value: FilterValue) => string;
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
  getLabelForValue,
  ...props
}: TagValueFilterProps) {
  const filterConfig: FilterConfig = useMemo(() => ({
    type,
    labelKey,
    searchPlaceholderKey,
    getAvailableValues: (games: GameItem[]): Array<{ value: FilterValue; label: string }> => {
      const valueToLabel = new Map<FilterValue, string>();
      games.forEach((game) => {
        const list = valueExtractor(game) || [];
        list.forEach((item) => {
          if (typeof item === "object" && item != null && "id" in item) {
            const key = String((item as { id: number }).id);
            if ("title" in item && typeof item.title === "string") {
              valueToLabel.set(key, item.title);
            } else if ("name" in item && typeof item.name === "string") {
              valueToLabel.set(key, (item as { id: number; name: string }).name);
            }
          } else if (typeof item === "string" && item.trim()) {
            const trimmed = item.trim();
            valueToLabel.set(trimmed, formatValue ? formatValue(trimmed) : trimmed);
          }
        });
      });
      return Array.from(valueToLabel.entries())
        .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }))
        .map(([value, label]) => ({ value, label }));
    },
    formatValue: (value: FilterValue): string => {
      if (getLabelForValue) return getLabelForValue(value);
      if (typeof value === "string") return formatValue ? formatValue(value) : value;
      return String(value);
    },
    isScrollable: true,
  }), [formatValue, getLabelForValue, labelKey, searchPlaceholderKey, type, valueExtractor]);

  return <BaseFilter {...props} config={filterConfig} />;
}
