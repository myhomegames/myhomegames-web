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
  const [hasCredentials, setHasCredentials] = useState(false);

  // Check if credentials exist on mount and load them
  useEffect(() => {
    const storedClientId = localStorage.getItem("twitch_client_id") || "";
    const storedClientSecret = localStorage.getItem("twitch_client_secret") || "";
    
    setClientId(storedClientId);
    setClientSecret(storedClientSecret);
    setHasCredentials(!!(storedClientId && storedClientSecret));
  }, []);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSaveCredentials = () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      return;
    }
    
    localStorage.setItem("twitch_client_id", clientId.trim());
    localStorage.setItem("twitch_client_secret", clientSecret.trim());
    setHasCredentials(true);
  };

  const handleLogin = () => {
    if (!hasCredentials && (!clientId.trim() || !clientSecret.trim())) {
      return;
    }
    
    // Save credentials if they were just entered
    if (!hasCredentials) {
      handleSaveCredentials();
    }
    
    login();
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
      color: "white",
      padding: "2rem"
    }}>
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem" }}>
        {t("login.title", "Welcome to MyHomeGames")}
      </h1>
      
      {!hasCredentials ? (
        <>
          <p style={{ marginBottom: "1.5rem", color: "rgba(255, 255, 255, 0.7)", textAlign: "center", maxWidth: "400px" }}>
            {t("login.enterCredentials", "Enter your Twitch OAuth credentials to continue")}
          </p>
          
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "1rem", 
            width: "100%", 
            maxWidth: "400px",
            marginBottom: "1.5rem"
          }}>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "0.5rem", 
                fontSize: "0.9rem",
                color: "rgba(255, 255, 255, 0.8)"
              }}>
                {t("login.clientId", "Client ID")}
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={t("login.clientIdPlaceholder", "Enter your Twitch Client ID")}
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "1rem",
                  backgroundColor: "#2a2a2a",
                  color: "white",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  boxSizing: "border-box"
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "0.5rem", 
                fontSize: "0.9rem",
                color: "rgba(255, 255, 255, 0.8)"
              }}>
                {t("login.clientSecret", "Client Secret")}
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={t("login.clientSecretPlaceholder", "Enter your Twitch Client Secret")}
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "1rem",
                  backgroundColor: "#2a2a2a",
                  color: "white",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>
          
          <p style={{ marginBottom: "1.5rem", color: "rgba(255, 255, 255, 0.5)", textAlign: "center", maxWidth: "400px", fontSize: "0.85rem" }}>
            {t("login.credentialsHelp", "You can get your Twitch Client ID and Client Secret from the Twitch Developer Console.")}
          </p>
        </>
      ) : (
        <p style={{ marginBottom: "2rem", color: "rgba(255, 255, 255, 0.7)", textAlign: "center", maxWidth: "400px" }}>
          {t("login.subtitle", "Please login to continue")}
        </p>
      )}
      
      <button
        onClick={handleLogin}
        disabled={!hasCredentials && (!clientId.trim() || !clientSecret.trim())}
        style={{
          padding: "12px 24px",
          fontSize: "1rem",
          backgroundColor: (!hasCredentials && (!clientId.trim() || !clientSecret.trim())) ? "#555" : "#9146FF",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: (!hasCredentials && (!clientId.trim() || !clientSecret.trim())) ? "not-allowed" : "pointer",
          fontWeight: 600,
          transition: "background-color 0.2s ease",
          opacity: (!hasCredentials && (!clientId.trim() || !clientSecret.trim())) ? 0.6 : 1
        }}
        onMouseOver={(e) => {
          if (!(!hasCredentials && (!clientId.trim() || !clientSecret.trim()))) {
            e.currentTarget.style.backgroundColor = "#772CE8";
          }
        }}
        onMouseOut={(e) => {
          if (!(!hasCredentials && (!clientId.trim() || !clientSecret.trim()))) {
            e.currentTarget.style.backgroundColor = "#9146FF";
          }
        }}
      >
        {t("login.button", "Login with Twitch")}
      </button>
      
      {hasCredentials && (
        <button
          onClick={() => {
            setHasCredentials(false);
            setClientId("");
            setClientSecret("");
            localStorage.removeItem("twitch_client_id");
            localStorage.removeItem("twitch_client_secret");
          }}
          style={{
            marginTop: "1rem",
            padding: "8px 16px",
            fontSize: "0.85rem",
            backgroundColor: "transparent",
            color: "rgba(255, 255, 255, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
          }}
        >
          {t("login.changeCredentials", "Change Credentials")}
        </button>
      )}
    </div>
  );
}

