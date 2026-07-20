import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../config";
import { buildApiHeaders } from "../../utils/api";

type SettingsStreamingSectionProps = {
  initialEnabled: boolean;
  initialMoonlightWebUrl: string;
};

export default function SettingsStreamingSection({
  initialEnabled,
  initialMoonlightWebUrl,
}: SettingsStreamingSectionProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [moonlightWebUrl, setMoonlightWebUrl] = useState(initialMoonlightWebUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEnabled(initialEnabled);
    setMoonlightWebUrl(initialMoonlightWebUrl);
  }, [initialEnabled, initialMoonlightWebUrl]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(new URL("/settings", API_BASE).toString(), {
        method: "PUT",
        headers: buildApiHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          remoteStreamingEnabled: enabled,
          moonlightWebUrl: moonlightWebUrl.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : t("settings.saveError", "Could not save to server"),
        );
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.saveError", "Could not save to server"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#1a1a1a] settings-card settings-card--spaced-top">
      <div className="settings-card-header">
        <h2 className="settings-card-title">
          {t("settings.streaming.title", "Remote play (Sunshine)")}
        </h2>
      </div>
      <div className="settings-card-content">
      <p className="settings-help-text mb-4">
        {t(
          "settings.streaming.description",
          "Remote Play opens Moonlight Web when you are away from the home PC. Sunshine and Moonlight Web start with the server; Docker is installed automatically if missing (Colima on macOS).",
        )}
      </p>

      <label className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>{t("settings.streaming.enabled", "Enable remote streaming")}</span>
      </label>

      <div className="mb-4">
        <label className="settings-label" htmlFor="moonlight-web-url">
          {t("settings.streaming.moonlightWebUrl", "Moonlight Web URL")}
        </label>
        <input
          id="moonlight-web-url"
          type="url"
          className="settings-input mt-1 w-full"
          placeholder="https://stream.example.com:8080"
          value={moonlightWebUrl}
          onChange={(e) => setMoonlightWebUrl(e.target.value)}
        />
        <p className="settings-help-text mt-1">
          {t(
            "settings.streaming.moonlightWebUrlHelp",
            "Filled automatically (http://127.0.0.1:8080) when Moonlight Web is managed by the server. Override with a public HTTPS URL for remote browsers outside your LAN.",
          )}
        </p>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {saved && (
        <p className="mb-3 text-sm text-green-400">
          {t("settings.streaming.saved", "Remote play settings saved.")}
        </p>
      )}

      <button
        type="button"
        className="settings-button"
        disabled={saving}
        onClick={() => void handleSave()}
      >
        {saving ? t("settings.saving", "Saving…") : t("settings.streaming.save", "Save remote play")}
      </button>
      </div>
    </div>
  );
}
