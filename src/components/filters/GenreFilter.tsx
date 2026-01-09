import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import BaseFilter from "./BaseFilter";
import type { FilterConfig } from "./BaseFilter";
import type { FilterValue, GameItem } from "./types";

interface GenreFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
  availableGenres?: Array<{ id: string; title: string }>;
}

export default function GenreFilter({
  availableGenres = [],
  ...props
}: GenreFilterProps) {
  const { t } = useTranslation();

  const genreFilterConfig: FilterConfig = useMemo(() => ({
    type: "genre",
    labelKey: "gamesListToolbar.filter.genre",
    searchPlaceholderKey: "gamesListToolbar.filter.searchGenre",
    getAvailableValues: (_games: GameItem[], additionalData?: any): Array<{ value: FilterValue; label: string }> => {
      const genres = additionalData?.availableGenres || availableGenres;
      return genres.map((genre: { id: string; title: string }) => ({
        value: genre.id,
        label: t(`genre.${genre.title}`, genre.title),
      }));
    },
    formatValue: (value: FilterValue): string => {
      if (typeof value !== "string") return "";
      const genre = availableGenres.find((g) => g.id === value);
      return genre ? t(`genre.${genre.title}`, genre.title) : "";
    },
    isScrollable: true,
  }), [availableGenres, t]);

  const additionalData = useMemo(() => ({ availableGenres }), [availableGenres]);

  return <BaseFilter {...props} config={genreFilterConfig} additionalData={additionalData} />;
}

