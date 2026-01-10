import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);

  // Check if credentials exist on mount
  useEffect(() => {
    const storedClientId = localStorage.getItem("twitch_client_id");
    const storedClientSecret = localStorage.getItem("twitch_client_secret");
    
    if (!storedClientId || !storedClientSecret) {
      setShowCredentialsForm(true);
    } else {
      setClientId(storedClientId);
      setClientSecret(storedClientSecret);
    }
  }, []);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSaveCredentials = () => {
    if (clientId && clientSecret) {
      localStorage.setItem("twitch_client_id", clientId.trim());
      localStorage.setItem("twitch_client_secret", clientSecret.trim());
      setShowCredentialsForm(false);
      // After saving, trigger login
      login();
    }
  };

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
      
      {showCredentialsForm ? (
        <>
          <p style={{ marginBottom: "1rem", color: "rgba(255, 255, 255, 0.7)", textAlign: "center", maxWidth: "400px" }}>
            {t("login.credentialsNeeded", "Please enter your Twitch OAuth credentials to continue")}
          </p>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            width: "300px",
            marginBottom: "1.5rem"
          }}>
            <input
              type="text"
              placeholder="Twitch Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && clientId && clientSecret) {
                  handleSaveCredentials();
                }
              }}
              style={{
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #444",
                backgroundColor: "#2a2a2a",
                color: "white",
                fontSize: "1rem"
              }}
            />
            <input
              type="password"
              placeholder="Twitch Client Secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && clientId && clientSecret) {
                  handleSaveCredentials();
                }
              }}
              style={{
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #444",
                backgroundColor: "#2a2a2a",
                color: "white",
                fontSize: "1rem"
              }}
            />
          </div>
          <button
            onClick={handleSaveCredentials}
            disabled={!clientId || !clientSecret}
            style={{
              padding: "12px 24px",
              fontSize: "1rem",
              backgroundColor: clientId && clientSecret ? "#9146FF" : "#555",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: clientId && clientSecret ? "pointer" : "not-allowed",
              fontWeight: 600,
              transition: "background-color 0.2s ease",
              opacity: clientId && clientSecret ? 1 : 0.6
            }}
            onMouseOver={(e) => {
              if (clientId && clientSecret) {
                e.currentTarget.style.backgroundColor = "#772CE8";
              }
            }}
            onMouseOut={(e) => {
              if (clientId && clientSecret) {
                e.currentTarget.style.backgroundColor = "#9146FF";
              }
            }}
          >
            {t("login.saveAndLogin", "Save and Login with Twitch")}
          </button>
        </>
      ) : (
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
      )}
    </div>
  );
}

