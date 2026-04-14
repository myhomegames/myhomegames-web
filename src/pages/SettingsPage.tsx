import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLoading } from "../contexts/LoadingContext";
import { useSettings } from "../contexts/SettingsContext";
import { API_BASE } from "../config";
import { buildApiHeaders } from "../utils/api";
import { LIBRARY_ORDER, normalizeVisibleLibraries } from "../utils/librarySections";
import SettingsSkinSection from "../components/settings/SettingsSkinSection";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { setLoading, isLoading } = useLoading();
  const { refreshSettings } = useSettings();
  const [language, setLanguage] = useState("en");
  const [visibleLibraries, setVisibleLibraries] = useState<string[]>([...LIBRARY_ORDER]);
  const [twitchLoginEnabled, setTwitchLoginEnabled] = useState(false);
  const [initialTwitchLoginEnabled, setInitialTwitchLoginEnabled] = useState<boolean | null>(null);
  
  // Twitch OAuth credentials
  const [twitchClientId, setTwitchClientId] = useState("");
  const [twitchClientSecret, setTwitchClientSecret] = useState("");
  const [initialTwitchClientId, setInitialTwitchClientId] = useState<string | null>(null);
  const [initialTwitchClientSecret, setInitialTwitchClientSecret] = useState<string | null>(null);
  const [savingTwitch, setSavingTwitch] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasTwitchLoginEnabledChange =
    initialTwitchLoginEnabled !== null && twitchLoginEnabled !== initialTwitchLoginEnabled;
  const hasTwitchChanges = 
    (initialTwitchClientId !== null && twitchClientId !== initialTwitchClientId) ||
    (initialTwitchClientSecret !== null && twitchClientSecret !== initialTwitchClientSecret);

  useEffect(() => {
    // Load settings from server
    const parseStoredLibraries = () => {
      const storedLibraries = localStorage.getItem("visibleLibraries");
      if (!storedLibraries) {
        return null;
      }
      try {
        return JSON.parse(storedLibraries);
      } catch {
        return null;
      }
    };

    async function loadSettings() {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      try {
        const url = new URL("/settings", API_BASE);
        const res = await fetch(url.toString(), {
          headers: buildApiHeaders({ Accept: "application/json" }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const loadedLanguage = data.language || "en";
          setLanguage(loadedLanguage);
          i18n.changeLanguage(loadedLanguage);
          const loadedVisibleLibraries = normalizeVisibleLibraries(data.visibleLibraries);
          setVisibleLibraries(loadedVisibleLibraries);
          localStorage.setItem("visibleLibraries", JSON.stringify(loadedVisibleLibraries));
          const twitchEnabled = !!data.twitchLoginEnabled;
          setTwitchLoginEnabled(twitchEnabled);
          setInitialTwitchLoginEnabled(twitchEnabled);
          const loadedClientId = typeof data.twitchClientId === "string" ? data.twitchClientId : "";
          const loadedClientSecret = typeof data.twitchClientSecret === "string" ? data.twitchClientSecret : "";
          setTwitchClientId(loadedClientId);
          setTwitchClientSecret(loadedClientSecret);
          setInitialTwitchClientId(loadedClientId);
          setInitialTwitchClientSecret(loadedClientSecret);
        } else {
          // Fallback to localStorage
          const saved = localStorage.getItem("language") || "en";
          setLanguage(saved);
          i18n.changeLanguage(saved);
          const normalized = normalizeVisibleLibraries(parseStoredLibraries());
          setVisibleLibraries(normalized);
          setInitialTwitchLoginEnabled(false);
          setInitialTwitchClientId("");
          setInitialTwitchClientSecret("");
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("Failed to load settings:", err);
        // Fallback to localStorage
        const saved = localStorage.getItem("language") || "en";
        setLanguage(saved);
        i18n.changeLanguage(saved);
        const normalized = normalizeVisibleLibraries(parseStoredLibraries());
        setVisibleLibraries(normalized);
        setInitialTwitchLoginEnabled(false);
        setInitialTwitchClientId("");
        setInitialTwitchClientSecret("");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [setLoading, i18n]);

  async function persistGeneralSettings(nextLanguage: string, nextVisibleLibraries: string[]) {
    setSaveError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const url = new URL("/settings", API_BASE);
      const res = await fetch(url.toString(), {
        method: "PUT",
        headers: buildApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          language: nextLanguage,
          visibleLibraries: nextVisibleLibraries,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || `HTTP ${res.status}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : "Failed to save settings";
      console.error("Failed to save settings:", err);
      // "Failed to fetch" or network/certificate errors: redirect to API so user can accept cert (same as login)
      const isFetchError =
        message === "Failed to fetch" ||
        message?.toLowerCase().includes("network") ||
        message?.toLowerCase().includes("fetch");
      if (isFetchError && API_BASE) {
        const serverUrl = API_BASE.replace(/\/$/, "");
        window.location.href = serverUrl;
        return;
      }
      setSaveError(message);
    }
  }

  function applyGeneralSettings(nextLanguage: string, nextVisibleLibraries: string[]) {
    setLanguage(nextLanguage);
    setVisibleLibraries(nextVisibleLibraries);
    localStorage.setItem("language", nextLanguage);
    localStorage.setItem("visibleLibraries", JSON.stringify(nextVisibleLibraries));
    i18n.changeLanguage(nextLanguage);
    void persistGeneralSettings(nextLanguage, nextVisibleLibraries);
  }

  const toggleLibraryVisibility = (key: string) => {
    const next = new Set(visibleLibraries);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    const normalized = normalizeVisibleLibraries(Array.from(next));
    applyGeneralSettings(language, normalized);
  };

  async function handleSaveTwitchCredentials() {
    const didToggleLogin = hasTwitchLoginEnabledChange;
    const didChangeCredentials = hasTwitchChanges;
    if (!didToggleLogin && !didChangeCredentials) return;
    setSavingTwitch(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const payload: Record<string, unknown> = {
        twitchLoginEnabled,
      };
      if (didChangeCredentials) {
        payload.twitchClientId = twitchClientId.trim();
        payload.twitchClientSecret = twitchClientSecret.trim();
      }
      const res = await fetch(new URL("/settings", API_BASE).toString(), {
        method: "PUT",
        headers: buildApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Failed to save settings");
      setInitialTwitchLoginEnabled(twitchLoginEnabled);
      if (didChangeCredentials) {
        setInitialTwitchClientId(twitchClientId.trim());
        setInitialTwitchClientSecret(twitchClientSecret.trim());
      }
      await refreshSettings();
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Failed to save Twitch settings:", err);
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
                  onChange={(e) => applyGeneralSettings(e.target.value, visibleLibraries)}
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

            <div className="settings-field">
              <div className="settings-label">{t("settings.pages")}</div>
              <div className="settings-library-options">
                {LIBRARY_ORDER.map((key) => (
                  <label key={key} className="settings-library-option">
                    <input
                      type="checkbox"
                      checked={visibleLibraries.includes(key)}
                      onChange={() => toggleLibraryVisibility(key)}
                      className="settings-checkbox"
                    />
                    <span>{t(`libraries.${key}`)}</span>
                  </label>
                ))}
              </div>
              <p className="settings-help-text">
                {t("settings.pagesHelp")}
              </p>
            </div>

            {saveError && (
              <p className="settings-help-text settings-help-text--error">
                {t("settings.saveError")}: {saveError}
              </p>
            )}
          </div>
        </div>

        <SettingsSkinSection />

        {/* Twitch OAuth Settings */}
        <div className="bg-[#1a1a1a] settings-card settings-card--spaced-top">
          <div className="settings-card-header">
            <h2 className="settings-card-title">{t("settings.twitch.title", "Twitch OAuth")}</h2>
          </div>

          <div className="settings-card-content">
            <div className="settings-field">
              <label className="settings-library-option">
                <input
                  type="checkbox"
                  checked={twitchLoginEnabled}
                  onChange={(e) => setTwitchLoginEnabled(e.target.checked)}
                  className="settings-checkbox"
                />
                <span>{t("settings.twitch.enableLogin", "Enable Twitch login")}</span>
              </label>
              <p className="settings-help-text">
                {t("settings.twitch.enableLoginHelp", "When enabled, you can log in with Twitch and use IGDB search and games not yet in library. When disabled, all IGDB-related features are hidden.")}
              </p>
            </div>

            {twitchLoginEnabled && (
              <>
                <p className="settings-help-text settings-help-text--twitch-intro">
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
                    className="settings-input settings-input--tight-top"
                    placeholder={t("settings.twitch.clientIdPlaceholder", "Enter your Twitch Client ID")}
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
                    className="settings-input settings-input--tight-top"
                    placeholder={t("settings.twitch.clientSecretPlaceholder", "Enter your Twitch Client Secret")}
                  />
                  <p className="settings-help-text">
                    {t("settings.twitch.clientSecretHelp", "Your Twitch application Client Secret (keep this secure)")}
                  </p>
                </div>
              </>
            )}

            <div className="settings-actions">
              <button
                onClick={handleSaveTwitchCredentials}
                className={`settings-button ${(hasTwitchLoginEnabledChange || hasTwitchChanges) ? "settings-button-active" : ""}`}
                disabled={
                  isLoading ||
                  savingTwitch ||
                  (!hasTwitchLoginEnabledChange && (!hasTwitchChanges || !twitchClientId.trim() || !twitchClientSecret.trim()))
                }
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
