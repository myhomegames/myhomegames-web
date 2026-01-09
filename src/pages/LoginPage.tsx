import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      <p style={{ marginBottom: "2rem", color: "rgba(255, 255, 255, 0.7)" }}>
        {t("login.subtitle", "Please login to continue")}
      </p>
      <button
        onClick={login}
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
    </div>
  );
}

