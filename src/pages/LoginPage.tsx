import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { formatTwitchAuthError } from "../utils/twitchAuthErrors";

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const { twitchApiEnabled } = useSettings();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [hasCredentials, setHasCredentials] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  useEffect(() => {
    setHasCredentials(twitchApiEnabled);
  }, [twitchApiEnabled]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("auth_error");
    if (!err) return;
    setAuthError(formatTwitchAuthError(err));
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="login-page-root">
      <h1 className="login-page-title">{t("login.title", "Welcome to MyHomeGames")}</h1>

      {authError ? (
        <p className="login-page-missing-primary" role="alert">
          {t("login.authError", "Login failed")}: {authError}
        </p>
      ) : null}

      {hasCredentials ? (
        <>
          <p className="login-page-lead">{t("login.subtitle", "Please login to continue")}</p>
          <button type="button" className="login-page-twitch-btn" onClick={() => login()}>
            {t("login.button", "Login with Twitch")}
          </button>
          <p className="login-page-settings-hint">
            <Link to="/settings" className="login-page-settings-link">
              {t("login.orGoToSettings", "Or go to Settings")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="login-page-missing-primary">
            {t("login.apiNotEnabled", "Enable IGDB API in Settings to use Twitch login.")}
          </p>
          <p className="login-page-missing-secondary">
            {t("login.gatewayHint", "Application credentials are configured on the API host, not in this app.")}
          </p>
          <Link to="/settings" className="login-page-settings-cta">
            {t("login.goToSettings", "Go to Settings")}
          </Link>
        </>
      )}
    </div>
  );
}

