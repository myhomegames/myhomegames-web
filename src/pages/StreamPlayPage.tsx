import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getApiBase } from "../config";
import { buildApiHeaders } from "../utils/api";

type LaunchState = "idle" | "launching" | "ready" | "error";

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
        setMoonlightWebUrl(streamUrl);
        setSunshineReachable(!!data.sunshineReachable);
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
    };
  }, [gameId, executableName, t]);

  const iframeTitle = useMemo(
    () => t("streamPlay.iframeTitle", "Moonlight Web stream"),
    [t],
  );

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
              : launchState === "ready"
                ? t(
                    "streamPlay.readyHint",
                    "Game started. Connect with Moonlight Web below (stream the desktop to see it).",
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
          onClick={() => navigate(-1)}
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
        {launchState === "ready" && moonlightWebUrl && (
          <iframe
            title={iframeTitle}
            src={moonlightWebUrl}
            className="absolute inset-0 h-full w-full border-0 bg-black"
            allow="autoplay; fullscreen; gamepad; microphone; camera; encrypted-media; display-capture"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
