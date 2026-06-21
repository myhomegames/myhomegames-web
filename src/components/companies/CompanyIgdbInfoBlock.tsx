import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { IgdbCompanyInfo } from "../../types";
import { formatIgdbStoredDate } from "../../utils/date";

type CompanyIgdbInfoBlockProps = {
  info: IgdbCompanyInfo;
  resourceType: "developers" | "publishers";
};

export default function CompanyIgdbInfoBlock({ info, resourceType }: CompanyIgdbInfoBlockProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const hasInfo = Boolean(info.status || info.updatedTo || info.country || info.changedOn || info.started);
  if (!hasInfo) {
    return null;
  }

  const routeBase = resourceType === "developers" ? "/developers" : "/publishers";
  const statusKey = info.status?.trim().toLowerCase() ?? "";

  return (
    <div className="game-info-block library-item-detail-company-info">
      {statusKey && (
        <div className="game-info-field">
          <div className="text-white game-info-label">{t("igdbInfo.companyStatus", "Status")}</div>
          <span className="igdb-company-status-badge" data-status={statusKey}>
            {t(`igdbCompanyStatuses.${statusKey}`, info.status ?? statusKey)}
          </span>
        </div>
      )}
      {info.updatedTo && (
        <div className="game-info-field">
          <div className="text-white game-info-label">{t("igdbInfo.updatedTo", "Updated to")}</div>
          <button
            type="button"
            className="game-info-list-item game-info-list-link"
            onClick={() => navigate(`${routeBase}/${info.updatedTo!.id}`)}
          >
            {info.updatedTo.name}
          </button>
        </div>
      )}
      {info.country && (
        <div className="game-info-field">
          <div className="text-white game-info-label">{t("igdbInfo.country", "Country")}</div>
          <span className="game-info-list-item">{info.country}</span>
        </div>
      )}
      {info.started && (
        <div className="game-info-field">
          <div className="text-white game-info-label">{t("igdbInfo.started", "Started")}</div>
          <span className="game-info-list-item">{formatIgdbStoredDate(info.started, t, i18n)}</span>
        </div>
      )}
      {info.changedOn && (
        <div className="game-info-field">
          <div className="text-white game-info-label">{t("igdbInfo.changedOn", "Changed on")}</div>
          <span className="game-info-list-item">{formatIgdbStoredDate(info.changedOn, t, i18n)}</span>
        </div>
      )}
    </div>
  );
}
