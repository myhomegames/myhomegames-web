import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./FilterPopup.css";
import type { FilterType, FilterValue, GameItem } from "./types";

export type FilterConfig = {
  type: FilterType;
  labelKey: string;
  searchPlaceholderKey: string;
  getAvailableValues: (games: GameItem[], additionalData?: any) => Array<{ value: FilterValue; label: string }>;
  formatValue: (value: FilterValue) => string;
  isScrollable?: boolean;
};

export type BaseFilterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseCompletely: () => void;
  selectedValue: FilterValue;
  onSelect: (value: FilterValue) => void;
  games?: GameItem[];
  config: FilterConfig;
  additionalData?: any;
};

export default function BaseFilter({
  isOpen,
  onClose,
  onCloseCompletely,
  selectedValue,
  onSelect,
  games = [],
  config,
  additionalData,
}: BaseFilterProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const submenuRef = useRef<HTMLDivElement>(null);

  // Get available values using the config function
  const availableValues = useMemo(() => {
    return config.getAvailableValues(games, additionalData);
  }, [games, config, additionalData]);

  // Filter values based on search query
  const filteredValues = useMemo(() => {
    if (!searchQuery) return availableValues;
    const query = searchQuery.toLowerCase();
    return availableValues.filter((item) => 
      item.label.toLowerCase().includes(query) ||
      item.value?.toString().toLowerCase().includes(query)
    );
  }, [availableValues, searchQuery]);

  // Close submenu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (submenuRef.current && !submenuRef.current.contains(event.target as Node)) {
        onCloseCompletely();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onCloseCompletely]);

  // Close submenu on ESC key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseCompletely();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCloseCompletely]);

  // Reset search when submenu opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleBack = () => {
    onClose();
  };

  const handleSelect = (value: FilterValue) => {
    onSelect(value);
  };

  if (!isOpen) return null;

  return (
    <div className="filter-popup" ref={submenuRef}>
      <div className="filter-popup-header">
        <button
          className="filter-popup-back"
          onClick={handleBack}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="filter-popup-header-title">
          {t(config.labelKey)}
        </span>
      </div>
      <div className="filter-popup-search">
        <input
          id={`filter-search-${config.type}`}
          name="filterSearch"
          type="text"
          className="filter-popup-search-input"
          placeholder={t(config.searchPlaceholderKey)}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className={`filter-popup-content ${config.isScrollable ? "filter-popup-scrollable" : ""}`}>
        {filteredValues.map((item) => (
          <button
            key={item.value?.toString() || "null"}
            className={`filter-popup-item ${
              selectedValue === item.value ? "active" : ""
            }`}
            onClick={() => handleSelect(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

