import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { twitchLoginEnabled } = useSettings();
  
  // Check if we're in development mode (VITE_API_TOKEN is set)
  const DEV_TOKEN = import.meta.env.VITE_API_TOKEN || "";
  const isDevMode = DEV_TOKEN !== "";

  // Avoid blank screen while checking auth; show a simple loading fallback.
  if (isLoading) {
    return (
      <div className="bg-[#1a1a1a] text-white flex items-center justify-center app-content-wrapper">
        <div className="mhg-activity-spinner" aria-label="Loading">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            className="mhg-spinner-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </div>
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

