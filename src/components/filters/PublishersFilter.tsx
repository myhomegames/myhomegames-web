import { useMemo } from "react";
import TagValueFilter from "./TagValueFilter";
import type { FilterValue, GameItem } from "./types";
import { toDevPubIds } from "../../utils/devPubUtils";

type PublishersFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
  availablePublishers?: Array<{ id: string; title: string }>;
};

export default function PublishersFilter(props: PublishersFilterProps) {
  const { availablePublishers = [], ...rest } = props;
  const formatValue = useMemo(() => {
    if (availablePublishers.length === 0) return undefined;
    return (value: string) => {
      const found = availablePublishers.find((p) => String(p.id) === String(value));
      return found ? found.title : value;
    };
  }, [availablePublishers]);

  return (
    <TagValueFilter
      {...rest}
      type="publishers"
      labelKey="gamesListToolbar.filter.publishers"
      searchPlaceholderKey="gamesListToolbar.filter.searchPublishers"
      valueExtractor={(game) => toDevPubIds(game.publishers)}
      formatValue={formatValue}
    />
  );
}
