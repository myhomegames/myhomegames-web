import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

type InlineTagListProps<TItem> = {
  items: TItem[];
  getLabel: (item: TItem) => string;
  onItemClick?: (item: TItem) => void;
  isClickable?: (item: TItem) => boolean;
  getKey?: (item: TItem, index: number) => string;
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

  const wrapperProps = useInfoStyles
    ? { className: "game-info-list" }
    : {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "baseline",
        } as CSSProperties,
      };

  return (
    <div {...wrapperProps}>
      {displayedItems.map((item, index) => {
        const label = getLabel(item);
        const clickable = Boolean(onItemClick) && (isClickable ? isClickable(item) : true);
        const content = useInfoStyles ? (
          clickable ? (
            <button
              type="button"
              className="game-info-list-item game-info-list-link"
              onClick={() => onItemClick?.(item)}
            >
              {label}
            </button>
          ) : (
            <span className="game-info-list-item">{label}</span>
          )
        ) : (
          <span
            onClick={clickable ? () => onItemClick?.(item) : undefined}
            style={{
              color: "rgba(255, 255, 255, 0.8)",
              fontFamily: "var(--font-body-2-font-family)",
              fontSize: "var(--font-body-2-font-size)",
              lineHeight: "var(--font-body-2-line-height)",
              cursor: clickable ? "pointer" : "default",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              if (!clickable) return;
              e.currentTarget.style.textDecoration = "underline";
              e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
            }}
            onMouseLeave={(e) => {
              if (!clickable) return;
              e.currentTarget.style.textDecoration = "none";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
            }}
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
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontFamily: "var(--font-body-2-font-family)",
                    fontSize: "var(--font-body-2-font-size)",
                    lineHeight: "var(--font-body-2-line-height)",
                  }}
                >
                  ,{" "}
                </span>
              )
            )}
            {index === displayedItems.length - 1 && shouldShowMore && (
              useInfoStyles ? (
                <span className="game-info-list-separator">,{" "}</span>
              ) : (
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontFamily: "var(--font-body-2-font-family)",
                    fontSize: "var(--font-body-2-font-size)",
                    lineHeight: "var(--font-body-2-line-height)",
                  }}
                >
                  ,{" "}
                </span>
              )
            )}
          </span>
        );
      })}
      {shouldShowMore && (
        useInfoStyles ? (
          <span className="game-info-list-item">
            <button
              type="button"
              className="game-info-list-item game-info-list-link"
              onClick={handleExpandClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                lineHeight: "var(--font-body-2-line-height)",
                verticalAlign: "baseline",
              }}
            >
              {showMoreLabel ?? t("gameDetail.andMore", ", and more")}
            </button>
          </span>
        ) : (
          <span
            onClick={handleExpandClick}
            style={{
              color: "rgba(255, 255, 255, 0.8)",
              fontFamily: "var(--font-body-2-font-family)",
              fontSize: "var(--font-body-2-font-size)",
              lineHeight: "var(--font-body-2-line-height)",
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              verticalAlign: "baseline",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
              e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
            }}
          >
            {showMoreLabel ?? t("gameDetail.andMore", ", and more")}
          </span>
        )
      )}
    </div>
  );
}
