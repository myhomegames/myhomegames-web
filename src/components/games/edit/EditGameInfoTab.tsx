import { useState } from "react";
import type { TFunction } from "i18next";

type EditGameInfoTabProps = {
  t: TFunction;
  title: string;
  summary: string;
  year: string;
  month: string;
  day: string;
  alternativeNames: string[];
  onAlternativeNamesChange: (names: string[]) => void;
  websites: Array<{ url: string; category?: number }>;
  onWebsitesChange: (websites: Array<{ url: string; category?: number }>) => void;
  saving: boolean;
  setTitle: (value: string) => void;
  setSummary: (value: string) => void;
  setYear: (value: string) => void;
  setMonth: (value: string) => void;
  setDay: (value: string) => void;
};

export default function EditGameInfoTab({
  t,
  title,
  summary,
  year,
  month,
  day,
  alternativeNames,
  onAlternativeNamesChange,
  websites,
  onWebsitesChange,
  saving,
  setTitle,
  setSummary,
  setYear,
  setMonth,
  setDay,
}: EditGameInfoTabProps) {
  const [newAlternativeName, setNewAlternativeName] = useState("");
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");

  const handleAlternativeNameChange = (index: number, value: string) => {
    const next = [...alternativeNames];
    next[index] = value;
    onAlternativeNamesChange(next);
  };

  const handleRemoveAlternativeName = (index: number) => {
    onAlternativeNamesChange(alternativeNames.filter((_, i) => i !== index));
  };

  const handleAddAlternativeName = () => {
    const trimmed = newAlternativeName.trim();
    if (!trimmed) return;
    onAlternativeNamesChange([...alternativeNames, trimmed]);
    setNewAlternativeName("");
  };

  const handleWebsiteUrlChange = (index: number, url: string) => {
    const next = [...websites];
    next[index] = { ...next[index], url };
    onWebsitesChange(next);
  };

  const handleRemoveWebsite = (index: number) => {
    onWebsitesChange(websites.filter((_, i) => i !== index));
  };

  const handleAddWebsite = () => {
    const trimmed = newWebsiteUrl.trim();
    if (!trimmed) return;
    onWebsitesChange([...websites, { url: trimmed }]);
    setNewWebsiteUrl("");
  };

  return (
    <>
      <div className="edit-game-modal-field">
        <label htmlFor="edit-game-title">{t("gameDetail.title", "Title")}</label>
        <input
          id="edit-game-title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving}
        />
      </div>

      <div className="edit-game-modal-field">
        <label htmlFor="edit-game-summary">{t("gameDetail.summary", "Summary")}</label>
        <textarea
          id="edit-game-summary"
          name="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={saving}
          rows={5}
        />
      </div>

      <div className="edit-game-modal-row">
        <div className="edit-game-modal-field">
          <label htmlFor="edit-game-year">{t("gameDetail.year", "Year")}</label>
          <input
            id="edit-game-year"
            name="year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={saving}
            placeholder="YYYY"
          />
        </div>

        <div className="edit-game-modal-field">
          <label htmlFor="edit-game-month">{t("gameDetail.month", "Month")}</label>
          <input
            id="edit-game-month"
            name="month"
            type="number"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={saving}
            placeholder="MM"
            min="1"
            max="12"
          />
        </div>

        <div className="edit-game-modal-field">
          <label htmlFor="edit-game-day">{t("gameDetail.day", "Day")}</label>
          <input
            id="edit-game-day"
            name="day"
            type="number"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            disabled={saving}
            placeholder="DD"
            min="1"
            max="31"
          />
        </div>
      </div>

      <div className="edit-game-modal-field">
        <label className="edit-game-modal-label">
          {t("gameDetail.alternativeNames", "Nomi alternativi")}
        </label>
        {alternativeNames.map((name, index) => (
          <div key={`alt-${index}`} className="edit-game-modal-alt-names-row">
            <input
              type="text"
              value={name}
              onChange={(e) => handleAlternativeNameChange(index, e.target.value)}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v) handleRemoveAlternativeName(index);
                else if (v !== name) handleAlternativeNameChange(index, v);
              }}
              disabled={saving}
              placeholder={t("gameDetail.alternativeNamePlaceholder", "Nome alternativo")}
              className="edit-game-modal-alt-names-input"
            />
            <button
              type="button"
              className="edit-game-modal-alt-names-remove"
              onClick={() => handleRemoveAlternativeName(index)}
              disabled={saving}
              aria-label={t("common.remove", "Rimuovi")}
              title={t("common.remove", "Rimuovi")}
            />
          </div>
        ))}
        <div className="edit-game-modal-alt-names-row edit-game-modal-alt-names-add">
          <input
            type="text"
            value={newAlternativeName}
            onChange={(e) => setNewAlternativeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAlternativeName())}
            disabled={saving}
            placeholder={t("gameDetail.addAlternativeName", "Aggiungi nome alternativo...")}
            className="edit-game-modal-alt-names-input"
          />
          <button
            type="button"
            className="edit-game-modal-add-btn"
            onClick={handleAddAlternativeName}
            disabled={saving || !newAlternativeName.trim()}
          >
            {t("gameDetail.add", "Aggiungi")}
          </button>
        </div>
      </div>

      <div className="edit-game-modal-field">
        <label className="edit-game-modal-label">
          {t("gameDetail.websites", "Siti web")}
        </label>
        {websites.map((website, index) => (
          <div key={`web-${index}`} className="edit-game-modal-alt-names-row">
            <input
              type="url"
              value={website.url}
              onChange={(e) => handleWebsiteUrlChange(index, e.target.value)}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v) handleRemoveWebsite(index);
                else if (v !== website.url) handleWebsiteUrlChange(index, v);
              }}
              disabled={saving}
              placeholder="https://..."
              className="edit-game-modal-alt-names-input"
            />
            <button
              type="button"
              className="edit-game-modal-alt-names-remove"
              onClick={() => handleRemoveWebsite(index)}
              disabled={saving}
              aria-label={t("common.remove", "Rimuovi")}
              title={t("common.remove", "Rimuovi")}
            />
          </div>
        ))}
        <div className="edit-game-modal-alt-names-row edit-game-modal-alt-names-add">
          <input
            type="url"
            value={newWebsiteUrl}
            onChange={(e) => setNewWebsiteUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddWebsite())}
            disabled={saving}
            placeholder={t("gameDetail.addWebsiteUrl", "Add website URL...")}
            className="edit-game-modal-alt-names-input"
          />
          <button
            type="button"
            className="edit-game-modal-add-btn"
            onClick={handleAddWebsite}
            disabled={saving || !newWebsiteUrl.trim()}
          >
            {t("gameDetail.add", "Aggiungi")}
          </button>
        </div>
      </div>
    </>
  );
}
