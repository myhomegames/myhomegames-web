import { useTranslation } from "react-i18next";

type EditYearMonthDayFieldsProps = {
  idPrefix: string;
  year: string;
  month: string;
  day: string;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onDayChange: (value: string) => void;
  disabled?: boolean;
};

export default function EditYearMonthDayFields({
  idPrefix,
  year,
  month,
  day,
  onYearChange,
  onMonthChange,
  onDayChange,
  disabled = false,
}: EditYearMonthDayFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="edit-game-modal-row">
      <div className="edit-game-modal-field">
        <label htmlFor={`${idPrefix}-year`}>{t("gameDetail.year", "Year")}</label>
        <input
          id={`${idPrefix}-year`}
          name={`${idPrefix}-year`}
          type="number"
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          disabled={disabled}
          placeholder="YYYY"
        />
      </div>

      <div className="edit-game-modal-field">
        <label htmlFor={`${idPrefix}-month`}>{t("gameDetail.month", "Month")}</label>
        <input
          id={`${idPrefix}-month`}
          name={`${idPrefix}-month`}
          type="number"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          disabled={disabled}
          placeholder="MM"
          min={1}
          max={12}
        />
      </div>

      <div className="edit-game-modal-field">
        <label htmlFor={`${idPrefix}-day`}>{t("gameDetail.day", "Day")}</label>
        <input
          id={`${idPrefix}-day`}
          name={`${idPrefix}-day`}
          type="number"
          value={day}
          onChange={(e) => onDayChange(e.target.value)}
          disabled={disabled}
          placeholder="DD"
          min={1}
          max={31}
        />
      </div>
    </div>
  );
}
