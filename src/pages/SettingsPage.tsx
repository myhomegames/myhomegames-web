import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLoading } from "../contexts/LoadingContext";
import { API_BASE, getApiToken } from "../config";
import "./SettingsPage.css";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { setLoading, isLoading } = useLoading();
  const [language, setLanguage] = useState("en");
  const [initialLanguage, setInitialLanguage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Twitch OAuth credentials
  const [twitchClientId, setTwitchClientId] = useState("");
  const [twitchClientSecret, setTwitchClientSecret] = useState("");
  const [initialTwitchClientId, setInitialTwitchClientId] = useState<string | null>(null);
  const [initialTwitchClientSecret, setInitialTwitchClientSecret] = useState<string | null>(null);
  const [savingTwitch, setSavingTwitch] = useState(false);

  // Check if there are unsaved changes
  const hasChanges = initialLanguage !== null && language !== initialLanguage;
  const hasTwitchChanges = 
    (initialTwitchClientId !== null && twitchClientId !== initialTwitchClientId) ||
    (initialTwitchClientSecret !== null && twitchClientSecret !== initialTwitchClientSecret);

  useEffect(() => {
    // Load Twitch credentials from localStorage
    const storedClientId = localStorage.getItem("twitch_client_id") || "";
    const storedClientSecret = localStorage.getItem("twitch_client_secret") || "";
    setTwitchClientId(storedClientId);
    setTwitchClientSecret(storedClientSecret);
    setInitialTwitchClientId(storedClientId);
    setInitialTwitchClientSecret(storedClientSecret);
    
    // Load settings from server
    async function loadSettings() {
      setLoading(true);
      try {
        const url = new URL("/settings", API_BASE);
        const res = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            "X-Auth-Token": getApiToken(),
          },
        });
        if (res.ok) {
          const data = await res.json();
          const loadedLanguage = data.language || "en";
          setLanguage(loadedLanguage);
          setInitialLanguage(loadedLanguage);
          i18n.changeLanguage(loadedLanguage);
        } else {
          // Fallback to localStorage
          const saved = localStorage.getItem("language") || "en";
          setLanguage(saved);
          setInitialLanguage(saved);
          i18n.changeLanguage(saved);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        // Fallback to localStorage
        const saved = localStorage.getItem("language") || "en";
        setLanguage(saved);
        setInitialLanguage(saved);
        i18n.changeLanguage(saved);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [setLoading]);

  async function handleSave() {
    setSaving(true);
    try {
      // Save settings to server
      const url = new URL("/settings", API_BASE);
      const res = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": getApiToken(),
        },
        body: JSON.stringify({
          language: language,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      // Also save to localStorage as fallback
      localStorage.setItem("language", language);
      // Change i18n language
      i18n.changeLanguage(language);
      // Update initial language to reflect saved state
      setInitialLanguage(language);
    } catch (err) {
      console.error("Failed to save settings:", err);
      // Fallback to localStorage
      localStorage.setItem("language", language);
      // Change i18n language
      i18n.changeLanguage(language);
      // Update initial language to reflect saved state
      setInitialLanguage(language);
    } finally {
      setSaving(false);
    }
  }

  function handleSaveTwitchCredentials() {
    if (!twitchClientId.trim() || !twitchClientSecret.trim()) {
      return;
    }
    
    setSavingTwitch(true);
    try {
      // Save to localStorage
      localStorage.setItem("twitch_client_id", twitchClientId.trim());
      localStorage.setItem("twitch_client_secret", twitchClientSecret.trim());
      
      // Update initial values to reflect saved state
      setInitialTwitchClientId(twitchClientId.trim());
      setInitialTwitchClientSecret(twitchClientSecret.trim());
    } catch (err) {
      console.error("Failed to save Twitch credentials:", err);
    } finally {
      setSavingTwitch(false);
    }
  }

  return (
    <div className="bg-[#1a1a1a] text-white settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">{t("settings.title")}</h1>
          <p className="settings-subtitle">{t("settings.subtitle")}</p>
        </div>

        <div className="bg-[#1a1a1a] settings-card">
          <div className="settings-card-header">
            <h2 className="settings-card-title">{t("settings.general")}</h2>
          </div>

          <div className="settings-card-content">
            <div className="settings-field-small">
              <div className="settings-label">
                {t("settings.version")} {__APP_VERSION__}
              </div>
            </div>

            <div className="settings-field">
              <div className="settings-field-row">
                <label className="settings-label" htmlFor="language-select">{t("settings.language")}</label>
                <select
                  id="language-select"
                  name="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="settings-select"
                >
                  <option value="en">{t("settings.english")}</option>
                  <option value="it">{t("settings.italian")}</option>
                  <option value="pt">{t("settings.portuguese")}</option>
                  <option value="es">{t("settings.spanish")}</option>
                  <option value="fr">{t("settings.french")}</option>
                  <option value="de">{t("settings.german")}</option>
                  <option value="zh">{t("settings.chinese")}</option>
                  <option value="ja">{t("settings.japanese")}</option>
                </select>
              </div>
              <p className="settings-help-text">
                {t("settings.selectLanguage")}
              </p>
            </div>

            <div className="settings-actions">
              <button
                onClick={handleSave}
                className={`settings-button ${hasChanges ? "settings-button-active" : ""}`}
                disabled={isLoading || saving || !hasChanges}
              >
                {saving ? t("settings.saving") : t("settings.save")}
              </button>
            </div>
          </div>
        </div>

        {/* Twitch OAuth Settings */}
        <div className="bg-[#1a1a1a] settings-card" style={{ marginTop: "24px" }}>
          <div className="settings-card-header">
            <h2 className="settings-card-title">{t("settings.twitch.title", "Twitch OAuth")}</h2>
          </div>

          <div className="settings-card-content">
            <p className="settings-help-text" style={{ marginBottom: "24px" }}>
              {t("settings.twitch.description", "Configure your Twitch OAuth application credentials. You can get these from the Twitch Developer Console.")}
            </p>

            <div className="settings-field">
              <label className="settings-label" htmlFor="twitch-client-id">
                {t("settings.twitch.clientId", "Client ID")}
              </label>
              <input
                id="twitch-client-id"
                type="text"
                value={twitchClientId}
                onChange={(e) => setTwitchClientId(e.target.value)}
                className="settings-input"
                placeholder={t("settings.twitch.clientIdPlaceholder", "Enter your Twitch Client ID")}
                style={{ marginTop: "8px" }}
              />
              <p className="settings-help-text">
                {t("settings.twitch.clientIdHelp", "Your Twitch application Client ID")}
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-label" htmlFor="twitch-client-secret">
                {t("settings.twitch.clientSecret", "Client Secret")}
              </label>
              <input
                id="twitch-client-secret"
                type="password"
                value={twitchClientSecret}
                onChange={(e) => setTwitchClientSecret(e.target.value)}
                className="settings-input"
                placeholder={t("settings.twitch.clientSecretPlaceholder", "Enter your Twitch Client Secret")}
                style={{ marginTop: "8px" }}
              />
              <p className="settings-help-text">
                {t("settings.twitch.clientSecretHelp", "Your Twitch application Client Secret (keep this secure)")}
              </p>
            </div>

            <div className="settings-actions">
              <button
                onClick={handleSaveTwitchCredentials}
                className={`settings-button ${hasTwitchChanges ? "settings-button-active" : ""}`}
                disabled={!twitchClientId.trim() || !twitchClientSecret.trim() || savingTwitch || !hasTwitchChanges}
              >
                {savingTwitch ? t("settings.saving") : t("settings.save")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
