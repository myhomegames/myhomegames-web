import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTunnel } from "../contexts/TunnelContext";
import {
  pollDevicePairing,
  requestDevicePairingCode,
  type DevicePairingSession,
} from "../utils/tunnelApi";

function qrImageUrl(data: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function DevicePairingPage() {
  const { t } = useTranslation();
  const { completeDevicePairing, connectError } = useTunnel();
  const [session, setSession] = useState<DevicePairingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "waiting" | "connecting" | "expired">("loading");
  const pollTimerRef = useRef<number | undefined>(undefined);
  const sessionRef = useRef<DevicePairingSession | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current !== undefined) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = undefined;
    }
  }, []);

  const startSession = useCallback(async () => {
    clearPoll();
    setError(null);
    setPhase("loading");
    try {
      const next = await requestDevicePairingCode();
      sessionRef.current = next;
      setSession(next);
      setPhase("waiting");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setPhase("expired");
    }
  }, [clearPoll]);

  useEffect(() => {
    void startSession();
    return () => clearPoll();
  }, [startSession, clearPoll]);

  useEffect(() => {
    if (phase !== "waiting" || !session) return;

    let cancelled = false;
    const intervalMs = Math.max(2, session.interval) * 1000;
    const deadline = Date.now() + session.expires_in * 1000;

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() > deadline) {
        setPhase("expired");
        return;
      }
      try {
        const result = await pollDevicePairing(session.device_code);
        if (cancelled) return;
        if (result.status === "authorization_pending") {
          pollTimerRef.current = window.setTimeout(() => {
            void tick();
          }, intervalMs);
          return;
        }
        if (result.status === "expired") {
          setPhase("expired");
          return;
        }
        setPhase("connecting");
        await completeDevicePairing(result.token, result.url);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        pollTimerRef.current = window.setTimeout(() => {
          void tick();
        }, intervalMs);
      }
    };

    pollTimerRef.current = window.setTimeout(() => {
      void tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [phase, session, completeDevicePairing, clearPoll]);

  const displayError = error || connectError;
  const linkUrl = session?.verification_uri || "";
  const qrUrl = session?.verification_uri_complete || "";

  return (
    <div className="mhg-device-pairing">
      <div className="mhg-device-pairing__panel">
        <h1 className="mhg-device-pairing__title">{t("devicePairing.title")}</h1>
        <p className="mhg-device-pairing__lead">{t("devicePairing.lead")}</p>

        {phase === "loading" ? (
          <p className="mhg-device-pairing__status">{t("devicePairing.loading")}</p>
        ) : null}

        {session && (phase === "waiting" || phase === "connecting") ? (
          <>
            <div className="mhg-device-pairing__code" aria-live="polite">
              {session.user_code}
            </div>
            <p className="mhg-device-pairing__hint">
              {t("devicePairing.openLink", { url: linkUrl.replace(/^https?:\/\//, "") })}
            </p>
            {qrUrl ? (
              <img
                className="mhg-device-pairing__qr"
                src={qrImageUrl(qrUrl)}
                alt={t("devicePairing.qrAlt")}
                width={240}
                height={240}
              />
            ) : null}
            <p className="mhg-device-pairing__status">
              {phase === "connecting"
                ? t("devicePairing.connecting")
                : t("devicePairing.waiting")}
            </p>
          </>
        ) : null}

        {phase === "expired" ? (
          <div className="mhg-device-pairing__expired">
            <p className="mhg-device-pairing__status">{t("devicePairing.expired")}</p>
            <button
              type="button"
              className="mhg-device-pairing__retry"
              autoFocus
              onClick={() => void startSession()}
            >
              {t("devicePairing.retry")}
            </button>
          </div>
        ) : null}

        {displayError ? (
          <p className="mhg-device-pairing__error" role="alert">
            {displayError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
