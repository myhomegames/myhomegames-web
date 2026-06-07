import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTunnel } from "../../contexts/TunnelContext";
import { getTunnelManagerUrl } from "../../utils/tunnelApi";

export default function SettingsCloudflareSection() {
  const { t } = useTranslation();
  const {
    featureEnabled,
    status,
    publicUrl,
    isConnecting,
    connectError,
    connectFromManager,
    disconnect,
  } = useTunnel();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!featureEnabled) {
    return null;
  }

  const connected = Boolean(status?.connected);
  const hasStored = Boolean(status?.hasStoredToken);
  const managerUrl = getTunnelManagerUrl();

  const statusKey = isConnecting
    ? "connecting"
    : connected
      ? "connected"
      : hasStored
        ? "stored"
        : "disconnected";

  const handleConnect = () => {
    setActionError(null);
    connectFromManager();
  };

  const handleDisconnect = async () => {
    if (!window.confirm(t("settings.cloudflare.confirmDisconnect"))) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await disconnect();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setActionError(message);
    } finally {
      setBusy(false);
    }
  };

  const displayError = actionError || connectError;

  return (
    <div className="bg-[#1a1a1a] settings-card settings-card--spaced-top">
      <div className="settings-card-header">
        <h2 className="settings-card-title">{t("settings.cloudflare.title")}</h2>
      </div>

      <div className="settings-card-content">
        <p className="settings-help-text settings-help-text--twitch-intro">
          {t("settings.cloudflare.description")}
        </p>

        <div className="settings-field">
          <div className="settings-label">{t("settings.cloudflare.statusLabel")}</div>
          <p className="settings-help-text">{t(`settings.cloudflare.status.${statusKey}`)}</p>
        </div>

        {publicUrl ? (
          <div className="settings-field">
            <div className="settings-label">{t("settings.cloudflare.publicUrlLabel")}</div>
            <p className="settings-help-text">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9146ff] hover:underline break-all"
              >
                {publicUrl}
              </a>
            </p>
          </div>
        ) : null}

        <div className="settings-field">
          <div className="settings-label">{t("settings.cloudflare.managerLabel")}</div>
          <p className="settings-help-text">
            <a
              href={managerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9146ff] hover:underline break-all"
            >
              {managerUrl}
            </a>
          </p>
        </div>

        <div className="settings-field settings-skin-upload-row">
          {!connected && !isConnecting ? (
            <button
              type="button"
              className="settings-button"
              onClick={handleConnect}
              disabled={busy}
            >
              {t("settings.cloudflare.connect")}
            </button>
          ) : null}
          {(connected || hasStored) && !isConnecting ? (
            <button
              type="button"
              className="settings-button"
              onClick={() => void handleDisconnect()}
              disabled={busy}
            >
              {busy ? t("settings.saving") : t("settings.cloudflare.disconnect")}
            </button>
          ) : null}
        </div>

        {displayError ? (
          <p className="settings-help-text settings-help-text--error">{displayError}</p>
        ) : null}
      </div>
    </div>
  );
}
