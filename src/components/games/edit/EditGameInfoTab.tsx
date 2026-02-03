import type { TFunction } from "i18next";

type EditGameInfoTabProps = {
  t: TFunction;
  title: string;
  summary: string;
  year: string;
  month: string;
  day: string;
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
  saving,
  setTitle,
  setSummary,
  setYear,
  setMonth,
  setDay,
}: EditGameInfoTabProps) {
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
    </>
  );
}
