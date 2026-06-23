import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDevelopers } from "../../contexts/DevelopersContext";
import { usePublishers } from "../../contexts/PublishersContext";
import type { CollectionItem } from "../../types";
import type { IgdbCompanyInfoFormState } from "../../utils/editIgdbCompanyInfo";
import { IGDB_COMPANY_STATUS_KEYS } from "../../utils/editIgdbCompanyInfo";
import { IGDB_COMPANY_SIZE_IDS, listIgdbCountryOptions } from "../../utils/igdbCompany";
import EditYearMonthDayFields from "../common/EditYearMonthDayFields";
import CompanySearchModal from "./CompanySearchModal";

type EditCompanyIgdbInfoFieldsProps = {
  value: IgdbCompanyInfoFormState;
  onChange: (next: IgdbCompanyInfoFormState) => void;
  disabled?: boolean;
  currentCompanyId?: string;
};

type LinkedCompanyFieldKey = "formerly" | "parentCompany" | "updatedTo";

const LINKED_COMPANY_FIELDS: Array<{
  key: LinkedCompanyFieldKey;
  idField: "formerlyId" | "parentCompanyId" | "updatedToId";
  nameField: "formerlyName" | "parentCompanyName" | "updatedToName";
  legendKey: string;
  legendDefault: string;
  addKey: string;
  addDefault: string;
}> = [
  {
    key: "formerly",
    idField: "formerlyId",
    nameField: "formerlyName",
    legendKey: "igdbInfo.formerly",
    legendDefault: "Formerly",
    addKey: "igdbInfo.addFormerly",
    addDefault: "Add company",
  },
  {
    key: "parentCompany",
    idField: "parentCompanyId",
    nameField: "parentCompanyName",
    legendKey: "igdbInfo.parentCompany",
    legendDefault: "Parent company",
    addKey: "igdbInfo.addParentCompany",
    addDefault: "Add company",
  },
  {
    key: "updatedTo",
    idField: "updatedToId",
    nameField: "updatedToName",
    legendKey: "igdbInfo.updatedTo",
    legendDefault: "Updated to",
    addKey: "igdbInfo.addUpdatedTo",
    addDefault: "Add company",
  },
];

function updateField<K extends keyof IgdbCompanyInfoFormState>(
  value: IgdbCompanyInfoFormState,
  onChange: (next: IgdbCompanyInfoFormState) => void,
  key: K,
  fieldValue: IgdbCompanyInfoFormState[K]
) {
  onChange({ ...value, [key]: fieldValue });
}

function resolveLinkedCompanyName(
  idValue: string,
  nameValue: string,
  developers: CollectionItem[],
  publishers: CollectionItem[]
): string {
  const id = idValue.trim();
  if (id) {
    const local =
      developers.find((company) => String(company.id) === id) ||
      publishers.find((company) => String(company.id) === id);
    if (local?.title) return local.title;
  }
  return nameValue.trim();
}

export default function EditCompanyIgdbInfoFields({
  value,
  onChange,
  disabled = false,
  currentCompanyId,
}: EditCompanyIgdbInfoFieldsProps) {
  const { t, i18n } = useTranslation();
  const { developers } = useDevelopers();
  const { publishers } = usePublishers();
  const [openLinkedField, setOpenLinkedField] = useState<LinkedCompanyFieldKey | null>(null);

  const countryOptions = useMemo(
    () => listIgdbCountryOptions(i18n.language),
    [i18n.language]
  );

  const excludeCompanyIds = useMemo(
    () => (currentCompanyId ? [String(currentCompanyId)] : []),
    [currentCompanyId]
  );

  const handleSelectLinkedCompany = (field: (typeof LINKED_COMPANY_FIELDS)[number], company: CollectionItem) => {
    onChange({
      ...value,
      [field.idField]: String(company.id),
      [field.nameField]: company.title,
    });
    setOpenLinkedField(null);
  };

  const handleClearLinkedCompany = (field: (typeof LINKED_COMPANY_FIELDS)[number]) => {
    onChange({
      ...value,
      [field.idField]: "",
      [field.nameField]: "",
    });
  };

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

      {LINKED_COMPANY_FIELDS.map((field) => {
        const idValue = value[field.idField];
        const nameValue = value[field.nameField];
        const hasSelection = Boolean(idValue.trim() || nameValue.trim());
        const displayName = resolveLinkedCompanyName(idValue, nameValue, developers, publishers);

        return (
          <fieldset key={field.key} className="edit-game-modal-field">
            <legend className="edit-game-modal-label">{t(field.legendKey, field.legendDefault)}</legend>
            {hasSelection ? (
              <div className="edit-game-modal-alt-names-row">
                <span className="edit-game-modal-similar-name">{displayName}</span>
                <button
                  type="button"
                  className="edit-game-modal-alt-names-remove"
                  onClick={() => handleClearLinkedCompany(field)}
                  disabled={disabled}
                  aria-label={t("common.remove", "Remove")}
                  title={t("common.remove", "Remove")}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="edit-game-modal-alt-names-row edit-game-modal-alt-names-add">
                <button
                  type="button"
                  className="edit-game-modal-add-btn"
                  onClick={() => setOpenLinkedField(field.key)}
                  disabled={disabled}
                >
                  {t(field.addKey, field.addDefault)}
                </button>
              </div>
            )}
          </fieldset>
        );
      })}

      <CompanySearchModal
        isOpen={openLinkedField != null}
        onClose={() => setOpenLinkedField(null)}
        onSelectCompany={(company) => {
          const field = LINKED_COMPANY_FIELDS.find((entry) => entry.key === openLinkedField);
          if (field) handleSelectLinkedCompany(field, company);
        }}
        excludeCompanyIds={excludeCompanyIds}
        title={t("igdbInfo.searchCompanyToAdd", "Search for a company to add")}
      />
    </>
  );
}
