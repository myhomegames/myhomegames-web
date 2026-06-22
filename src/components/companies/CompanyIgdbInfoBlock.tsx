import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useDevelopers } from "../../contexts/DevelopersContext";
import { usePublishers } from "../../contexts/PublishersContext";
import type { IgdbCompanyInfo } from "../../types";
import { formatIgdbStoredDate } from "../../utils/date";
import { formatIgdbCompanySize, formatIgdbCountryCode } from "../../utils/igdbCompany";

type CompanyIgdbStatusBadgeProps = {
  status?: string | null;
};

export function CompanyIgdbStatusBadge({ status }: CompanyIgdbStatusBadgeProps) {
  const { t } = useTranslation();
  const statusKey = status?.trim().toLowerCase() ?? "";
  if (!statusKey) return null;

  return (
    <span className="igdb-company-status-badge" data-status={statusKey}>
      {t(`igdbCompanyStatuses.${statusKey}`, status ?? statusKey)}
    </span>
  );
}

type CompanyIgdbInfoBlockProps = {
  info: IgdbCompanyInfo;
  resourceType: "developers" | "publishers";
};

export default function CompanyIgdbInfoBlock({ info, resourceType }: CompanyIgdbInfoBlockProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { developers } = useDevelopers();
  const { publishers } = usePublishers();

  const routeBase = resourceType === "developers" ? "/developers" : "/publishers";
  const localCompanies = resourceType === "developers" ? developers : publishers;

  const isLocalCompany = (id: number | undefined | null) =>
    id != null && localCompanies.some((company) => String(company.id) === String(id));

  const renderCompanyName = (company: { id?: number; name: string }) => {
    if (company.id != null && isLocalCompany(company.id)) {
      return (
        <button
          type="button"
          className="game-info-list-link library-item-detail-company-link"
          onClick={() => navigate(`${routeBase}/${company.id}`)}
        >
          {company.name}
        </button>
      );
    }
    return company.name;
  };

  const metaParts: Array<{ key: string; node: ReactNode }> = [];

  if (info.countryCode != null) {
    const countryLabel = formatIgdbCountryCode(info.countryCode, i18n.language);
    if (countryLabel) {
      metaParts.push({ key: "country", node: countryLabel });
    }
  }
  if (info.started || info.changedOn) {
    metaParts.push({
      key: "dates",
      node: (
        <>
          {info.started ? (
            <>
              {t("igdbInfo.started", "Started")} {formatIgdbStoredDate(info.started, t, i18n)}
            </>
          ) : null}
          {info.started && info.changedOn ? " " : null}
          {info.changedOn ? (
            <>
              {t("igdbInfo.changedOn", "Changed on")}{" "}
              {formatIgdbStoredDate(info.changedOn, t, i18n)}
            </>
          ) : null}
        </>
      ),
    });
  }
  if (info.knownAs) {
    metaParts.push({
      key: "knownAs",
      node: (
        <>
          {t("igdbInfo.knownAs", "Known as")}: {info.knownAs}
        </>
      ),
    });
  }
  if (info.legalName) {
    metaParts.push({
      key: "legalName",
      node: (
        <>
          {t("igdbInfo.legalName", "Legal name")}: {info.legalName}
        </>
      ),
    });
  }
  if (info.companySizeId != null) {
    const companySizeLabel = formatIgdbCompanySize(info.companySizeId, t);
    if (companySizeLabel) {
      metaParts.push({
        key: "companySize",
        node: (
          <>
            {t("igdbInfo.companySize", "Company size")}: {companySizeLabel}
          </>
        ),
      });
    }
  }
  if (info.formerly) {
    const formerly =
      typeof info.formerly === "string" ? { name: info.formerly } : info.formerly;
    metaParts.push({
      key: "formerly",
      node: (
        <>
          {t("igdbInfo.formerly", "Formerly")}: {renderCompanyName(formerly)}
        </>
      ),
    });
  }
  if (info.parentCompany) {
    metaParts.push({
      key: "parentCompany",
      node: (
        <>
          {t("igdbInfo.parentCompany", "Parent company")}: {renderCompanyName(info.parentCompany)}
        </>
      ),
    });
  }
  if (info.updatedTo) {
    metaParts.push({
      key: "updatedTo",
      node: (
        <>
          {t("igdbInfo.updatedTo", "Updated to")}: {renderCompanyName(info.updatedTo)}
        </>
      ),
    });
  }

  if (metaParts.length === 0) {
    return null;
  }

  return (
    <div className="library-item-detail-company-meta text-white">
      {metaParts.map((part, index) => (
        <Fragment key={part.key}>
          {index > 0 ? <span className="library-item-detail-meta-separator"> · </span> : null}
          <span>{part.node}</span>
        </Fragment>
      ))}
    </div>
  );
}
