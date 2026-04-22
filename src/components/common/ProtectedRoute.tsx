import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { twitchLoginEnabled, settingsLoaded } = useSettings();
  
  // Check if we're in development mode (VITE_API_TOKEN is set)
  const DEV_TOKEN = import.meta.env.VITE_API_TOKEN || "";
  const isDevMode = DEV_TOKEN !== "";

  if (isLoading || !settingsLoaded) {
    return null;
  }

  // In dev mode, allow access even without user (VITE_API_TOKEN will be used)
  // When Twitch login is disabled, allow access without auth (user cannot log in anyway)
  // When Twitch login is enabled, redirect to login if not authenticated
  if (!isDevMode && !user && twitchLoginEnabled) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

