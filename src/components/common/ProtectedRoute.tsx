import { useSettings } from "../../contexts/SettingsContext";
import { useTunnel } from "../../contexts/TunnelContext";
import { useAuth } from "../../contexts/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading } = useAuth();
  const { settingsLoaded } = useSettings();
  const { statusLoaded } = useTunnel();

  if (isLoading || !settingsLoaded || !statusLoaded) {
    return null;
  }

  return <>{children}</>;
}
