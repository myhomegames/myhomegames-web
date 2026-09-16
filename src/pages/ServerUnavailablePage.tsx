import { useTranslation } from "react-i18next";
import { useServerDownload } from "../hooks/useServerDownload";
import { isPhoneWithoutServerPackage, SERVER_OS_I18N_KEY } from "../utils/serverDownload";
import { isSmartTvBrowser } from "../utils/smartTv";

type ServerUnavailablePageProps = {
  onRetry: () => void;
};

const SUPPORT_EMAIL = "myhomegames@vige.it";
const SUPPORT_FACEBOOK_URL = "https://www.facebook.com/groups/1864095787557962";
const SUPPORT_INSTAGRAM_URL = "https://www.instagram.com/myhomegames/";

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H6v4h3v8h4v-8h3.2l.8-4H13V9c0-.6.4-1 1-1z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const supportButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-sm font-medium text-white transition hover:border-white/50 hover:bg-white/10";

export default function ServerUnavailablePage({ onRetry }: ServerUnavailablePageProps) {
  const { t } = useTranslation();
  const { url, os, loading: downloadsLoading, platformSpecific } = useServerDownload();
  // Desktop browsers: always offer the server package when unreachable (localhost
  // or after Access login with no home tunnel yet). Phones/TVs have no package.
  const showDownload = !isPhoneWithoutServerPackage() && !isSmartTvBrowser();
  const platformLabel = t(SERVER_OS_I18N_KEY[os], os);

  const downloadLabel = platformSpecific
    ? t("serverUnavailable.downloadForPlatform", "Download for {{platform}}", {
        platform: platformLabel,
      })
    : t("serverUnavailable.download", "Download");

  const mailSubject = encodeURIComponent(
    t("serverUnavailable.supportMailSubject", "MyHomeGames support"),
  );
  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${mailSubject}`;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-lg rounded-xl border border-white/15 bg-black/45 p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="mb-3 text-2xl font-semibold leading-tight">
          {t("serverUnavailable.title", "MyHomeGames server is not reachable")}
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-white/75">
          {t(
            "serverUnavailable.message",
            "The web app cannot connect to the server. Install and start it, or verify it is running, then retry.",
          )}
        </p>

        {showDownload && (
          <div className="mb-6 flex flex-col gap-2">
            <p className="text-sm text-white/75">
              {t("serverUnavailable.downloadHint", "Download the server for your platform:")}
            </p>
            {downloadsLoading ? (
              <p className="text-sm text-white/60">{t("common.loading", "Loading...")}</p>
            ) : (
              <>
                <a
                  className="inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {downloadLabel}
                </a>
                <code className="break-all text-xs text-white/60">{url}</code>
              </>
            )}
          </div>
        )}

        <div className="mb-6">
          <p className="mb-2 text-sm text-white/75">
            {t("serverUnavailable.supportHint", "Need help? Contact support:")}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              className={supportButtonClass}
              href={mailtoHref}
              title={SUPPORT_EMAIL}
            >
              <MailIcon />
              <span className="break-all">{SUPPORT_EMAIL}</span>
            </a>
            <a
              className={supportButtonClass}
              href={SUPPORT_FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FacebookIcon />
              {t("serverUnavailable.supportFacebook", "Facebook")}
            </a>
            <a
              className={supportButtonClass}
              href={SUPPORT_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <InstagramIcon />
              {t("serverUnavailable.supportInstagram", "Instagram")}
            </a>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="rounded-lg border border-white/25 px-4 py-2 text-sm font-medium text-white transition hover:border-white/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onRetry}
          >
            {t("serverUnavailable.retry", "Retry connection")}
          </button>
        </div>
      </div>
    </div>
  );
}
