import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Cover from "../games/Cover";
import type { TagItem } from "../../types";
type TagListProps = {
  items: TagItem[];
  coverSize?: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onItemEdit?: (item: TagItem) => void;
  getDisplayName?: (item: TagItem) => string;
  getCoverUrl?: (item: TagItem) => string;
  getRoute?: (item: TagItem) => string;
  emptyMessage?: string;
};

type TagListItemProps = {
  item: TagItem;
  coverSize: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onItemEdit?: (item: TagItem) => void;
  getDisplayName?: (item: TagItem) => string;
  getCoverUrl?: (item: TagItem) => string;
  getRoute?: (item: TagItem) => string;
};

function TagListItem({
  item,
  coverSize,
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
        titlePosition="overlay"
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
}: TagListProps) {
  const { t } = useTranslation();
  
  if (items.length === 0) {
    return (
      <div className="tag-list-empty">
        <div className="text-gray-400 text-center">
          {emptyMessage || t("categories.noCategoriesFound")}
        </div>
      </div>
    );
  }

  return (
    <div
      className="tag-list-container"
      style={{ ["--tag-list-cover-size" as string]: `${coverSize}px` } as CSSProperties}
    >
      {items.map((item) => (
        <TagListItem
          key={String(item.id)}
          item={item}
          coverSize={coverSize}
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

