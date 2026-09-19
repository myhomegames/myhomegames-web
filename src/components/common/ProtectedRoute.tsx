import { useSettings } from "../../contexts/SettingsContext";
import { useTunnel } from "../../contexts/TunnelContext";
import { useAuth } from "../../contexts/AuthContext";
import { useServerConnectivity } from "../../contexts/ServerConnectivityContext";
import { clearTunnelApiBase } from "../../config";
import ServerUnavailablePage from "../../pages/ServerUnavailablePage";
import DevicePairingPage from "../../pages/DevicePairingPage";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading } = useAuth();
  const { settingsLoaded } = useSettings();
  const {
    statusLoaded,
    needsDevicePairing,
    featureEnabled,
    tunnelReady,
    isConnecting,
    warmupPending,
    connectError,
  } = useTunnel();
  const {
    connectivityLoaded,
    serverReachable,
    retry,
  } = useServerConnectivity();

  if (featureEnabled && needsDevicePairing) {
    return <DevicePairingPage />;
  }

  // Stay blank while connect / Cloudflare edge warmup is in progress, or while
  // auto-connect has not finished yet (e.g. redirecting to Access).
  if (featureEnabled && !tunnelReady) {
    if (isConnecting || warmupPending || !connectError) {
      return null;
    }
    // Access login / reconnect finished but home tunnel is not up (typical first
    // visit before installing the server package).
    return (
      <ServerUnavailablePage
        onRetry={() => {
          clearTunnelApiBase();
          window.location.reload();
        }}
      />
    );
  }

  if (isLoading || !settingsLoaded || !statusLoaded || !connectivityLoaded) {
    return null;
  }

  if (!serverReachable) {
    return (
      <ServerUnavailablePage
        onRetry={() => {
          void retry();
        }}
      />
    );
  }

  return <>{children}</>;
}
