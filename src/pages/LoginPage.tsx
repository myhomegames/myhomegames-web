import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [hasCredentials, setHasCredentials] = useState(false);

  // Check if credentials exist on mount
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
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#1a1a1a",
      color: "white"
    }}>
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>
        {t("login.title", "Welcome to MyHomeGames")}
      </h1>
      
      {hasCredentials ? (
        <>
          <p style={{ marginBottom: "2rem", color: "rgba(255, 255, 255, 0.7)" }}>
            {t("login.subtitle", "Please login to continue")}
          </p>
          <button
            onClick={() => login()}
            style={{
              padding: "12px 24px",
              fontSize: "1rem",
              backgroundColor: "#9146FF",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              transition: "background-color 0.2s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#772CE8"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#9146FF"}
          >
            {t("login.button", "Login with Twitch")}
          </button>
        </>
      ) : (
        <>
          <p style={{ marginBottom: "1rem", color: "rgba(255, 255, 255, 0.7)", textAlign: "center", maxWidth: "400px" }}>
            {t("login.credentialsNeeded", "Twitch OAuth credentials are required to login. Please configure them in Settings first.")}
          </p>
          <p style={{ marginBottom: "2rem", color: "rgba(255, 255, 255, 0.5)", textAlign: "center", maxWidth: "400px", fontSize: "0.9rem" }}>
            {t("login.configureFirst", "You can get your Twitch Client ID and Client Secret from the Twitch Developer Console.")}
          </p>
          <Link
            to="/settings"
            style={{
              padding: "12px 24px",
              fontSize: "1rem",
              backgroundColor: "#E5A00D",
              color: "#000000",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              textDecoration: "none",
              transition: "background-color 0.2s ease",
              display: "inline-block"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#F5B041";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#E5A00D";
            }}
          >
            {t("login.goToSettings", "Go to Settings")}
          </Link>
        </>
      )}
    </div>
  );
}

