import { useState } from "react";
import type { TFunction } from "i18next";
import GameSearchModal from "../GameSearchModal";
import type { GameItem } from "../../../types";
import { useResolvedSimilarGamesNames } from "../../../hooks/useResolvedSimilarGamesNames";
import {
  AGE_RATING_CATEGORIES,
  AGE_RATING_VALUES_BY_ORG,
  formatAgeRating,
} from "../AgeRatings";

type AgeRatingEntry = { category: number; rating: number };

type EditGameInfoTabProps = {
  t: TFunction;
  title: string;
  summary: string;
  year: string;
  month: string;
  day: string;
  criticRating: string;
  userRating: string;
  onCriticRatingChange: (value: string) => void;
  onUserRatingChange: (value: string) => void;
  ageRatings: AgeRatingEntry[];
  onAgeRatingsChange: (ratings: AgeRatingEntry[]) => void;
  alternativeNames: string[];
  onAlternativeNamesChange: (names: string[]) => void;
  websites: Array<{ url: string; category?: number }>;
  onWebsitesChange: (websites: Array<{ url: string; category?: number }>) => void;
  currentGameId?: string;
  similarGames: Array<{ id: number; name: string }>;
  onSimilarGamesChange: (games: Array<{ id: number; name: string }>) => void;
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
  criticRating,
  userRating,
  onCriticRatingChange,
  onUserRatingChange,
  ageRatings,
  onAgeRatingsChange,
  alternativeNames,
  onAlternativeNamesChange,
  websites,
  onWebsitesChange,
  currentGameId,
  similarGames,
  onSimilarGamesChange,
  saving,
  setTitle,
  setSummary,
  setYear,
  setMonth,
  setDay,
}: EditGameInfoTabProps) {
  const [newAlternativeName, setNewAlternativeName] = useState("");
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [isGameSearchOpen, setIsGameSearchOpen] = useState(false);
  const [newAgeRatingCategory, setNewAgeRatingCategory] = useState<string>("1");
  const [newAgeRatingValue, setNewAgeRatingValue] = useState<string>("");

  const handleAddAgeRating = () => {
    const cat = parseInt(newAgeRatingCategory, 10);
    const rat = parseInt(newAgeRatingValue, 10);
    if (Number.isNaN(cat) || Number.isNaN(rat)) return;
    const values = AGE_RATING_VALUES_BY_ORG[cat];
    if (!values || !(rat in values)) return;
    if (ageRatings.some((ar) => ar.category === cat && ar.rating === rat)) return;
    onAgeRatingsChange([...ageRatings, { category: cat, rating: rat }]);
    setNewAgeRatingValue("");
  };

  const handleRemoveAgeRating = (index: number) => {
    onAgeRatingsChange(ageRatings.filter((_, i) => i !== index));
  };

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

  const handleAddSimilarGame = (game: GameItem) => {
    const id = Number(game.id);
    if (Number.isNaN(id)) return;
    if (similarGames.some((s) => s.id === id)) return;
    onSimilarGamesChange([...similarGames, { id, name: game.title }]);
  };

  const handleRemoveSimilarGame = (index: number) => {
    onSimilarGamesChange(similarGames.filter((_, i) => i !== index));
  };

  const excludeGameIds = [currentGameId, ...similarGames.map((s) => String(s.id))].filter(Boolean) as string[];

  const { similarGames: resolvedSimilarGames } = useResolvedSimilarGamesNames(similarGames);

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

      <div className="edit-game-modal-row">
        <div className="edit-game-modal-field">
          <label htmlFor="edit-game-critic-rating">{t("gameDetail.criticRating", "Critic Rating")}</label>
          <input
            id="edit-game-critic-rating"
            name="criticRating"
            type="number"
            min="0"
            max="100"
            step="1"
            value={criticRating}
            onChange={(e) => onCriticRatingChange(e.target.value)}
            disabled={saving}
            placeholder="0–100"
          />
        </div>

        <div className="edit-game-modal-field">
          <label htmlFor="edit-game-user-rating">{t("gameDetail.userRating", "User Rating")}</label>
          <input
            id="edit-game-user-rating"
            name="userRating"
            type="number"
            min="0"
            max="100"
            step="1"
            value={userRating}
            onChange={(e) => onUserRatingChange(e.target.value)}
            disabled={saving}
            placeholder="0–100"
          />
        </div>
      </div>

      <div className="edit-game-modal-field">
        <label className="edit-game-modal-label">
          {t("gameDetail.ageRatings", "Classificazioni di età")}
        </label>
        {ageRatings.map((ar, index) => (
          <div key={`age-${index}`} className="edit-game-modal-alt-names-row">
            <span className="edit-game-modal-similar-name">
              {formatAgeRating(ar.category, ar.rating, t)}
            </span>
            <button
              type="button"
              className="edit-game-modal-alt-names-remove"
              onClick={() => handleRemoveAgeRating(index)}
              disabled={saving}
              aria-label={t("common.remove", "Rimuovi")}
              title={t("common.remove", "Rimuovi")}
            />
          </div>
        ))}
        <div className="edit-game-modal-alt-names-row edit-game-modal-alt-names-add" style={{ gap: "8px", flexWrap: "wrap" }}>
          <select
            value={newAgeRatingCategory}
            onChange={(e) => {
              setNewAgeRatingCategory(e.target.value);
              setNewAgeRatingValue("");
            }}
            disabled={saving}
            className="edit-game-modal-age-rating-select"
          >
            {Object.entries(AGE_RATING_CATEGORIES).map(([cat, name]) => (
              <option key={cat} value={cat}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={newAgeRatingValue}
            onChange={(e) => setNewAgeRatingValue(e.target.value)}
            disabled={saving}
            className="edit-game-modal-age-rating-select"
          >
            <option value="">{t("gameDetail.selectRating", "Seleziona classificazione...")}</option>
            {AGE_RATING_VALUES_BY_ORG[parseInt(newAgeRatingCategory, 10)] &&
              Object.entries(AGE_RATING_VALUES_BY_ORG[parseInt(newAgeRatingCategory, 10)]).map(
                ([rat, name]) => (
                  <option key={rat} value={rat}>
                    {t(`igdbInfo.ageRating.${AGE_RATING_CATEGORIES[parseInt(newAgeRatingCategory, 10)]}.${name}`, name)}
                  </option>
                )
              )}
          </select>
          <button
            type="button"
            className="edit-game-modal-add-btn"
            onClick={handleAddAgeRating}
            disabled={saving || !newAgeRatingValue}
          >
            {t("gameDetail.add", "Aggiungi")}
          </button>
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

      <div className="edit-game-modal-field">
        <label className="edit-game-modal-label">
          {t("gameDetail.similarGames", "Giochi simili")}
        </label>
        {resolvedSimilarGames.map((sg, index) => (
          <div key={`similar-${sg.id}`} className="edit-game-modal-alt-names-row">
            <span className="edit-game-modal-similar-name">{sg.name}</span>
            <button
              type="button"
              className="edit-game-modal-alt-names-remove"
              onClick={() => handleRemoveSimilarGame(index)}
              disabled={saving}
              aria-label={t("common.remove", "Rimuovi")}
              title={t("common.remove", "Rimuovi")}
            />
          </div>
        ))}
        <div className="edit-game-modal-alt-names-row edit-game-modal-alt-names-add">
          <button
            type="button"
            className="edit-game-modal-add-btn"
            onClick={() => setIsGameSearchOpen(true)}
            disabled={saving}
          >
            {t("gameDetail.addSimilarGame", "Aggiungi gioco")}
          </button>
        </div>
      </div>

      <GameSearchModal
        isOpen={isGameSearchOpen}
        onClose={() => setIsGameSearchOpen(false)}
        onSelectGame={handleAddSimilarGame}
        excludeGameIds={excludeGameIds}
        title={t("gameDetail.searchGameToAdd", "Cerca un gioco da aggiungere")}
      />
    </>
  );
}
