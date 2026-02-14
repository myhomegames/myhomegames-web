import { useMemo } from "react";
import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterValue, GameItem } from "./types";

interface FranchiseFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
  availableFranchises?: Array<{ id: string; title: string }>;
}

export default function FranchiseFilter({
  availableFranchises = [],
  ...props
}: FranchiseFilterProps) {
  const config: FilterConfig = useMemo(() => ({
    type: "franchise",
    labelKey: "gamesListToolbar.filter.franchise",
    searchPlaceholderKey: "gamesListToolbar.filter.searchFranchise",
    getAvailableValues: (_games: GameItem[], additionalData?: { availableFranchises?: Array<{ id: string; title: string }> }): Array<{ value: FilterValue; label: string }> => {
      const list = additionalData?.availableFranchises ?? availableFranchises;
      return list.map((item) => ({ value: item.id, label: item.title }));
    },
    formatValue: (value: FilterValue): string => {
      if (value === null || value === undefined) return "";
      const item = availableFranchises.find((f) => String(f.id) === String(value));
      return item ? item.title : "";
    },
    isScrollable: true,
  }), [availableFranchises]);

  const additionalData = useMemo(() => ({ availableFranchises }), [availableFranchises]);

  return <BaseFilter {...props} config={config} additionalData={additionalData} />;
}
