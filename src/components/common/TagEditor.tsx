import { useState, useMemo, useId, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { buildApiUrl } from "../../utils/api";
import { useTagLists } from "../../contexts/TagListsContext";
type TagEditorProps = {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  mode?: "categories" | "freeform";
  availableTags?: string[];
  getDisplayName?: (tag: string) => string;
  allowCreate?: boolean;
  /** Optional; use with a parent `<label htmlFor={sameId}>`. If omitted, a unique id is generated. */
  inputId?: string;
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
  inputId: inputIdProp,
}: TagEditorProps) {
  const generatedInputId = useId();
  const inputId = inputIdProp ?? generatedInputId;
  const inputName = `tag-editor${inputId.replace(/:/g, "-")}`;
  const { t } = useTranslation();
  const { tagLabels, refreshTagLists } = useTagLists();
  const availableCategories = useMemo(
    () => Array.from(tagLabels.categories.values()),
    [tagLabels.categories]
  );
  const categoriesList = useMemo(
    () => Array.from(tagLabels.categories.entries()).map(([id, title]) => ({ id, title })),
    [tagLabels.categories]
  );
  const [tagSearch, setTagSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [suggestionsStyle, setSuggestionsStyle] = useState<React.CSSProperties | null>(null);
  const blurHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCategoryMode = mode === "categories";

  async function createCategory(title: string): Promise<string | null> {
    if (!isCategoryMode) return null;
    try {
      // Do not use global LoadingContext here: Library hides the games list (and
      // EditGameModal inside it) while `isLoading` is true.
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
      
      // Refresh tag lists so the new category appears in suggestions
      await refreshTagLists();
      
      return categoryTitle;
    } catch (err: any) {
      console.error("Error creating category:", err);
      return null;
    } finally {
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
      e.stopPropagation();
      const rawSearch = tagSearch.trim();
      const searchTerm = rawSearch.toLowerCase();

      if (isCategoryMode) {
        // First, try to find existing category
        const category = categoriesList.find((c) => {
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
    ? availableCategories
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
    if (!searchTerm) return isFocused;
    if (isCategoryMode) {
      const translatedName = t(`genre.${tag}`, tag).toLowerCase();
      return tag.toLowerCase().includes(searchTerm) || translatedName.includes(searchTerm);
    }
    const displayName = getTagDisplayName(tag).toLowerCase();
    return tag.toLowerCase().includes(searchTerm) || displayName.includes(searchTerm);
  });

  const showSuggestions = (isFocused || Boolean(tagSearch)) && filteredSuggestions.length > 0;

  const updateSuggestionsPosition = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const maxH = 200;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 96 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(80, Math.min(maxH, openUp ? spaceAbove : spaceBelow));
    setSuggestionsStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 10010,
      maxHeight,
      ...(openUp
        ? { top: "auto", bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap, bottom: "auto" }),
    });
  };

  useLayoutEffect(() => {
    if (!showSuggestions) {
      setSuggestionsStyle(null);
      return;
    }
    updateSuggestionsPosition();
  }, [showSuggestions, filteredSuggestions.length, tagSearch, selectedTags.length]);

  useEffect(() => {
    if (!showSuggestions) return;
    const update = () => updateSuggestionsPosition();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [showSuggestions]);

  useEffect(() => {
    return () => {
      if (blurHideTimerRef.current) clearTimeout(blurHideTimerRef.current);
    };
  }, []);

  const suggestionsList = showSuggestions && suggestionsStyle && typeof document !== "undefined"
    ? createPortal(
        <div className="tag-editor-suggestions" style={suggestionsStyle} role="listbox">
          {filteredSuggestions.slice(0, 50).map((tag) => (
            <button
              key={tag}
              type="button"
              className="tag-editor-suggestion"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAddTag(tag)}
              disabled={disabled}
            >
              {getTagDisplayName(tag)}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="tag-editor-container" ref={containerRef}>
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
          id={inputId}
          name={inputName}
          type="text"
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (blurHideTimerRef.current) {
              clearTimeout(blurHideTimerRef.current);
              blurHideTimerRef.current = null;
            }
            setIsFocused(true);
          }}
          onBlur={() => {
            blurHideTimerRef.current = setTimeout(() => setIsFocused(false), 150);
          }}
          disabled={disabled}
          placeholder={placeholder || t("gameDetail.addTag", "Add tag...")}
          className="tag-editor-input"
          aria-label={placeholder || t("gameDetail.addTag", "Add tag...")}
          autoComplete="off"
        />
      </div>
      {suggestionsList}
    </div>
  );
}

