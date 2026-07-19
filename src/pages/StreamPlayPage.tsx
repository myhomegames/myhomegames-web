import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getApiBase } from "../config";
import { buildApiHeaders } from "../utils/api";

type LaunchState = "idle" | "launching" | "ready" | "error";

const MOONLIGHT_POPUP_NAME = "mhg-moonlight-stream";

function stopStreamingSession(hostId: number | null) {
  const url = new URL("/streaming/stop", getApiBase());
  const headers = buildApiHeaders({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  const body = JSON.stringify({
    ...(hostId != null && Number.isFinite(hostId) ? { hostId } : {}),
  });
  // keepalive so the request can finish while the page unloads / navigates away
  void fetch(url.toString(), {
    method: "POST",
    headers,
    body,
    keepalive: true,
  }).catch(() => {
    // best-effort; leaving Play should not block on stop failures
  });
}

function isStillStreamUrl(href: string, streamUrl: string): boolean {
  try {
    const current = new URL(href);
    const expected = new URL(streamUrl);
    if (current.origin !== expected.origin) return false;
    return current.pathname.endsWith("/stream.html") || current.pathname.endsWith("stream.html");
  } catch {
    return false;
  }
}

export default function StreamPlayPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const executableName = searchParams.get("executable") || undefined;

  const [launchState, setLaunchState] = useState<LaunchState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [moonlightWebUrl, setMoonlightWebUrl] = useState("");
  const [sunshineReachable, setSunshineReachable] = useState(false);
  const [streamHostId, setStreamHostId] = useState<number | null>(null);
  const [embedMode, setEmbedMode] = useState<"popup" | "iframe" | null>(null);
  const streamHostIdRef = useRef<number | null>(null);
  const sessionStartedRef = useRef(false);
  const stopSentRef = useRef(false);
  const popupRef = useRef<Window | null>(null);
  const iframeLoadCountRef = useRef(0);
  const endingRef = useRef(false);

  useEffect(() => {
    streamHostIdRef.current = streamHostId;
  }, [streamHostId]);

  function endSessionAndLeave(navigateBack: boolean) {
    if (endingRef.current) return;
    endingRef.current = true;
    if (sessionStartedRef.current && !stopSentRef.current) {
      stopSentRef.current = true;
      stopStreamingSession(streamHostIdRef.current);
    }
    try {
      popupRef.current?.close();
    } catch {
      // ignore
    }
    popupRef.current = null;
    if (navigateBack) navigate(-1);
  }

  useEffect(() => {
    if (!gameId) {
      setLaunchState("error");
      setError(t("streamPlay.missingGame", "Missing game id"));
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLaunchState("launching");
      setError(null);
      stopSentRef.current = false;
      sessionStartedRef.current = false;
      endingRef.current = false;
      iframeLoadCountRef.current = 0;
      setEmbedMode(null);
      try {
        const url = new URL("/streaming/launch", getApiBase());
        const res = await fetch(url.toString(), {
          method: "POST",
          headers: buildApiHeaders({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            gameId,
            ...(executableName ? { executableName } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setLaunchState("error");
          setError(
            typeof data.detail === "string"
              ? data.detail
              : typeof data.error === "string"
                ? data.error
                : t("streamPlay.launchFailed", "Failed to start the game on the home PC"),
          );
          return;
        }
        const streamUrl =
          typeof data.moonlightWebUrl === "string" ? data.moonlightWebUrl.trim() : "";
        if (!streamUrl) {
          setLaunchState("error");
          setError(
            t(
              "streamPlay.noMoonlightUrl",
              "Moonlight Web URL is not configured on the server.",
            ),
          );
          return;
        }
        const hostIdRaw = data?.moonlightStream?.hostId;
        const hostId =
          typeof hostIdRaw === "number"
            ? hostIdRaw
            : typeof hostIdRaw === "string" && hostIdRaw.trim()
              ? Number(hostIdRaw)
              : null;
        setStreamHostId(Number.isFinite(hostId as number) ? (hostId as number) : null);
        setMoonlightWebUrl(streamUrl);
        setSunshineReachable(!!data.sunshineReachable);
        sessionStartedRef.current = true;

        // Prefer a popup: Moonlight "Exit stream" calls window.close(), which works in a
        // script-opened window but is a no-op inside an iframe.
        const popup = window.open(streamUrl, MOONLIGHT_POPUP_NAME);
        if (popup) {
          popupRef.current = popup;
          setEmbedMode("popup");
        } else {
          setEmbedMode("iframe");
        }
        setLaunchState("ready");
      } catch (err) {
        if (cancelled) return;
        setLaunchState("error");
        setError(
          err instanceof Error
            ? err.message
            : t("streamPlay.launchFailed", "Failed to start the game on the home PC"),
        );
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (sessionStartedRef.current && !stopSentRef.current) {
        stopSentRef.current = true;
        stopStreamingSession(streamHostIdRef.current);
      }
      try {
        popupRef.current?.close();
      } catch {
        // ignore
      }
      popupRef.current = null;
    };
  }, [gameId, executableName, t]);

  useEffect(() => {
    const onPageHide = () => {
      if (sessionStartedRef.current && !stopSentRef.current) {
        stopSentRef.current = true;
        stopStreamingSession(streamHostIdRef.current);
      }
      try {
        popupRef.current?.close();
      } catch {
        // ignore
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  // When Moonlight Exit closes the popup (window.close), end the MHG session too.
  useEffect(() => {
    if (embedMode !== "popup" || launchState !== "ready") return;
    const timer = window.setInterval(() => {
      const popup = popupRef.current;
      if (popup && popup.closed) {
        popupRef.current = null;
        endSessionAndLeave(true);
      }
    }, 400);
    return () => window.clearInterval(timer);
    // endSessionAndLeave is stable enough via refs; avoid re-subscribing every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedMode, launchState]);

  const iframeTitle = useMemo(
    () => t("streamPlay.iframeTitle", "Moonlight Web stream"),
    [t],
  );

  function handleBack() {
    endSessionAndLeave(true);
  }

  function handleIframeLoad(event: SyntheticEvent<HTMLIFrameElement>) {
    iframeLoadCountRef.current += 1;
    const frame = event.currentTarget;
    // First load is the stream itself.
    if (iframeLoadCountRef.current <= 1) return;

    // Same-origin (rare): leave if no longer on stream.html.
    try {
      const href = frame.contentWindow?.location?.href;
      if (href && moonlightWebUrl && isStillStreamUrl(href, moonlightWebUrl)) {
        return;
      }
    } catch {
      // Cross-origin: any later load means user navigated away (e.g. history.back).
    }
    endSessionAndLeave(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {t("streamPlay.title", "Remote play")}
          </h1>
          <p className="truncate text-sm text-white/70">
            {launchState === "launching"
              ? t("streamPlay.launching", "Starting the game on your home PC…")
              : launchState === "ready" && embedMode === "popup"
                ? t(
                    "streamPlay.popupHint",
                    "Streaming in a Moonlight Web window. Close that window or press Back to end the session.",
                  )
                : launchState === "ready"
                  ? t(
                      "streamPlay.readyHint",
                      "Game started. Streaming the home desktop via Moonlight Web…",
                    )
                  : t(
                      "streamPlay.setupHint",
                      "Requires Sunshine on the home PC and Moonlight Web reachable over HTTPS.",
                    )}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-white/25 px-3 py-2 text-sm hover:bg-white/10"
          onClick={handleBack}
        >
          {t("common.back", "Back")}
        </button>
      </header>

      {launchState === "error" && error && (
        <div className="mx-4 mt-4 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {launchState === "ready" && !sunshineReachable && (
        <div className="mx-4 mt-4 rounded-lg border border-amber-400/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          {t(
            "streamPlay.sunshineUnreachable",
            "Sunshine does not appear to be running on the home PC. Start Sunshine, then refresh Moonlight Web.",
          )}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {launchState === "launching" && (
          <div className="flex h-full min-h-[50vh] items-center justify-center text-white/70">
            {t("common.loading", "Loading...")}
          </div>
        )}
        {launchState === "ready" && embedMode === "popup" && (
          <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center text-white/80">
            <p>
              {t(
                "streamPlay.popupOpen",
                "Moonlight Web is open in another window. Use Exit there, or Back here, to stop the game and the stream.",
              )}
            </p>
            <button
              type="button"
              className="rounded-lg border border-white/25 px-4 py-2 text-sm hover:bg-white/10"
              onClick={() => {
                try {
                  popupRef.current?.focus();
                } catch {
                  // ignore
                }
              }}
            >
              {t("streamPlay.focusPopup", "Focus Moonlight window")}
            </button>
          </div>
        )}
        {launchState === "ready" && embedMode === "iframe" && moonlightWebUrl && (
          <iframe
            title={iframeTitle}
            src={moonlightWebUrl}
            className="absolute inset-0 h-full w-full border-0 bg-black"
            allow="autoplay; fullscreen; gamepad; microphone; camera; encrypted-media; display-capture"
            allowFullScreen
            onLoad={handleIframeLoad}
          />
        )}
      </div>
    </div>
  );
}
