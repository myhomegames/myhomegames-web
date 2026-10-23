import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useTunnel } from "../contexts/TunnelContext";
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
const SITE_HOME_URL = "https://myhomegames.vige.it";
const MICROSOFT_STORE_URL = "https://apps.microsoft.com/detail/9nr449qz8r8f";

/* Skins inject an unlayered `* { margin: 0; padding: 0 }`, which beats Tailwind
   utilities. Layout for this page lives here so the panel stays centered and
   the buttons stay as wide as their label. */
const RECONNECT_CSS = `
.mhg-reconnect {
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow-x: hidden;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  color: #333;
  line-height: 1.35;
  text-align: left;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.mhg-reconnect, .mhg-reconnect * { box-sizing: border-box; }
.mhg-reconnect p { margin: 0 0 1rem; line-height: 1.35; text-align: left; }
.mhg-reconnect-wrap {
  display: block;
  width: 100%;
  max-width: 1200px;
  min-height: 100%;
  margin-left: auto;
  margin-right: auto;
  padding: 2rem;
}
.mhg-reconnect-logo {
  display: block;
  width: 100%;
  max-width: 528px;
  height: auto;
  margin-left: auto;
  margin-right: auto;
}
.mhg-reconnect-card {
  width: 100%;
  margin-top: 2rem;
  padding: 3rem;
  border-radius: 12px;
  background: #fff;
  text-align: left;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
.mhg-reconnect-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 3px solid #667eea;
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.25;
  text-align: left;
  color: #667eea;
}
.mhg-reconnect-title svg { flex-shrink: 0; }
.mhg-reconnect-text {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  line-height: 1.35;
  text-align: left;
  color: #333;
}
.mhg-reconnect-muted {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  line-height: 1.35;
  text-align: left;
  color: #555;
}
.mhg-reconnect-actions {
  margin: 0;
  padding: 2.5rem 0 1.5rem;
  text-align: center;
}
.mhg-reconnect-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
  padding: 1.2rem 2.5rem;
  border: 0;
  border-radius: 8px;
  font-size: 1.3rem;
  font-weight: 600;
  line-height: 1.6;
  letter-spacing: normal;
  text-align: center;
  text-decoration: none;
  text-transform: none;
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.mhg-reconnect-btn:hover { transform: translateY(-2px); }
.mhg-reconnect-btn-download {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}
.mhg-reconnect-btn-download:hover { box-shadow: 0 6px 20px rgba(245, 87, 108, 0.6); }
.mhg-reconnect-btn-retry {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}
.mhg-reconnect-btn-retry:hover { box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6); }
.mhg-reconnect-btn:disabled { cursor: not-allowed; opacity: 0.6; transform: none; }
.mhg-reconnect p.mhg-reconnect-store,
.mhg-reconnect p.mhg-reconnect-signout-row {
  margin: 1.75rem 0 0;
  text-align: center;
}
.mhg-reconnect p.mhg-reconnect-extra {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.35rem 1.25rem;
  margin: 1.5rem 0 2.5rem;
  text-align: center;
}
.mhg-reconnect-textlink {
  margin: 0;
  padding: 0;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.35;
  color: #667eea;
  text-decoration: underline;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.mhg-reconnect-social {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 1.5rem 2rem;
  margin-top: 2rem;
}
.mhg-reconnect-social a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-width: 5.5rem;
  max-width: 11rem;
  color: #444;
  text-decoration: none;
}
.mhg-reconnect-social span.mhg-reconnect-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 9999px;
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}
.mhg-reconnect-social span.mhg-reconnect-label {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.25;
  color: #555;
  text-align: center;
}
@media (max-width: 768px) {
  .mhg-reconnect-wrap { padding: 1.5rem; }
  .mhg-reconnect-logo { max-width: 320px; }
  .mhg-reconnect-card { padding: 1.5rem; }
  .mhg-reconnect-btn {
    display: flex;
    width: 100%;
  }
}
`;

function WarningIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
      <path fill="#f5a524" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  );
}

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
  const { disconnect } = useTunnel();
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

  const installLink =
    os === "mac-arm64" || os === "mac-x64"
      ? {
          href: `${SITE_HOME_URL}/install-homebrew.html`,
          label: t("serverUnavailable.installBrew", "Install with Brew"),
        }
      : os === "linux-deb"
        ? {
            href: `${SITE_HOME_URL}/install-linux.html#apt`,
            label: t("serverUnavailable.installApt", "Install with Apt"),
          }
        : os === "linux-rpm"
          ? {
              href: `${SITE_HOME_URL}/install-linux.html#yum-dnf`,
              label: t("serverUnavailable.installYumDnf", "Install with Yum/Dnf"),
            }
          : os === "linux"
            ? {
                href: `${SITE_HOME_URL}/install-linux.html`,
                label: t("serverUnavailable.installYumDnfApt", "Install with Yum/Dnf/Apt"),
              }
            : null;

  return createPortal(
    <div className="mhg-reconnect">
      <style>{RECONNECT_CSS}</style>
      <div className="mhg-reconnect-wrap">
      <header style={{ width: "100%", padding: "3rem 0", textAlign: "center" }}>
        <a href="https://myhomegames.vige.it/" style={{ display: "inline-block" }}>
          <img
            src={SITE_LOGO_URL}
            alt="MyHomeGames"
            className="mhg-reconnect-logo"
            style={{ filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))" }}
          />
        </a>
      </header>

      <main className="mhg-reconnect-card">
        <h1 className="mhg-reconnect-title">
          <WarningIcon />
          <span>{t("serverUnavailable.title", "MyHomeGames server is not reachable")}</span>
        </h1>
        <p className="mhg-reconnect-text">
          {t(
            "serverUnavailable.message",
            "The web app cannot connect to the server. Install and start it, or verify it is running, then retry.",
          )}
        </p>

        {showDownload && (
          <div>
            <p className="mhg-reconnect-muted">
              {t("serverUnavailable.downloadHint", "Download the server for your platform:")}
            </p>
            {downloadsLoading ? (
              <p className="mhg-reconnect-muted">{t("common.loading", "Loading...")}</p>
            ) : (
              <div>
                <div className="mhg-reconnect-actions">
                  <a
                    className="mhg-reconnect-btn mhg-reconnect-btn-download"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {downloadLabel}
                  </a>
                </div>
                {os === "win" ? (
                  <p className="mhg-reconnect-store">
                    <a
                      className="mhg-reconnect-textlink"
                      href={MICROSOFT_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("serverUnavailable.downloadMicrosoftStore", "Download from the Microsoft Store")}
                    </a>
                  </p>
                ) : null}
                <p className="mhg-reconnect-extra">
                  {installLink ? (
                    <a className="mhg-reconnect-textlink" href={installLink.href}>
                      {installLink.label}
                    </a>
                  ) : null}
                  <a
                    className="mhg-reconnect-textlink"
                    href={SERVER_RELEASES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("serverUnavailable.viewAllReleases", "View all releases")}
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="mhg-reconnect-muted">
            {t("serverUnavailable.supportHint", "Need help? Contact support:")}
          </p>
          <div className="mhg-reconnect-social">
            <a href={mailtoHref} title={SUPPORT_EMAIL}>
              <span
                className="mhg-reconnect-icon"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
              >
                <MailIcon />
              </span>
              <span className="mhg-reconnect-label" style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>
                {SUPPORT_EMAIL}
              </span>
            </a>
            <a href={SUPPORT_FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
              <span className="mhg-reconnect-icon" style={{ background: "#1877f2" }}>
                <FacebookIcon />
              </span>
              <span className="mhg-reconnect-label">
                {t("serverUnavailable.supportFacebook", "Facebook")}
              </span>
            </a>
            <a href={SUPPORT_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              <span
                className="mhg-reconnect-icon"
                style={{
                  background:
                    "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)",
                }}
              >
                <InstagramIcon />
              </span>
              <span className="mhg-reconnect-label">
                {t("serverUnavailable.supportInstagram", "Instagram")}
              </span>
            </a>
            <a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
              <span className="mhg-reconnect-icon" style={{ background: "#229ED9" }}>
                <TelegramIcon />
              </span>
              <span className="mhg-reconnect-label">
                {t("serverUnavailable.supportTelegram", "Telegram")}
              </span>
            </a>
          </div>
        </div>

        <div className="mhg-reconnect-actions">
          <button type="button" className="mhg-reconnect-btn mhg-reconnect-btn-retry" onClick={onRetry}>
            {t("serverUnavailable.retry", "Retry connection")}
          </button>
        </div>
        <p className="mhg-reconnect-signout-row">
          <button
            type="button"
            className="mhg-reconnect-textlink"
            onClick={() => {
              void disconnect();
            }}
          >
            {t("serverUnavailable.signOut", "Sign out")}
          </button>
        </p>
      </main>
      </div>
    </div>,
    document.body,
  );
}
