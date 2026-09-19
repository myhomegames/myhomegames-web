import { useTranslation } from "react-i18next";
import { useServerDownload } from "../hooks/useServerDownload";
import {
  isPhoneWithoutServerPackage,
  SERVER_OS_I18N_KEY,
  SERVER_RELEASES_URL,
} from "../utils/serverDownload";
import { isSmartTvBrowser } from "../utils/smartTv";

type ServerUnavailablePageProps = {
  onRetry: () => void;
};

const SUPPORT_EMAIL = "myhomegames@vige.it";
const SUPPORT_FACEBOOK_URL = "https://www.facebook.com/groups/1864095787557962";
const SUPPORT_INSTAGRAM_URL = "https://www.instagram.com/myhomegames/";
const SUPPORT_TELEGRAM_URL = "https://t.me/+0PutCvWJRSQwYjg0";
const SITE_LOGO_URL = "https://myhomegames.vige.it/logo.png";

function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
      />
    </svg>
  );
}

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
    <div
      className="flex min-h-screen flex-col items-center px-4 py-8 text-[#333] sm:py-12"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <header className="mb-6 text-center text-white sm:mb-8">
        <a href="https://myhomegames.vige.it/" className="inline-block">
          <img
            src={SITE_LOGO_URL}
            alt="MyHomeGames"
            className="mx-auto h-auto w-full max-w-[min(100%,320px)] drop-shadow-[2px_2px_4px_rgba(0,0,0,0.2)] sm:max-w-[400px]"
          />
        </a>
      </header>

      <main
        className="w-full max-w-xl rounded-xl bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.2)] sm:p-10"
      >
        <h1 className="mb-4 border-b-[3px] border-[#667eea] pb-2 text-2xl font-semibold text-[#667eea] sm:text-[1.75rem]">
          {t("serverUnavailable.title", "MyHomeGames server is not reachable")}
        </h1>
        <p className="mb-6 text-base leading-relaxed text-[#333] sm:text-[1.1rem]">
          {t(
            "serverUnavailable.message",
            "The web app cannot connect to the server. Install and start it, or verify it is running, then retry.",
          )}
        </p>

        {showDownload && (
          <div className="mb-8">
            <p className="mb-3 text-base text-[#555] sm:text-[1.1rem]">
              {t("serverUnavailable.downloadHint", "Download the server for your platform:")}
            </p>
            {downloadsLoading ? (
              <p className="text-sm text-[#777]">{t("common.loading", "Loading...")}</p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <a
                  className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-center text-lg font-semibold text-white no-underline shadow-[0_4px_15px_rgba(245,87,108,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(245,87,108,0.6)]"
                  style={{
                    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  }}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {downloadLabel}
                </a>
                <a
                  className="text-center text-sm font-medium text-[#667eea] underline-offset-2 hover:underline"
                  href={SERVER_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("serverUnavailable.orBrowseReleases", "or browse the releases")}
                </a>
              </div>
            )}
          </div>
        )}

        <div className="mb-8">
          <p className="mb-4 text-base text-[#555] sm:text-[1.1rem]">
            {t("serverUnavailable.supportHint", "Need help? Contact support:")}
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-5 sm:justify-start">
            <a
              className="flex min-w-[5.5rem] max-w-[11rem] flex-col items-center gap-2 text-[#444] no-underline transition hover:-translate-y-0.5"
              href={mailtoHref}
              title={SUPPORT_EMAIL}
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
              >
                <MailIcon />
              </span>
              <span className="break-all text-center text-[0.8rem] font-semibold leading-snug text-[#555]">
                {SUPPORT_EMAIL}
              </span>
            </a>
            <a
              className="flex w-[5.5rem] flex-col items-center gap-2 text-[#444] no-underline transition hover:-translate-y-0.5"
              href={SUPPORT_FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                style={{ background: "#1877f2" }}
              >
                <FacebookIcon />
              </span>
              <span className="text-center text-[0.9rem] font-semibold leading-snug text-[#555]">
                {t("serverUnavailable.supportFacebook", "Facebook")}
              </span>
            </a>
            <a
              className="flex w-[5.5rem] flex-col items-center gap-2 text-[#444] no-underline transition hover:-translate-y-0.5"
              href={SUPPORT_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                style={{
                  background:
                    "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)",
                }}
              >
                <InstagramIcon />
              </span>
              <span className="text-center text-[0.9rem] font-semibold leading-snug text-[#555]">
                {t("serverUnavailable.supportInstagram", "Instagram")}
              </span>
            </a>
            <a
              className="flex w-[5.5rem] flex-col items-center gap-2 text-[#444] no-underline transition hover:-translate-y-0.5"
              href={SUPPORT_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                style={{ background: "#229ED9" }}
              >
                <TelegramIcon />
              </span>
              <span className="text-center text-[0.9rem] font-semibold leading-snug text-[#555]">
                {t("serverUnavailable.supportTelegram", "Telegram")}
              </span>
            </a>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border-0 px-8 py-3.5 text-lg font-semibold text-white shadow-[0_4px_15px_rgba(102,126,234,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(102,126,234,0.6)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
            onClick={onRetry}
          >
            {t("serverUnavailable.retry", "Retry connection")}
          </button>
        </div>
      </main>
    </div>
  );
}
