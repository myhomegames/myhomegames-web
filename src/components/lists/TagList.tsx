import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Cover from "../games/Cover";
import type { CategoryItem } from "../../types";
import "./TagList.css";

type TagListProps = {
  items: CategoryItem[];
  coverSize?: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onItemEdit?: (item: CategoryItem) => void;
  getDisplayName?: (item: CategoryItem) => string;
  getCoverUrl?: (item: CategoryItem) => string;
  getRoute?: (item: CategoryItem) => string;
  emptyMessage?: string;
};

type TagListItemProps = {
  item: CategoryItem;
  coverSize: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onItemEdit?: (item: CategoryItem) => void;
  getDisplayName?: (item: CategoryItem) => string;
  getCoverUrl?: (item: CategoryItem) => string;
  getRoute?: (item: CategoryItem) => string;
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
          itemRefs.current.set(item.id, el);
        }
      }}
      className="group cursor-pointer tag-list-item"
      style={{ width: `${coverSize}px`, minWidth: `${coverSize}px` }}
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
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
        }}
      >
        <div className="text-gray-400 text-center">
          {emptyMessage || t("categories.noCategoriesFound")}
        </div>
      </div>
    );
  }

  return (
    <div
      className="tag-list-container"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${coverSize}px)` }}
    >
      {items.map((item) => (
        <TagListItem
          key={item.id}
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

