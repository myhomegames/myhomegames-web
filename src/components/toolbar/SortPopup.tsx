import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { SortField } from "../../types";
import "./SortPopup.css";

type SortPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  currentSort: SortField;
  sortAscending: boolean;
  onSortChange?: (field: SortField) => void;
  onSortDirectionChange?: (ascending: boolean) => void;
};

export default function SortPopup({
  isOpen,
  onClose,
  currentSort,
  sortAscending,
  onSortChange,
  onSortDirectionChange,
}: SortPopupProps) {
  const { t } = useTranslation();
  const sortRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close popup on ESC key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const sortOptions: { value: SortField; label: string }[] = [
    { value: "title", label: t("gamesListToolbar.sort.title") },
    { value: "year", label: t("gamesListToolbar.sort.year") },
    { value: "releaseDate", label: t("gamesListToolbar.sort.releaseDate") },
    { value: "criticRating", label: t("gamesListToolbar.sort.criticRating") },
    { value: "userRating", label: t("gamesListToolbar.sort.userRating") },
    { value: "stars", label: t("gamesListToolbar.sort.stars") },
    { value: "ageRating", label: t("gamesListToolbar.sort.ageRating") },
  ];

  const handleSortSelect = (field: SortField) => {
    if (field === currentSort && onSortDirectionChange) {
      // If clicking the same field, toggle direction
      onSortDirectionChange(!sortAscending);
    } else {
      // If selecting a new field, set to ascending by default
      onSortChange?.(field);
      if (onSortDirectionChange) {
        onSortDirectionChange(true);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="sort-popup" ref={sortRef}>
      {sortOptions.map((option) => (
        <button
          key={option.value}
          className={`sort-popup-item ${
            currentSort === option.value ? "selected" : ""
          }`}
          onClick={() => handleSortSelect(option.value)}
        >
          <span>{option.label}</span>
          {currentSort === option.value && (
            <svg
              className={`sort-popup-sort-direction ${sortAscending ? "ascending" : "descending"}`}
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d={sortAscending ? "M6 2L10 8H2L6 2Z" : "M6 10L2 4H10L6 10Z"}
                fill="currentColor"
              />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

