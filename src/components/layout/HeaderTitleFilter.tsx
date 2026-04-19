import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTitleFilter } from "../../contexts/TitleFilterContext";

export default function HeaderTitleFilter() {
  const { t } = useTranslation();
  const { query, setQuery } = useTitleFilter();
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`mhg-search-container-wrapper mhg-title-filter-wrapper search-bar-wrapper${focused ? " search-focused" : ""}`}
    >
      <div className="mhg-search-icon-wrapper" aria-hidden>
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t("header.titleFilterPlaceholder", "Filter by title…")}
        aria-label={t("header.titleFilterAria", "Filter current list by title")}
        className="mhg-search-input mhg-title-filter-input search-input-with-padding"
      />
    </div>
  );
}
