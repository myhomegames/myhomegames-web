import { useMemo } from "react";
import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
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

export default function DevelopersFilter({
  availableDevelopers = [],
  ...props
}: DevelopersFilterProps) {
  const developerFilterConfig: FilterConfig = useMemo(
    () => ({
      type: "developers",
      labelKey: "gamesListToolbar.filter.developers",
      searchPlaceholderKey: "gamesListToolbar.filter.searchDevelopers",
      getAvailableValues: (
        _games: GameItem[],
        additionalData?: { availableDevelopers?: Array<{ id: string; title: string }> },
      ): Array<{ value: FilterValue; label: string }> => {
        const developers = additionalData?.availableDevelopers ?? availableDevelopers;
        return developers.map((developer) => ({
          value: developer.id,
          label: developer.title,
        }));
      },
      formatValue: (value: FilterValue): string => {
        if (value === null || value === undefined) return "";
        const developer = availableDevelopers.find((d) => String(d.id) === String(value));
        return developer ? developer.title : String(value);
      },
      isScrollable: true,
    }),
    [availableDevelopers],
  );

  const additionalData = useMemo(() => ({ availableDevelopers }), [availableDevelopers]);

  return <BaseFilter {...props} config={developerFilterConfig} additionalData={additionalData} />;
}
