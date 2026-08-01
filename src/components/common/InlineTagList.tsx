import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSkin } from "../../contexts/SkinContext";
import { isSmartTvBrowser } from "../../utils/smartTv";

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

const NARROW_MQ = "(max-width: 720px)";

function useCompactTvOrPhoneSurface(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      document.documentElement.dataset.mhgTv === "1" ||
      isSmartTvBrowser() ||
      window.matchMedia(NARROW_MQ).matches
    );
  });

  useEffect(() => {
    const sync = () => {
      setCompact(
        document.documentElement.dataset.mhgTv === "1" ||
          isSmartTvBrowser() ||
          window.matchMedia(NARROW_MQ).matches
      );
    };
    sync();
    window.addEventListener("resize", sync);
    const mq = window.matchMedia(NARROW_MQ);
    mq.addEventListener?.("change", sync);
    const retry = window.setTimeout(sync, 100);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener("resize", sync);
      mq.removeEventListener?.("change", sync);
    };
  }, []);

  return compact;
}

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
  const { activeSkinWeb } = useSkin();
  const compactSurface = useCompactTvOrPhoneSurface();
  const staticMode = activeSkinWeb.staticInlineTagListOnTvPhone && compactSurface;
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [items]);

  if (!items || items.length === 0) {
    return null;
  }

  const effectiveOnItemClick = staticMode ? undefined : onItemClick;
  const effectiveShowMoreLabel = staticMode ? undefined : showMoreLabel;

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(true);
  };

  const hasMoreThanMin = (showMoreMinCount ?? 0) > 0 && items.length > (showMoreMinCount ?? 0);
  const shouldShowMore = Boolean(effectiveShowMoreLabel) && hasMoreThanMin && !isExpanded;
  const displayedItems = shouldShowMore ? items.slice(0, showMoreMinCount) : items;
  const getItemKey = (item: TItem, index: number) =>
    getKey ? getKey(item, index) : `${getLabel(item)}-${index}`;

  const wrapperClass = useInfoStyles ? "game-info-list" : "inline-tag-list";

  return (
    <div className={`${wrapperClass}${staticMode ? " inline-tag-list--static" : ""}`}>
      {displayedItems.map((item, index) => {
        const label = getLabel(item);
        const clickable =
          Boolean(effectiveOnItemClick) && (isClickable ? isClickable(item) : true);
        const extraClass = getItemClassName?.(item) ?? "";
        const itemClass = ["game-info-list-item", extraClass].filter(Boolean).join(" ");
        const content = useInfoStyles ? (
          clickable ? (
            <button
              type="button"
              className={`${itemClass} game-info-list-link`}
              onClick={() => effectiveOnItemClick?.(item)}
            >
              {label}
            </button>
          ) : (
            <span className={itemClass}>{label}</span>
          )
        ) : (
          <span
            className={`inline-tag-list-item${clickable ? " inline-tag-list-item--clickable" : " inline-tag-list-item--static"}`}
            onClick={clickable ? () => effectiveOnItemClick?.(item) : undefined}
          >
            {label}
          </span>
        );

        return (
          <Fragment key={getItemKey(item, index)}>
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
          </Fragment>
        );
      })}
      {shouldShowMore && (
        useInfoStyles ? (
          <span className="game-info-list-item">
            <button type="button" className="game-info-list-item game-info-list-link inline-tag-list-more-btn" onClick={handleExpandClick}>
              {effectiveShowMoreLabel ?? t("gameDetail.andMore", ", and more")}
            </button>
          </span>
        ) : (
          <span className="inline-tag-list-more-span" onClick={handleExpandClick}>
            {effectiveShowMoreLabel ?? t("gameDetail.andMore", ", and more")}
          </span>
        )
      )}
    </div>
  );
}
