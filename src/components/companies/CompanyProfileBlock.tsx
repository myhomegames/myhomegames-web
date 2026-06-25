import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useDevelopers } from "../../contexts/DevelopersContext";
import { usePublishers } from "../../contexts/PublishersContext";
import type { CompanyProfileFields } from "../../types";
import { formatStoredCatalogDate } from "../../utils/date";
import { formatCompanySize, formatCountryCode } from "../../utils/companyFormat";
import { normalizeCompanyStatusKey } from "../../utils/editCompanyProfile";

type CompanyStatusBadgeProps = {
  status?: string | null;
};

export function CompanyStatusBadge({ status }: CompanyStatusBadgeProps) {
  const { t } = useTranslation();
  const statusKey = normalizeCompanyStatusKey(status);
  if (!statusKey) return null;

  return (
    <span className="company-status-badge" data-status={statusKey}>
      {t(`companyStatuses.${statusKey}`, status ?? statusKey)}
    </span>
  );
}

type CompanyProfileBlockProps = {
  info: CompanyProfileFields;
  resourceType: "developers" | "publishers";
};

export default function CompanyProfileBlock({ info, resourceType }: CompanyProfileBlockProps) {
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

  if (info.legalName) {
    metaParts.push({ key: "legalName", node: info.legalName });
  }
  if (info.countryCode != null) {
    const countryLabel = formatCountryCode(info.countryCode, i18n.language);
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
              {t("catalogInfo.started", "Started")} {formatStoredCatalogDate(info.started, t, i18n)}
            </>
          ) : null}
          {info.started && info.changedOn ? " " : null}
          {info.changedOn ? (
            <>
              {t("catalogInfo.changedOn", "Changed on")}{" "}
              {formatStoredCatalogDate(info.changedOn, t, i18n)}
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
          {t("catalogInfo.knownAs", "Known as")}: {info.knownAs}
        </>
      ),
    });
  }
  if (info.companySizeId != null) {
    const companySizeLabel = formatCompanySize(info.companySizeId, t);
    if (companySizeLabel) {
      metaParts.push({ key: "companySize", node: companySizeLabel });
    }
  }
  if (info.formerly) {
    const formerly =
      typeof info.formerly === "string" ? { name: info.formerly } : info.formerly;
    metaParts.push({
      key: "formerly",
      node: (
        <>
          {t("catalogInfo.formerly", "Formerly")}: {renderCompanyName(formerly)}
        </>
      ),
    });
  }
  if (info.updatedTo) {
    metaParts.push({
      key: "updatedTo",
      node: (
        <>
          {t("catalogInfo.updatedTo", "Updated to")}: {renderCompanyName(info.updatedTo)}
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
