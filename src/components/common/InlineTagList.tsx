import { useState } from "react";
import { useTranslation } from "react-i18next";
type InlineTagListProps<TItem> = {
  items: TItem[];
  getLabel: (item: TItem) => string;
  onItemClick?: (item: TItem) => void;
  isClickable?: (item: TItem) => boolean;
  getKey?: (item: TItem, index: number) => string;
  getItemClassName?: (item: TItem) => string | undefined;
  showMoreMinCount?: number;
  showMoreLabel?: string;
  useInfoStyles?: boolean;
};

export default function InlineTagList<TItem>({
  items,
  getLabel,
  onItemClick,
  isClickable,
  getKey,
  getItemClassName,
  showMoreMinCount = 4,
  showMoreLabel,
  useInfoStyles = false,
}: InlineTagListProps<TItem>) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items || items.length === 0) {
    return null;
  }

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(true);
  };

  const hasMoreThanMin = (showMoreMinCount ?? 0) > 0 && items.length > (showMoreMinCount ?? 0);
  const shouldShowMore = Boolean(showMoreLabel) && hasMoreThanMin && !isExpanded;
  const displayedItems = shouldShowMore ? items.slice(0, showMoreMinCount) : items;
  const getItemKey = (item: TItem, index: number) =>
    getKey ? getKey(item, index) : `${getLabel(item)}-${index}`;

  const wrapperClass = useInfoStyles ? "game-info-list" : "inline-tag-list";

  return (
    <div className={wrapperClass}>
      {displayedItems.map((item, index) => {
        const label = getLabel(item);
        const clickable = Boolean(onItemClick) && (isClickable ? isClickable(item) : true);
        const extraClass = getItemClassName?.(item) ?? "";
        const itemClass = ["game-info-list-item", extraClass].filter(Boolean).join(" ");
        const content = useInfoStyles ? (
          clickable ? (
            <button
              type="button"
              className={`${itemClass} game-info-list-link`}
              onClick={() => onItemClick?.(item)}
            >
              {label}
            </button>
          ) : (
            <span className={itemClass}>{label}</span>
          )
        ) : (
          <span
            className={`inline-tag-list-item${clickable ? " inline-tag-list-item--clickable" : " inline-tag-list-item--static"}`}
            onClick={clickable ? () => onItemClick?.(item) : undefined}
          >
            {label}
          </span>
        );

        return (
          <span key={getItemKey(item, index)}>
            {content}
            {index < displayedItems.length - 1 && (
              useInfoStyles ? (
                <span className="game-info-list-separator">,{" "}</span>
              ) : (
                <span className="inline-tag-list-sep">,{" "}</span>
              )
            )}
            {index === displayedItems.length - 1 && shouldShowMore && (
              useInfoStyles ? (
                <span className="game-info-list-separator">,{" "}</span>
              ) : (
                <span className="inline-tag-list-sep">,{" "}</span>
              )
            )}
          </span>
        );
      })}
      {shouldShowMore && (
        useInfoStyles ? (
          <span className="game-info-list-item">
            <button type="button" className="game-info-list-item game-info-list-link inline-tag-list-more-btn" onClick={handleExpandClick}>
              {showMoreLabel ?? t("gameDetail.andMore", ", and more")}
            </button>
          </span>
        ) : (
          <span className="inline-tag-list-more-span" onClick={handleExpandClick}>
            {showMoreLabel ?? t("gameDetail.andMore", ", and more")}
          </span>
        )
      )}
    </div>
  );
}
