import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Cover from "../games/Cover";
import type { TagItem } from "../../types";
import { useSkin } from "../../contexts/SkinContext";
import FixedFocalTagList from "./FixedFocalTagList";

type TagListProps = {
  items: TagItem[];
  coverSize?: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onItemEdit?: (item: TagItem) => void;
  getDisplayName?: (item: TagItem) => string;
  getCoverUrl?: (item: TagItem) => string;
  getRoute?: (item: TagItem) => string;
  emptyMessage?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  routeBase?: string;
};

type TagListItemProps = {
  item: TagItem;
  coverSize: number;
  forceVerticalAlignment?: boolean;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onItemEdit?: (item: TagItem) => void;
  getDisplayName?: (item: TagItem) => string;
  getCoverUrl?: (item: TagItem) => string;
  getRoute?: (item: TagItem) => string;
};

export function TagListItem({
  item,
  coverSize,
  forceVerticalAlignment = false,
  itemRefs,
  onItemEdit,
  getDisplayName,
  getCoverUrl,
  getRoute,
}: TagListItemProps) {
  const navigate = useNavigate();
  const coverHeight = coverSize * (9 / 16); // 16:9 aspect ratio (1280x720px)
  const displayName = getDisplayName ? getDisplayName(item) : item.title;
  const coverUrl = getCoverUrl ? getCoverUrl(item) : "";

  const handleClick = () => {
    const route = getRoute ? getRoute(item) : `/category/${item.id}`;
    navigate(route);
  };

  const handleEdit = () => {
    if (onItemEdit) {
      onItemEdit(item);
    }
  };

  return (
    <div
      key={item.id}
      ref={(el) => {
        if (el && itemRefs?.current) {
          itemRefs.current.set(String(item.id), el);
        }
      }}
      className="group cursor-pointer tag-list-item"
      style={
        forceVerticalAlignment
          ? {
              width: "min(var(--mhg-vertical-column-width), calc(100vw - 140px))",
              minWidth: "min(var(--mhg-vertical-column-width), calc(100vw - 140px))",
            }
          : undefined
      }
      onClick={handleClick}
    >
      <Cover
        title={displayName}
        coverUrl={coverUrl}
        width={coverSize}
        height={coverHeight}
        onClick={handleClick}
        onEdit={onItemEdit ? handleEdit : undefined}
        showTitle={item.showTitle !== false}
        titlePosition={forceVerticalAlignment ? "bottom" : "overlay"}
        detail={true}
        play={false}
        showBorder={true}
        aspectRatio="16/9"
      />
    </div>
  );
}

export default function TagList({
  items,
  coverSize = 150,
  itemRefs,
  onItemEdit,
  getDisplayName,
  getCoverUrl,
  getRoute,
  emptyMessage,
  scrollContainerRef,
  routeBase = "",
}: TagListProps) {
  const { t } = useTranslation();
  const { activeSkinWeb } = useSkin();
  const forceVerticalAlignment = activeSkinWeb.verticalCoverAlignment;
  const useFixedFocal = forceVerticalAlignment && scrollContainerRef != null && routeBase.length > 0;
  
  if (items.length === 0) {
    return (
      <div className="tag-list-empty">
        <div className="text-gray-400 text-center">
          {emptyMessage || t("categories.noCategoriesFound")}
        </div>
      </div>
    );
  }

  if (useFixedFocal) {
    return (
      <FixedFocalTagList
        items={items}
        coverSize={coverSize}
        routeBase={routeBase}
        containerRef={scrollContainerRef}
        itemRefs={itemRefs}
        onItemEdit={onItemEdit}
        getDisplayName={getDisplayName}
        getCoverUrl={getCoverUrl}
        getRoute={getRoute}
      />
    );
  }

  return (
    <div
      className="tag-list-container"
      style={
        {
          ["--tag-list-cover-size" as string]: `${coverSize}px`,
          ...(forceVerticalAlignment
            ? {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                marginLeft:
                  "max(0px, calc(var(--mhg-active-library-icon-center-x, 180px) - (var(--mhg-vertical-column-width) / 2) + var(--mhg-vertical-column-shift-x, 0px)))",
                marginRight: "auto",
                gap: "20px",
              }
            : {}),
        } as CSSProperties
      }
    >
      {items.map((item) => (
        <TagListItem
          key={String(item.id)}
          item={item}
          coverSize={coverSize}
          forceVerticalAlignment={forceVerticalAlignment}
          itemRefs={itemRefs}
          onItemEdit={onItemEdit}
          getDisplayName={getDisplayName}
          getCoverUrl={getCoverUrl}
          getRoute={getRoute}
        />
      ))}
    </div>
  );
}

