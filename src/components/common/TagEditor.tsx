import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { buildApiUrl } from "../../utils/api";
import { useLoading } from "../../contexts/LoadingContext";
import { useCategories } from "../../contexts/CategoriesContext";
import "./TagEditor.css";

type TagEditorProps = {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  mode?: "categories" | "freeform";
  availableTags?: string[];
  getDisplayName?: (tag: string) => string;
  allowCreate?: boolean;
};

export default function TagEditor({
  selectedTags,
  onTagsChange,
  disabled = false,
  placeholder,
  mode = "categories",
  availableTags,
  getDisplayName,
  allowCreate = true,
}: TagEditorProps) {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const { categories: availableCategories, addCategory } = useCategories();
  const [tagSearch, setTagSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const isCategoryMode = mode === "categories";

  async function createCategory(title: string): Promise<string | null> {
    if (!isCategoryMode) return null;
    try {
      setLoading(true);
      setIsCreating(true);
      const url = buildApiUrl(API_BASE, "/categories");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Auth-Token": getApiToken(),
        },
        body: JSON.stringify({ title }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      
      const json = await res.json();
      const newCategory = json.category;
      // Handle both old format (string) and new format (object)
      const categoryTitle = typeof newCategory === "string" ? newCategory : newCategory.title;
      const categoryId = typeof newCategory === "string" ? newCategory : newCategory.id;
      
      // Add to context
      addCategory({ id: categoryId, title: categoryTitle });
      
      return categoryTitle;
    } catch (err: any) {
      console.error("Error creating category:", err);
      return null;
    } finally {
      setLoading(false);
      setIsCreating(false);
    }
  }

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tagId));
  };

  const handleAddTag = (tagId: string) => {
    if (!selectedTags.includes(tagId)) {
      onTagsChange([...selectedTags, tagId]);
      setTagSearch("");
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagSearch.trim() && !isCreating) {
      e.preventDefault();
      const rawSearch = tagSearch.trim();
      const searchTerm = rawSearch.toLowerCase();

      if (isCategoryMode) {
        // First, try to find existing category
        const category = availableCategories.find((c) => {
          const categoryTitle = c.title.toLowerCase();
          const translatedName = t(`genre.${c.title}`, c.title).toLowerCase();
          return (
            categoryTitle === searchTerm ||
            translatedName === searchTerm ||
            translatedName.includes(searchTerm)
          );
        });

        if (category && !selectedTags.includes(category.title)) {
          handleAddTag(category.title);
          return;
        }

        // If not found, create new category
        const newCategory = await createCategory(rawSearch);
        if (newCategory && !selectedTags.includes(newCategory)) {
          handleAddTag(newCategory);
        }
      } else {
        const tagOptions = availableTags || [];
        const matchingTag = tagOptions.find((tag) => tag.toLowerCase() === searchTerm);
        if (matchingTag && !selectedTags.includes(matchingTag)) {
          handleAddTag(matchingTag);
          return;
        }

        if (allowCreate) {
          handleAddTag(rawSearch);
        }
      }
    }
  };

  const tagOptions = isCategoryMode
    ? availableCategories.map((category) => category.title)
    : availableTags || [];
  const getTagDisplayName = (tag: string) => {
    if (isCategoryMode) {
      return t(`genre.${tag}`, tag);
    }
    return getDisplayName ? getDisplayName(tag) : tag;
  };
  const filteredSuggestions = tagOptions.filter((tag) => {
    if (selectedTags.includes(tag)) return false;
    const searchTerm = tagSearch.toLowerCase();
    if (!searchTerm) return false;
    if (isCategoryMode) {
      const translatedName = t(`genre.${tag}`, tag).toLowerCase();
      return tag.toLowerCase().includes(searchTerm) || translatedName.includes(searchTerm);
    }
    const displayName = getTagDisplayName(tag).toLowerCase();
    return tag.toLowerCase().includes(searchTerm) || displayName.includes(searchTerm);
  });

  return (
    <div className="tag-editor-container">
      <div className="tag-editor-tags">
        {selectedTags.map((tagId) => (
          <span key={tagId} className="tag-editor-tag">
            {getTagDisplayName(tagId)}
            <button
              type="button"
              className="tag-editor-tag-remove"
              onClick={() => handleRemoveTag(tagId)}
              disabled={disabled}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="tag-editor-input"
          name="tag"
          type="text"
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || t("gameDetail.addTag", "Add tag...")}
          className="tag-editor-input"
          aria-label={placeholder || t("gameDetail.addTag", "Add tag...")}
        />
      </div>
      {tagSearch && filteredSuggestions.length > 0 && (
        <div className="tag-editor-suggestions">
          {filteredSuggestions.slice(0, 5).map((tag) => (
            <button
              key={tag}
              type="button"
              className="tag-editor-suggestion"
              onClick={() => handleAddTag(tag)}
              disabled={disabled}
            >
              {getTagDisplayName(tag)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

