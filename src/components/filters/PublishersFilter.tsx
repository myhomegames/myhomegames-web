import { useMemo } from "react";
import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterValue, GameItem } from "./types";

type PublishersFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
  availablePublishers?: Array<{ id: string; title: string }>;
};

export default function PublishersFilter({
  availablePublishers = [],
  ...props
}: PublishersFilterProps) {
  const publisherFilterConfig: FilterConfig = useMemo(
    () => ({
      type: "publishers",
      labelKey: "gamesListToolbar.filter.publishers",
      searchPlaceholderKey: "gamesListToolbar.filter.searchPublishers",
      getAvailableValues: (
        _games: GameItem[],
        additionalData?: { availablePublishers?: Array<{ id: string; title: string }> },
      ): Array<{ value: FilterValue; label: string }> => {
        const publishers = additionalData?.availablePublishers ?? availablePublishers;
        return publishers.map((publisher) => ({
          value: publisher.id,
          label: publisher.title,
        }));
      },
      formatValue: (value: FilterValue): string => {
        if (value === null || value === undefined) return "";
        const publisher = availablePublishers.find((p) => String(p.id) === String(value));
        return publisher ? publisher.title : String(value);
      },
      isScrollable: true,
    }),
    [availablePublishers],
  );

  const additionalData = useMemo(() => ({ availablePublishers }), [availablePublishers]);

  return <BaseFilter {...props} config={publisherFilterConfig} additionalData={additionalData} />;
}
