import { useMemo } from "react";
import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterValue, GameItem } from "./types";

interface CollectionFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
  availableCollections?: Array<{ id: string; title: string }>;
}

export default function CollectionFilter({
  availableCollections = [],
  ...props
}: CollectionFilterProps) {
  const collectionFilterConfig: FilterConfig = useMemo(() => ({
    type: "collection",
    labelKey: "gamesListToolbar.filter.collection",
    searchPlaceholderKey: "gamesListToolbar.filter.searchCollection",
    getAvailableValues: (_games: GameItem[], additionalData?: any): Array<{ value: FilterValue; label: string }> => {
      const collections = additionalData?.availableCollections || availableCollections;
      return collections.map((collection: { id: string; title: string }) => ({
        value: collection.id,
        label: collection.title,
      }));
    },
    formatValue: (value: FilterValue): string => {
      if (typeof value !== "string") return "";
      const collection = availableCollections.find((c) => c.id === value);
      return collection ? collection.title : "";
    },
    isScrollable: true,
  }), [availableCollections]);

  const additionalData = useMemo(() => ({ availableCollections }), [availableCollections]);

  return <BaseFilter {...props} config={collectionFilterConfig} additionalData={additionalData} />;
}

