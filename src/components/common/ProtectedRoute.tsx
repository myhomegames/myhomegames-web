import { useSettings } from "../../contexts/SettingsContext";
import { useTunnel } from "../../contexts/TunnelContext";
import { useAuth } from "../../contexts/AuthContext";
import { useServerConnectivity } from "../../contexts/ServerConnectivityContext";
import ServerUnavailablePage from "../../pages/ServerUnavailablePage";
import DevicePairingPage from "../../pages/DevicePairingPage";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading } = useAuth();
  const { settingsLoaded } = useSettings();
  const { statusLoaded, needsDevicePairing, featureEnabled } = useTunnel();
  const {
    connectivityLoaded,
    serverReachable,
    retry,
  } = useServerConnectivity();

  if (featureEnabled && needsDevicePairing) {
    return <DevicePairingPage />;
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
