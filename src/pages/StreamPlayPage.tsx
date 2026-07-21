import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getApiBase, getApiToken } from "../config";
import { buildApiHeaders } from "../utils/api";

type LaunchState = "idle" | "launching" | "ready" | "error";

const MOONLIGHT_POPUP_NAME = "mhg-moonlight-stream";
const MHG_MOONLIGHT_EXIT_MESSAGE = "mhg-moonlight-exit";

function buildStopStreamingUrl(opts: {
  hostId: number | null;
  gameId: string | undefined;
  executableName?: string;
}): string {
  const url = new URL("/streaming/stop", getApiBase());
  if (opts.hostId != null && Number.isFinite(opts.hostId)) {
    url.searchParams.set("hostId", String(opts.hostId));
  }
  if (opts.gameId) url.searchParams.set("gameId", opts.gameId);
  if (opts.executableName) url.searchParams.set("executableName", opts.executableName);
  const token = getApiToken();
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

/** Where Moonlight should send the user if window.close() is ignored (common on mobile). */
function buildMoonlightReturnUrl(gameId: string | undefined): string {
  const base = String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (gameId) {
    return `${window.location.origin}${base}/game/${encodeURIComponent(gameId)}`;
  }
  return `${window.location.origin}${base || ""}/` || `${window.location.origin}/`;
}

function stopStreamingSession(opts: {
  hostId: number | null;
  gameId: string | undefined;
  executableName?: string;
}): Promise<void> {
  const url = new URL("/streaming/stop", getApiBase());
  const headers = buildApiHeaders({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  const body = JSON.stringify({
    ...(opts.hostId != null && Number.isFinite(opts.hostId) ? { hostId: opts.hostId } : {}),
    ...(opts.gameId ? { gameId: opts.gameId } : {}),
    ...(opts.executableName ? { executableName: opts.executableName } : {}),
  });

  // Prefer a real awaited fetch so the home PC receives stop before we navigate away.
  // Fall back to keepalive/beacon for unload paths.
  const sendKeepalive = () => {
    void fetch(url.toString(), {
      method: "POST",
      headers,
      body,
      keepalive: true,
    }).catch(() => {});
    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url.toString(), blob);
      }
    } catch {
      // ignore
    }
  };

  return fetch(url.toString(), {
    method: "POST",
    headers,
    body,
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => {
      sendKeepalive();
    });
}

function withMoonlightStopHook(streamUrl: string, stopUrl: string, returnUrl?: string): string {
  try {
    const url = new URL(streamUrl);
    url.searchParams.set("mhgStop", stopUrl);
    if (returnUrl) url.searchParams.set("mhgReturn", returnUrl);
    return url.toString();
  } catch {
    return streamUrl;
  }
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
    const doStop = () => {
      if (sessionStartedRef.current && !stopSentRef.current) {
        stopSentRef.current = true;
        return stopStreamingSession({
          hostId: streamHostIdRef.current,
          gameId,
          executableName,
        });
      }
      return Promise.resolve();
    };
    try {
      popupRef.current?.close();
    } catch {
      // ignore
    }
    popupRef.current = null;

    void doStop().finally(() => {
      if (navigateBack) navigate(-1);
    });
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
        const resolvedHostId = Number.isFinite(hostId as number) ? (hostId as number) : null;
        setStreamHostId(resolvedHostId);
        const stopUrl = buildStopStreamingUrl({
          hostId: resolvedHostId,
          gameId,
          executableName,
        });
        const returnUrl = buildMoonlightReturnUrl(gameId);
        const finalStreamUrl = withMoonlightStopHook(streamUrl, stopUrl, returnUrl);
        setMoonlightWebUrl(finalStreamUrl);
        setSunshineReachable(!!data.sunshineReachable);
        sessionStartedRef.current = true;

        // Prefer a popup: Moonlight "Exit stream" calls window.close(), which works in a
        // script-opened window but is a no-op inside an iframe.
        const popup = window.open(finalStreamUrl, MOONLIGHT_POPUP_NAME);
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
        void stopStreamingSession({
          hostId: streamHostIdRef.current,
          gameId,
          executableName,
        });
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
        void stopStreamingSession({
          hostId: streamHostIdRef.current,
          gameId,
          executableName,
        });
      }
      try {
        popupRef.current?.close();
      } catch {
        // ignore
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [gameId, executableName]);

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

  // Mobile often ignores window.close(); Moonlight posts this so the MHG tab can leave.
  useEffect(() => {
    if (launchState !== "ready") return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if ((data as { type?: string }).type !== MHG_MOONLIGHT_EXIT_MESSAGE) return;
      try {
        popupRef.current?.close();
      } catch {
        // ignore
      }
      popupRef.current = null;
      endSessionAndLeave(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchState]);

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
