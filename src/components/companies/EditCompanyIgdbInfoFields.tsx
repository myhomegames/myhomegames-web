import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { IgdbCompanyInfoFormState } from "../../utils/editIgdbCompanyInfo";
import { IGDB_COMPANY_STATUS_KEYS } from "../../utils/editIgdbCompanyInfo";
import { IGDB_COMPANY_SIZE_IDS, listIgdbCountryOptions } from "../../utils/igdbCompany";
import EditYearMonthDayFields from "../common/EditYearMonthDayFields";

type EditCompanyIgdbInfoFieldsProps = {
  value: IgdbCompanyInfoFormState;
  onChange: (next: IgdbCompanyInfoFormState) => void;
  disabled?: boolean;
};

function updateField<K extends keyof IgdbCompanyInfoFormState>(
  value: IgdbCompanyInfoFormState,
  onChange: (next: IgdbCompanyInfoFormState) => void,
  key: K,
  fieldValue: IgdbCompanyInfoFormState[K]
) {
  onChange({ ...value, [key]: fieldValue });
}

type CompanyReferenceFieldProps = {
  legendKey: string;
  legendDefault: string;
  idPrefix: string;
  idValue: string;
  nameValue: string;
  onIdChange: (value: string) => void;
  onNameChange: (value: string) => void;
  disabled?: boolean;
};

function CompanyReferenceField({
  legendKey,
  legendDefault,
  idPrefix,
  idValue,
  nameValue,
  onIdChange,
  onNameChange,
  disabled = false,
}: CompanyReferenceFieldProps) {
  const { t } = useTranslation();

  return (
    <fieldset className="edit-game-modal-field">
      <legend className="edit-game-modal-label">{t(legendKey, legendDefault)}</legend>
      <div className="edit-game-modal-row">
        <div className="edit-game-modal-field">
          <label htmlFor={`${idPrefix}-id`}>{t("igdbInfo.companyIdPlaceholder", "IGDB ID")}</label>
          <input
            id={`${idPrefix}-id`}
            type="number"
            value={idValue}
            onChange={(e) => onIdChange(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="edit-game-modal-field">
          <label htmlFor={`${idPrefix}-name`}>{t("igdbInfo.companyNamePlaceholder", "Company name")}</label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            value={nameValue}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </fieldset>
  );
}

export default function EditCompanyIgdbInfoFields({
  value,
  onChange,
  disabled = false,
}: EditCompanyIgdbInfoFieldsProps) {
  const { t, i18n } = useTranslation();
  const countryOptions = useMemo(
    () => listIgdbCountryOptions(i18n.language),
    [i18n.language]
  );

  return (
    <>
      <div className="edit-game-modal-field">
        <label htmlFor="edit-company-igdb-status">{t("igdbInfo.companyStatus", "Status")}</label>
        <select
          id="edit-company-igdb-status"
          value={value.status}
          onChange={(e) => updateField(value, onChange, "status", e.target.value)}
          disabled={disabled}
        >
          <option value="">{t("gameDetail.gameTypeNotSet", "Not set")}</option>
          {IGDB_COMPANY_STATUS_KEYS.map((statusKey) => (
            <option key={statusKey} value={statusKey}>
              {t(`igdbCompanyStatuses.${statusKey}`, statusKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="edit-game-modal-field">
        <label htmlFor="edit-company-igdb-country-code">{t("igdbInfo.country", "Country")}</label>
        <select
          id="edit-company-igdb-country-code"
          value={value.countryCode}
          onChange={(e) => updateField(value, onChange, "countryCode", e.target.value)}
          disabled={disabled}
        >
          <option value="">{t("gameDetail.gameTypeNotSet", "Not set")}</option>
          {countryOptions.map((country) => (
            <option key={country.code} value={String(country.code)}>
              {country.label}
            </option>
          ))}
        </select>
      </div>

      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("igdbInfo.started", "Started")}</div>
        <EditYearMonthDayFields
          idPrefix="edit-company-igdb-started"
          year={value.startedYear}
          month={value.startedMonth}
          day={value.startedDay}
          onYearChange={(startedYear) => updateField(value, onChange, "startedYear", startedYear)}
          onMonthChange={(startedMonth) => updateField(value, onChange, "startedMonth", startedMonth)}
          onDayChange={(startedDay) => updateField(value, onChange, "startedDay", startedDay)}
          disabled={disabled}
        />
      </div>

      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("igdbInfo.changedOn", "Changed on")}</div>
        <EditYearMonthDayFields
          idPrefix="edit-company-igdb-changed-on"
          year={value.changedOnYear}
          month={value.changedOnMonth}
          day={value.changedOnDay}
          onYearChange={(changedOnYear) => updateField(value, onChange, "changedOnYear", changedOnYear)}
          onMonthChange={(changedOnMonth) =>
            updateField(value, onChange, "changedOnMonth", changedOnMonth)
          }
          onDayChange={(changedOnDay) => updateField(value, onChange, "changedOnDay", changedOnDay)}
          disabled={disabled}
        />
      </div>

      <div className="edit-game-modal-field">
        <label htmlFor="edit-company-igdb-known-as">{t("igdbInfo.knownAs", "Known as")}</label>
        <input
          id="edit-company-igdb-known-as"
          type="text"
          value={value.knownAs}
          onChange={(e) => updateField(value, onChange, "knownAs", e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="edit-game-modal-field">
        <label htmlFor="edit-company-igdb-legal-name">{t("igdbInfo.legalName", "Legal name")}</label>
        <input
          id="edit-company-igdb-legal-name"
          type="text"
          value={value.legalName}
          onChange={(e) => updateField(value, onChange, "legalName", e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="edit-game-modal-field">
        <label htmlFor="edit-company-igdb-company-size">{t("igdbInfo.companySize", "Company size")}</label>
        <select
          id="edit-company-igdb-company-size"
          value={value.companySizeId}
          onChange={(e) => updateField(value, onChange, "companySizeId", e.target.value)}
          disabled={disabled}
        >
          <option value="">{t("gameDetail.gameTypeNotSet", "Not set")}</option>
          {IGDB_COMPANY_SIZE_IDS.map((sizeId) => (
            <option key={sizeId} value={String(sizeId)}>
              {t(`igdbCompanySizes.${sizeId}`, String(sizeId))}
            </option>
          ))}
        </select>
      </div>

      <CompanyReferenceField
        legendKey="igdbInfo.formerly"
        legendDefault="Formerly"
        idPrefix="edit-company-igdb-formerly"
        idValue={value.formerlyId}
        nameValue={value.formerlyName}
        onIdChange={(formerlyId) => updateField(value, onChange, "formerlyId", formerlyId)}
        onNameChange={(formerlyName) => updateField(value, onChange, "formerlyName", formerlyName)}
        disabled={disabled}
      />

      <CompanyReferenceField
        legendKey="igdbInfo.parentCompany"
        legendDefault="Parent company"
        idPrefix="edit-company-igdb-parent"
        idValue={value.parentCompanyId}
        nameValue={value.parentCompanyName}
        onIdChange={(parentCompanyId) => updateField(value, onChange, "parentCompanyId", parentCompanyId)}
        onNameChange={(parentCompanyName) =>
          updateField(value, onChange, "parentCompanyName", parentCompanyName)
        }
        disabled={disabled}
      />

      <CompanyReferenceField
        legendKey="igdbInfo.updatedTo"
        legendDefault="Updated to"
        idPrefix="edit-company-igdb-updated-to"
        idValue={value.updatedToId}
        nameValue={value.updatedToName}
        onIdChange={(updatedToId) => updateField(value, onChange, "updatedToId", updatedToId)}
        onNameChange={(updatedToName) => updateField(value, onChange, "updatedToName", updatedToName)}
        disabled={disabled}
      />
    </>
  );
}
