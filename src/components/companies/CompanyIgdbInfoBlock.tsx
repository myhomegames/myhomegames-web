import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { IgdbCompanyInfo } from "../../types";
import { formatIgdbStoredDate } from "../../utils/date";

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

  const routeBase = resourceType === "developers" ? "/developers" : "/publishers";

  const metaParts: Array<{ key: string; node: ReactNode }> = [];

  if (info.country) {
    metaParts.push({ key: "country", node: info.country });
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
  if (info.formerly) {
    metaParts.push({
      key: "formerly",
      node: (
        <>
          {t("igdbInfo.formerly", "Formerly")}: {info.formerly}
        </>
      ),
    });
  }
  if (info.parentCompany) {
    metaParts.push({
      key: "parentCompany",
      node: (
        <>
          {t("igdbInfo.parentCompany", "Parent company")}:{" "}
          <button
            type="button"
            className="game-info-list-link library-item-detail-company-link"
            onClick={() => navigate(`${routeBase}/${info.parentCompany!.id}`)}
          >
            {info.parentCompany.name}
          </button>
        </>
      ),
    });
  }
  if (info.updatedTo) {
    metaParts.push({
      key: "updatedTo",
      node: (
        <>
          {t("igdbInfo.updatedTo", "Updated to")}:{" "}
          <button
            type="button"
            className="game-info-list-link library-item-detail-company-link"
            onClick={() => navigate(`${routeBase}/${info.updatedTo!.id}`)}
          >
            {info.updatedTo.name}
          </button>
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
