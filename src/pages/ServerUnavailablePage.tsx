import { useTranslation } from "react-i18next";
import { isLocalApiBase } from "../config";
import { useServerDownload } from "../hooks/useServerDownload";
import { isPhoneWithoutServerPackage, SERVER_OS_I18N_KEY } from "../utils/serverDownload";
import { isSmartTvBrowser } from "../utils/smartTv";

type ServerUnavailablePageProps = {
  onRetry: () => void;
};

export default function ServerUnavailablePage({ onRetry }: ServerUnavailablePageProps) {
  const { t } = useTranslation();
  const { url, os, loading: downloadsLoading, platformSpecific } = useServerDownload();
  const showDownload =
    isLocalApiBase() && !isPhoneWithoutServerPackage() && !isSmartTvBrowser();
  const platformLabel = t(SERVER_OS_I18N_KEY[os], os);

  const downloadLabel = platformSpecific
    ? t("serverUnavailable.downloadForPlatform", "Download for {{platform}}", {
        platform: platformLabel,
      })
    : t("serverUnavailable.download", "Download");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-lg rounded-xl border border-white/15 bg-black/45 p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="mb-3 text-2xl font-semibold leading-tight">
          {t("serverUnavailable.title", "MyHomeGames server is not reachable")}
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-white/75">
          {t(
            "serverUnavailable.message",
            "The web app cannot connect to the server. Install and start it, or verify it is running, then retry.",
          )}
        </p>

        {showDownload && (
          <div className="mb-6 flex flex-col gap-2">
            <p className="text-sm text-white/75">
              {t("serverUnavailable.downloadHint", "Download the server for your platform:")}
            </p>
            {downloadsLoading ? (
              <p className="text-sm text-white/60">{t("common.loading", "Loading...")}</p>
            ) : (
              <>
                <a
                  className="inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {downloadLabel}
                </a>
                <code className="break-all text-xs text-white/60">{url}</code>
              </>
            )}
          </div>
        )}

        <div>
          <button
            type="button"
            className="rounded-lg border border-white/25 px-4 py-2 text-sm font-medium text-white transition hover:border-white/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onRetry}
          >
            {t("serverUnavailable.retry", "Retry connection")}
          </button>
        </div>
      </div>
    </div>
  );
}
