import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Cover from "../games/Cover";
import type { CategoryItem } from "../../types";
import { buildCategoryCoverUrl } from "../../utils/api";
import { API_BASE } from "../../config";
import "./CategoriesList.css";

type CategoriesListProps = {
  categories: CategoryItem[];
  coverSize?: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onCategoryEdit?: (category: CategoryItem) => void;
};

type CategoryListItemProps = {
  category: CategoryItem;
  coverSize: number;
  itemRefs?: React.RefObject<Map<string, HTMLElement>>;
  onCategoryEdit?: (category: CategoryItem) => void;
};

function CategoryListItem({
  category,
  coverSize,
  itemRefs,
  onCategoryEdit,
}: CategoryListItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const coverHeight = coverSize * (9 / 16); // 16:9 aspect ratio (1280x720px)

  const handleClick = () => {
    // Use category.id for navigation (numeric ID, no encoding needed)
    navigate(`/category/${category.id}`);
  };

  const handleEdit = () => {
    if (onCategoryEdit) {
      onCategoryEdit(category);
    }
  };

  return (
    <div
      key={category.id}
      ref={(el) => {
        if (el && itemRefs?.current) {
          itemRefs.current.set(category.id, el);
        }
      }}
      className="group cursor-pointer categories-list-item"
      style={{ width: `${coverSize}px`, minWidth: `${coverSize}px` }}
      onClick={handleClick}
    >
      <Cover
        title={t(`genre.${category.title}`, category.title)}
        coverUrl={buildCategoryCoverUrl(API_BASE, category.id, category.cover)}
        width={coverSize}
        height={coverHeight}
        onClick={handleClick}
        onEdit={onCategoryEdit ? handleEdit : undefined}
        showTitle={true}
        titlePosition="overlay"
        detail={true}
        play={false}
        showBorder={true}
        aspectRatio="16/9"
      />
    </div>
  );
}

export default function CategoriesList({
  categories,
  coverSize = 150,
  itemRefs,
  onCategoryEdit,
}: CategoriesListProps) {
  const { t } = useTranslation();
  
  if (categories.length === 0) {
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
        <div className="text-gray-400 text-center">{t("categories.noCategoriesFound")}</div>
      </div>
    );
  }

  return (
    <div
      className="categories-list-container"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${coverSize}px)` }}
    >
      {categories.map((category) => (
        <CategoryListItem
          key={category.id}
          category={category}
          coverSize={coverSize}
          itemRefs={itemRefs}
          onCategoryEdit={onCategoryEdit}
        />
      ))}
    </div>
  );
}

