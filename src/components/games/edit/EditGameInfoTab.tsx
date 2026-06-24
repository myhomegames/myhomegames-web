import { useState, useId } from "react";
import type { TFunction } from "i18next";
import GameSearchModal from "../GameSearchModal";
import type { GameItem } from "../../../types";
import { useResolvedSimilarGamesNames } from "../../../hooks/useResolvedSimilarGamesNames";
import {
  AGE_RATING_CATEGORIES,
  AGE_RATING_VALUES_BY_ORG,
  formatAgeRating,
} from "../AgeRatings";
import { displayGameType, GAME_TYPE_IDS } from "../../../utils/gameType";
import EditYearMonthDayFields from "../../common/EditYearMonthDayFields";

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
  gameType: number | null;
  onGameTypeChange: (value: number | null) => void;
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
  gameType,
  onGameTypeChange,
}: EditGameInfoTabProps) {
  const gameTypeSelectId = useId();
  const ageRatingCategoryId = useId();
  const ageRatingValueId = useId();
  const newAlternativeNameId = useId();
  const newWebsiteUrlId = useId();
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

      <div className="edit-game-modal-field">
        <label htmlFor={gameTypeSelectId}>{t("gameDetail.gameType", "Game type")}</label>
        <select
          id={gameTypeSelectId}
          name="gameType"
          value={gameType === null ? "" : String(gameType)}
          onChange={(e) => {
            const v = e.target.value;
            onGameTypeChange(v === "" ? null : parseInt(v, 10));
          }}
          disabled={saving}
        >
          <option value="">{t("gameDetail.gameTypeNotSet", "Not set")}</option>
          {GAME_TYPE_IDS.filter((id) => id !== 0).map((id) => (
            <option key={id} value={String(id)}>
              {displayGameType(id)}
            </option>
          ))}
        </select>
      </div>

      <EditYearMonthDayFields
        idPrefix="edit-game"
        year={year}
        month={month}
        day={day}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onDayChange={setDay}
        disabled={saving}
      />

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

      <fieldset className="edit-game-modal-field">
        <legend className="edit-game-modal-label">
          {t("gameDetail.ageRatings", "Classificazioni di età")}
        </legend>
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
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <div className="edit-game-modal-alt-names-row edit-game-modal-alt-names-add">
          <select
            id={ageRatingCategoryId}
            name="ageRatingCategory"
            value={newAgeRatingCategory}
            onChange={(e) => {
              setNewAgeRatingCategory(e.target.value);
              setNewAgeRatingValue("");
            }}
            disabled={saving}
            className="edit-game-modal-age-rating-select"
            aria-label={t("gameDetail.ageRatingOrganization", "Organismo classificazione")}
          >
            {Object.entries(AGE_RATING_CATEGORIES).map(([cat, name]) => (
              <option key={cat} value={cat}>
                {name}
              </option>
            ))}
          </select>
          <select
            id={ageRatingValueId}
            name="ageRatingValue"
            value={newAgeRatingValue}
            onChange={(e) => setNewAgeRatingValue(e.target.value)}
            disabled={saving}
            className="edit-game-modal-age-rating-select"
            aria-label={t("gameDetail.selectRating", "Seleziona classificazione...")}
          >
            <option value="">{t("gameDetail.selectRating", "Seleziona classificazione...")}</option>
            {AGE_RATING_VALUES_BY_ORG[parseInt(newAgeRatingCategory, 10)] &&
              Object.entries(AGE_RATING_VALUES_BY_ORG[parseInt(newAgeRatingCategory, 10)]).map(
                ([rat, name]) => (
                  <option key={rat} value={rat}>
                    {t(`catalogInfo.ageRating.${AGE_RATING_CATEGORIES[parseInt(newAgeRatingCategory, 10)]}.${name}`, name)}
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
      </fieldset>

      <fieldset className="edit-game-modal-field">
        <legend className="edit-game-modal-label">
          {t("gameDetail.alternativeNames", "Nomi alternativi")}
        </legend>
        {alternativeNames.map((name, index) => (
          <div key={`alt-${index}`} className="edit-game-modal-alt-names-row">
            <input
              id={`edit-game-alt-name-${index}`}
              name={`alternativeName-${index}`}
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
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <div className="edit-game-modal-alt-names-row edit-game-modal-alt-names-add">
          <input
            id={newAlternativeNameId}
            name="newAlternativeName"
            type="text"
            value={newAlternativeName}
            onChange={(e) => setNewAlternativeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAlternativeName())}
            disabled={saving}
            placeholder={t("gameDetail.addAlternativeName", "Aggiungi nome alternativo...")}
            className="edit-game-modal-alt-names-input"
            autoComplete="off"
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
      </fieldset>

      <fieldset className="edit-game-modal-field">
        <legend className="edit-game-modal-label">
          {t("gameDetail.websites", "Siti web")}
        </legend>
        {websites.map((website, index) => (
          <div key={`web-${index}`} className="edit-game-modal-alt-names-row">
            <input
              id={`edit-game-website-${index}`}
              name={`websiteUrl-${index}`}
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
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <div className="edit-game-modal-alt-names-row edit-game-modal-alt-names-add">
          <input
            id={newWebsiteUrlId}
            name="newWebsiteUrl"
            type="url"
            value={newWebsiteUrl}
            onChange={(e) => setNewWebsiteUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddWebsite())}
            disabled={saving}
            placeholder={t("gameDetail.addWebsiteUrl", "Add website URL...")}
            className="edit-game-modal-alt-names-input"
            autoComplete="url"
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
      </fieldset>

      <fieldset className="edit-game-modal-field">
        <legend className="edit-game-modal-label">
          {t("gameDetail.similarGames", "Giochi simili")}
        </legend>
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
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
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
      </fieldset>

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
