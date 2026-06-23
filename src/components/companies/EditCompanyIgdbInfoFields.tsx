import { useTranslation } from "react-i18next";
import type { IgdbCompanyInfoFormState } from "../../utils/editIgdbCompanyInfo";
import {
  IGDB_COMPANY_STATUS_KEYS,
} from "../../utils/editIgdbCompanyInfo";
import { IGDB_COMPANY_SIZE_IDS, formatIgdbCountryCode } from "../../utils/igdbCompany";

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

export default function EditCompanyIgdbInfoFields({
  value,
  onChange,
  disabled = false,
}: EditCompanyIgdbInfoFieldsProps) {
  const { t, i18n } = useTranslation();
  const countryPreview = formatIgdbCountryCode(
    value.countryCode.trim() ? Number(value.countryCode) : undefined,
    i18n.language
  );

  return (
    <div className="edit-collection-modal-igdb-fields">
      <h3 className="edit-collection-modal-subsection-title">
        {t("igdbInfo.companyMetadata", "Company metadata")}
      </h3>

      <div className="edit-collection-modal-field">
        <label htmlFor="edit-company-igdb-status">{t("igdbInfo.companyStatus", "Status")}</label>
        <select
          id="edit-company-igdb-status"
          value={value.status}
          onChange={(e) => updateField(value, onChange, "status", e.target.value)}
          disabled={disabled}
        >
          <option value="">—</option>
          {IGDB_COMPANY_STATUS_KEYS.map((statusKey) => (
            <option key={statusKey} value={statusKey}>
              {t(`igdbCompanyStatuses.${statusKey}`, statusKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="edit-collection-modal-field">
        <label htmlFor="edit-company-igdb-country-code">{t("igdbInfo.country", "Country")}</label>
        <input
          id="edit-company-igdb-country-code"
          type="number"
          min={1}
          value={value.countryCode}
          onChange={(e) => updateField(value, onChange, "countryCode", e.target.value)}
          disabled={disabled}
          placeholder={t("igdbInfo.countryCodePlaceholder", "ISO 3166-1 numeric code (e.g. 380)")}
        />
        {countryPreview ? (
          <p className="edit-game-modal-external-url-hint">{countryPreview}</p>
        ) : null}
      </div>

      <div className="edit-collection-modal-field-row">
        <div className="edit-collection-modal-field">
          <label htmlFor="edit-company-igdb-started">{t("igdbInfo.started", "Started")}</label>
          <input
            id="edit-company-igdb-started"
            type="text"
            value={value.started}
            onChange={(e) => updateField(value, onChange, "started", e.target.value)}
            disabled={disabled}
            placeholder={t("igdbInfo.datePlaceholder", "YYYY, YYYY-MM, or YYYY-MM-DD")}
          />
        </div>
        <div className="edit-collection-modal-field">
          <label htmlFor="edit-company-igdb-changed-on">{t("igdbInfo.changedOn", "Changed on")}</label>
          <input
            id="edit-company-igdb-changed-on"
            type="text"
            value={value.changedOn}
            onChange={(e) => updateField(value, onChange, "changedOn", e.target.value)}
            disabled={disabled}
            placeholder={t("igdbInfo.datePlaceholder", "YYYY, YYYY-MM, or YYYY-MM-DD")}
          />
        </div>
      </div>

      <div className="edit-collection-modal-field">
        <label htmlFor="edit-company-igdb-known-as">{t("igdbInfo.knownAs", "Known as")}</label>
        <input
          id="edit-company-igdb-known-as"
          type="text"
          value={value.knownAs}
          onChange={(e) => updateField(value, onChange, "knownAs", e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="edit-collection-modal-field">
        <label htmlFor="edit-company-igdb-legal-name">{t("igdbInfo.legalName", "Legal name")}</label>
        <input
          id="edit-company-igdb-legal-name"
          type="text"
          value={value.legalName}
          onChange={(e) => updateField(value, onChange, "legalName", e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="edit-collection-modal-field">
        <label htmlFor="edit-company-igdb-company-size">{t("igdbInfo.companySize", "Company size")}</label>
        <select
          id="edit-company-igdb-company-size"
          value={value.companySizeId}
          onChange={(e) => updateField(value, onChange, "companySizeId", e.target.value)}
          disabled={disabled}
        >
          <option value="">—</option>
          {IGDB_COMPANY_SIZE_IDS.map((sizeId) => (
            <option key={sizeId} value={String(sizeId)}>
              {t(`igdbCompanySizes.${sizeId}`, String(sizeId))}
            </option>
          ))}
        </select>
      </div>

      <div className="edit-collection-modal-field">
        <label>{t("igdbInfo.formerly", "Formerly")}</label>
        <div className="edit-collection-modal-field-row">
          <input
            id="edit-company-igdb-formerly-id"
            type="number"
            value={value.formerlyId}
            onChange={(e) => updateField(value, onChange, "formerlyId", e.target.value)}
            disabled={disabled}
            placeholder={t("igdbInfo.companyIdPlaceholder", "IGDB ID")}
            aria-label={t("igdbInfo.formerly", "Formerly")}
          />
          <input
            id="edit-company-igdb-formerly-name"
            type="text"
            value={value.formerlyName}
            onChange={(e) => updateField(value, onChange, "formerlyName", e.target.value)}
            disabled={disabled}
            placeholder={t("igdbInfo.companyNamePlaceholder", "Company name")}
            aria-label={t("igdbInfo.formerly", "Formerly")}
          />
        </div>
      </div>

      <div className="edit-collection-modal-field">
        <label>{t("igdbInfo.parentCompany", "Parent company")}</label>
        <div className="edit-collection-modal-field-row">
          <input
            id="edit-company-igdb-parent-id"
            type="number"
            value={value.parentCompanyId}
            onChange={(e) => updateField(value, onChange, "parentCompanyId", e.target.value)}
            disabled={disabled}
            placeholder={t("igdbInfo.companyIdPlaceholder", "IGDB ID")}
            aria-label={t("igdbInfo.parentCompany", "Parent company")}
          />
          <input
            id="edit-company-igdb-parent-name"
            type="text"
            value={value.parentCompanyName}
            onChange={(e) => updateField(value, onChange, "parentCompanyName", e.target.value)}
            disabled={disabled}
            placeholder={t("igdbInfo.companyNamePlaceholder", "Company name")}
            aria-label={t("igdbInfo.parentCompany", "Parent company")}
          />
        </div>
      </div>

      <div className="edit-collection-modal-field">
        <label>{t("igdbInfo.updatedTo", "Updated to")}</label>
        <div className="edit-collection-modal-field-row">
          <input
            id="edit-company-igdb-updated-to-id"
            type="number"
            value={value.updatedToId}
            onChange={(e) => updateField(value, onChange, "updatedToId", e.target.value)}
            disabled={disabled}
            placeholder={t("igdbInfo.companyIdPlaceholder", "IGDB ID")}
            aria-label={t("igdbInfo.updatedTo", "Updated to")}
          />
          <input
            id="edit-company-igdb-updated-to-name"
            type="text"
            value={value.updatedToName}
            onChange={(e) => updateField(value, onChange, "updatedToName", e.target.value)}
            disabled={disabled}
            placeholder={t("igdbInfo.companyNamePlaceholder", "Company name")}
            aria-label={t("igdbInfo.updatedTo", "Updated to")}
          />
        </div>
      </div>
    </div>
  );
}
