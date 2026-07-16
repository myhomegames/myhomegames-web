import { useState, useMemo, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useDevelopers } from "../../contexts/DevelopersContext";
import { usePublishers } from "../../contexts/PublishersContext";
import SearchResultsList from "../search/SearchResultsList";
import type { CollectionItem } from "../../types";

type CompanySearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompany: (company: CollectionItem) => void;
  excludeCompanyIds?: string[];
  title?: string;
};

export default function CompanySearchModal({
  isOpen,
  onClose,
  onSelectCompany,
  excludeCompanyIds = [],
  title,
}: CompanySearchModalProps) {
  const searchInputId = useId();
  const { t } = useTranslation();
  const { developers } = useDevelopers();
  const { publishers } = usePublishers();
  const [searchQuery, setSearchQuery] = useState("");
  const excludeSet = useMemo(() => new Set(excludeCompanyIds.map(String)), [excludeCompanyIds]);

  const filteredDevelopers = useMemo(() => {
    const base = developers.filter((item) => !excludeSet.has(String(item.id)));
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter((item) => item.title.toLowerCase().includes(q));
  }, [developers, excludeSet, searchQuery]);

  const filteredPublishers = useMemo(() => {
    const base = publishers.filter((item) => !excludeSet.has(String(item.id)));
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter((item) => item.title.toLowerCase().includes(q));
  }, [publishers, excludeSet, searchQuery]);

  useEffect(() => {
    if (isOpen) setSearchQuery("");
  }, [isOpen]);

  const handleSelect = (company: CollectionItem) => {
    onSelectCompany(company);
    onClose();
  };

  if (!isOpen) return null;

  const hasResults = filteredDevelopers.length > 0 || filteredPublishers.length > 0;

  return createPortal(
    <div className="game-search-modal-overlay" onClick={onClose}>
      <div className="game-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="game-search-modal-header">
          <h2>{title ?? t("catalogInfo.searchCompanyToAdd", "Search for a company to add")}</h2>
          <button
            type="button"
            className="game-search-modal-close"
            onClick={onClose}
            aria-label={t("common.close", "Close")}
          >
            ×
          </button>
        </div>
        <div className="game-search-modal-search">
          <label htmlFor={searchInputId} className="game-search-modal-sr-only">
            {t("catalogInfo.searchCompanyPlaceholder", "Search by name...")}
          </label>
          <input
            id={searchInputId}
            name="companySearchModalQuery"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("catalogInfo.searchCompanyPlaceholder", "Search by name...")}
            autoComplete="off"
            autoFocus
          />
        </div>
        <div className="game-search-modal-list">
          {!hasResults ? (
            <div className="game-search-modal-empty">
              {t("catalogInfo.noCompaniesFound", "No companies found")}
            </div>
          ) : (
            <SearchResultsList
              games={[]}
              collections={[]}
              developers={filteredDevelopers}
              publishers={filteredPublishers}
              onGameClick={() => {}}
              onDeveloperClick={handleSelect}
              onPublisherClick={handleSelect}
              variant="popup"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
