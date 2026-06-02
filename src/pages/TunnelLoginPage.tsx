import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTunnel } from "../contexts/TunnelContext";
import { getTunnelManagerUrl } from "../utils/tunnelApi";

export default function TunnelLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { connectFromManager, isConnecting, connectError, tunnelReady } = useTunnel();
  const [localError, setLocalError] = useState<string | null>(null);
  const managerUrl = getTunnelManagerUrl();

  useEffect(() => {
    if (tunnelReady) {
      navigate("/", { replace: true });
    }
  }, [tunnelReady, navigate]);

  const openManager = () => {
    window.open(managerUrl, "_blank", "noopener,noreferrer");
  };

  const handleConnect = async () => {
    setLocalError(null);
    try {
      await connectFromManager();
      navigate("/", { replace: true });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  };

  const error = localError || connectError;

  return (
    <div className="login-page-root">
      <h1 className="login-page-title">{t("tunnel.title", "Connect Cloudflare Tunnel")}</h1>
      <p className="login-page-lead">
        {t(
          "tunnel.lead",
          "Sign in with Cloudflare Access on the tunnel manager, then connect this device.",
        )}
      </p>
      <ol className="login-page-missing-secondary" style={{ textAlign: "left", maxWidth: "28rem", margin: "0 auto 1.5rem" }}>
        <li>{t("tunnel.step1", "Open the tunnel manager and complete Cloudflare login.")}</li>
        <li>{t("tunnel.step2", "Return here and fetch your personal tunnel token.")}</li>
      </ol>
      <button type="button" className="login-page-twitch-btn" onClick={openManager}>
        {t("tunnel.openManager", "Open tunnel manager")}
      </button>
      <p className="login-page-settings-hint" style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className="login-page-settings-link"
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          disabled={isConnecting}
          onClick={() => void handleConnect()}
        >
          {isConnecting
            ? t("tunnel.connecting", "Connecting…")
            : t("tunnel.connect", "Connect tunnel")}
        </button>
      </p>
      {error ? (
        <p className="login-page-missing-primary" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
