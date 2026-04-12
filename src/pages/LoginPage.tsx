import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import "./LoginPage.css";

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [hasCredentials, setHasCredentials] = useState(() => {
    if (typeof window === "undefined") return false;
    const storedClientId = localStorage.getItem("twitch_client_id");
    const storedClientSecret = localStorage.getItem("twitch_client_secret");
    return !!(storedClientId && storedClientSecret);
  });

  // Update hasCredentials if localStorage changes (e.g. user added credentials in Settings in another tab)
  useEffect(() => {
    const storedClientId = localStorage.getItem("twitch_client_id");
    const storedClientSecret = localStorage.getItem("twitch_client_secret");
    setHasCredentials(!!(storedClientId && storedClientSecret));
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
            {t("login.credentialsNeeded", "Twitch OAuth credentials are required to login. Please configure them in Settings first.")}
          </p>
          <p className="login-page-missing-secondary">
            {t("login.configureFirst", "You can get your Twitch Client ID and Client Secret from the Twitch Developer Console.")}
          </p>
          <Link to="/settings" className="login-page-settings-cta">
            {t("login.goToSettings", "Go to Settings")}
          </Link>
        </>
      )}
    </div>
  );
}

