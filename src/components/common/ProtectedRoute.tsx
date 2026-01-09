import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  // Check if we're in development mode (VITE_API_TOKEN is set)
  const DEV_TOKEN = import.meta.env.VITE_API_TOKEN || "";
  const isDevMode = DEV_TOKEN !== "";

  // Show loading state while checking auth (spinner is handled by Header)
  if (isLoading) {
    return null;
  }

  // In dev mode, allow access even without user (VITE_API_TOKEN will be used)
  // In production mode, redirect to login if not authenticated
  if (!isDevMode && !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

