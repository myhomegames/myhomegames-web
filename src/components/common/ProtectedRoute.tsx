import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useTunnel } from "../../contexts/TunnelContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const { twitchLoginEnabled, settingsLoaded } = useSettings();
  const {
    featureEnabled,
    tunnelReady,
    statusLoaded,
    status,
    isConnecting,
    connectError,
  } = useTunnel();

  const DEV_TOKEN = import.meta.env.VITE_API_TOKEN || "";
  const isDevMode = DEV_TOKEN !== "";

  if (isLoading || !settingsLoaded || !statusLoaded) {
    return null;
  }

  if (featureEnabled && !tunnelReady) {
    const showLead = !status?.connected && !isConnecting;
    const errorMessage = connectError;
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-medium">
          {showLead ? t("tunnel.lead") : t("tunnel.connecting")}
        </p>
        {errorMessage ? (
          <p className="max-w-md text-sm text-red-400">{errorMessage}</p>
        ) : null}
      </div>
    );
  }

  // In dev mode, allow access even without user (VITE_API_TOKEN will be used)
  // When Twitch login is disabled, allow access without auth (user cannot log in anyway)
  // When Twitch login is enabled, redirect to login if not authenticated
  if (!isDevMode && !user && twitchLoginEnabled) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

