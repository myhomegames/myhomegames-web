import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./GamesListTable.css";

type ColumnVisibility = {
  title: boolean;
  releaseDate: boolean;
  year: boolean;
  stars: boolean;
  criticRating: boolean;
  ageRating: boolean;
};

type GamesListTableHeaderProps = {
  columnVisibility: ColumnVisibility;
  onToggleColumn: (column: keyof ColumnVisibility) => void;
  sortField?: "title" | "year" | "stars" | "releaseDate" | "criticRating" | "userRating" | "ageRating";
  sortAscending?: boolean;
  onSort: (field: "title" | "year" | "stars" | "releaseDate" | "criticRating" | "userRating" | "ageRating") => void;
};

export default function GamesListTableHeader({
  columnVisibility,
  onToggleColumn,
  sortField,
  sortAscending = true,
  onSort,
}: GamesListTableHeaderProps) {
  const { t, i18n } = useTranslation();
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getSortIcon = (field: "title" | "year" | "stars" | "releaseDate" | "criticRating" | "ageRating") => {
    if (sortField !== field) return "";
    return sortAscending ? "↑" : "↓";
  };

  const columnDefinitions = useMemo(
    () => [
      {
        key: "title" as keyof ColumnVisibility,
        label: t("table.title"),
      },
      {
        key: "releaseDate" as keyof ColumnVisibility,
        label: t("table.releaseDate"),
      },
      {
        key: "year" as keyof ColumnVisibility,
        label: t("table.year"),
      },
      {
        key: "stars" as keyof ColumnVisibility,
        label: t("table.stars"),
      },
      {
        key: "criticRating" as keyof ColumnVisibility,
        label: t("table.criticRating"),
      },
      {
        key: "ageRating" as keyof ColumnVisibility,
        label: t("table.ageRating"),
      },
    ],
    [t, i18n.language]
  );

  // Determine the first visible column for header alignment
  const firstVisibleColumn = columnVisibility.title
    ? "title"
    : columnVisibility.releaseDate
    ? "releaseDate"
    : columnVisibility.stars
    ? "stars"
    : columnVisibility.year
    ? "year"
    : columnVisibility.criticRating
    ? "criticRating"
    : columnVisibility.ageRating
    ? "ageRating"
    : null;

  return (
    <div className="games-table-header-section">
      <table className="games-table-header-table">
        <thead>
          <tr>
            <th className="games-table-header-table th column-menu">
              <div className="games-table-column-menu-wrapper" ref={menuRef}>
                <button
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className="games-table-column-menu-button"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    className={`games-table-column-menu-arrow ${
                      showColumnMenu ? "open" : ""
                    }`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
                {showColumnMenu && (
                  <div className="games-table-column-menu-popup">
                    {columnDefinitions.map((col) => (
                      <button
                        key={col.key}
                        className={`games-table-column-menu-item ${
                          columnVisibility[col.key] ? "selected" : ""
                        }`}
                        onClick={() => onToggleColumn(col.key)}
                      >
                        <span>{col.label}</span>
                        {columnVisibility[col.key] && (
                          <svg
                            className="games-table-column-menu-check"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                              fill="#E5A00D"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </th>
            {columnVisibility.title && (
              <th
                onClick={() => onSort("title")}
                className={`title-cell has-border-right ${firstVisibleColumn === "title" ? "first-visible-cell" : ""} ${sortField === "title" ? "sorted" : ""}`}
              >
                <span>{t("table.title")}</span>
                <span className="sort-indicator">{getSortIcon("title")}</span>
              </th>
            )}
            {columnVisibility.releaseDate && (
              <th
                onClick={() => onSort("releaseDate")}
                className={`date-cell has-border-right ${firstVisibleColumn === "releaseDate" ? "first-visible-cell" : ""} ${sortField === "releaseDate" ? "sorted" : ""}`}
              >
                <span>{t("table.releaseDate")}</span>
                <span className="sort-indicator">{getSortIcon("releaseDate")}</span>
              </th>
            )}
            {columnVisibility.stars && (
              <th
                onClick={() => onSort("stars")}
                className={`stars-cell has-border-right ${firstVisibleColumn === "stars" ? "first-visible-cell" : ""} ${sortField === "stars" ? "sorted" : ""}`}
              >
                <span>{t("table.stars")}</span>
                <span className="sort-indicator">{getSortIcon("stars")}</span>
              </th>
            )}
            {columnVisibility.year && (
              <th
                onClick={() => onSort("year")}
                className={`year-cell has-border-right ${firstVisibleColumn === "year" ? "first-visible-cell" : ""} ${sortField === "year" ? "sorted" : ""}`}
              >
                <span>{t("table.year")}</span>
                <span className="sort-indicator">{getSortIcon("year")}</span>
              </th>
            )}
            {columnVisibility.criticRating && (
              <th
                onClick={() => onSort("criticRating")}
                className={`critic-rating-cell has-border-right ${firstVisibleColumn === "criticRating" ? "first-visible-cell" : ""} ${sortField === "criticRating" ? "sorted" : ""}`}
              >
                <span>{t("table.criticRating")}</span>
                <span className="sort-indicator">{getSortIcon("criticRating")}</span>
              </th>
            )}
            {columnVisibility.ageRating && (
              <th
                onClick={() => onSort("ageRating")}
                className={`age-rating-cell has-border-right ${firstVisibleColumn === "ageRating" ? "first-visible-cell" : ""} ${sortField === "ageRating" ? "sorted" : ""}`}
              >
                <span>{t("table.ageRating")}</span>
                <span className="sort-indicator">{getSortIcon("ageRating")}</span>
              </th>
            )}
            <th className="games-table-edit-header"></th>
          </tr>
        </thead>
      </table>
    </div>
  );
}

