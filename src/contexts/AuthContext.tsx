// contexts/AuthContext.tsx
// Authentication context for Twitch OAuth

import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { API_BASE, updateApiToken } from "../config";
import { setUnauthorizedHandler } from "../utils/unauthorizedInterceptor";

interface User {
  userId: string;
  userName: string;
  userImage: string | null;
  isDev: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (forceVerify?: boolean) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_TOKEN = import.meta.env.VITE_API_TOKEN || "";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // Check if there's a Twitch token in URL (from OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const twitchToken = urlParams.get("twitch_token");
      const userId = urlParams.get("user_id");

      if (twitchToken && userId) {
        // Save token to localStorage
        localStorage.setItem("twitch_token", twitchToken);
        localStorage.setItem("twitch_user_id", userId);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Fetch user info
        const success = await fetchUserInfo(twitchToken);
        // If validation succeeded, return
        if (success) {
          return;
        }
        // If validation failed, continue to check dev token
      }

      // Check localStorage for Twitch token
      const storedToken = localStorage.getItem("twitch_token");
      if (storedToken) {
        // Check if we have client_id (required for Twitch token validation)
        const clientId = localStorage.getItem("twitch_client_id");
        if (!clientId) {
          // No client_id means we can't validate the Twitch token
          // Clear it and continue to check dev token
          localStorage.removeItem("twitch_token");
          localStorage.removeItem("twitch_user_id");
        } else {
          const success = await fetchUserInfo(storedToken);
          // If validation succeeded, return
          if (success) {
            return;
          }
          // If validation failed, clear it and continue to check dev token
          localStorage.removeItem("twitch_token");
          localStorage.removeItem("twitch_user_id");
        }
      }

      // Fallback to development token if available
      if (DEV_TOKEN && DEV_TOKEN !== "") {
        // Clear entire localStorage when using dev token to avoid conflicts
        localStorage.clear();
        // Verify dev token with server by calling /auth/me
        await fetchUserInfo(DEV_TOKEN);
        return;
      }

      // No authentication
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error("Auth check error:", error);
      // Try dev token as last resort if available
      if (DEV_TOKEN && DEV_TOKEN !== "") {
        await fetchUserInfo(DEV_TOKEN);
      } else {
        setUser(null);
        setToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user info from server
  // Returns true if authentication succeeded, false otherwise
  const fetchUserInfo = async (authToken: string): Promise<boolean> => {
    // Get clientId from localStorage for Twitch token validation
    const clientId = localStorage.getItem("twitch_client_id");
    
    // Check if this is a dev token (don't require clientId for dev tokens)
    const isDevToken = DEV_TOKEN && authToken === DEV_TOKEN;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const headers: Record<string, string> = {
        "X-Auth-Token": authToken,
      };
      
      // Add clientId header if available (required for Twitch token validation)
      // Don't add it for dev tokens if not available
      if (clientId && !isDevToken) {
        headers["X-Twitch-Client-Id"] = clientId;
      }

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 90000);
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken(authToken);
        updateApiToken();
        return true;
      } else {
        // Token invalid
        const errorText = await response.text().catch(() => "");
        console.error(`Failed to validate token: ${response.status} ${errorText}`);
        
        // Only clear localStorage if this is a Twitch token (not a dev token)
        if (!isDevToken) {
          localStorage.removeItem("twitch_token");
          localStorage.removeItem("twitch_user_id");
          setUser(null);
          setToken(null);
          return false;
        } else {
          // For dev tokens, if validation fails, still set the token and user
          // This allows development to continue even if server validation fails
          setToken(authToken);
          setUser({
            userId: "dev",
            userName: "Development User",
            userImage: null,
            isDev: true,
          });
          updateApiToken();
          return true;
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Failed to fetch user info:", error);
      // Only clear localStorage if this is a Twitch token (not a dev token)
      if (!isDevToken) {
        localStorage.removeItem("twitch_token");
        localStorage.removeItem("twitch_user_id");
        setUser(null);
        setToken(null);
        return false;
      } else {
        // For dev tokens, if fetch fails (network error, etc.), still set the token and user
        // This allows development to continue even if server is unreachable
        setToken(authToken);
        setUser({
          userId: "dev",
          userName: "Development User",
          userImage: null,
          isDev: true,
        });
        updateApiToken();
        return true;
      }
    }
  };

  // Initiate Twitch login
  const login = async (forceVerify = false) => {
    // Get credentials from localStorage
    const clientId = localStorage.getItem("twitch_client_id");
    const clientSecret = localStorage.getItem("twitch_client_secret");
    
    if (!clientId || !clientSecret) {
      // Don't show alert - let the LoginPage handle it
      // The LoginPage will show the credentials form
      return;
    }
    
    try {
      // Ensure we have valid string values
      const cleanClientId = String(clientId).trim();
      const cleanClientSecret = String(clientSecret).trim();
      const cleanForceVerify = Boolean(forceVerify);
      
      const requestBody = {
        clientId: cleanClientId,
        clientSecret: cleanClientSecret,
        forceVerify: cleanForceVerify,
      };
      
      const response = await fetch(`${API_BASE}/auth/twitch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to Twitch OAuth
        window.location.href = data.authUrl;
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        alert(`Errore durante il login: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Si è verificato un errore sconosciuto";
      // "Failed to fetch" or network errors: redirect to server (same as first-time app load)
      // This helps when frontend (e.g. Vite dev) cannot reach API due to CORS/network
      const isFetchError = errorMessage === "Failed to fetch" ||
        errorMessage?.toLowerCase().includes("network") ||
        errorMessage?.toLowerCase().includes("fetch");
      if (isFetchError) {
        const serverUrl = API_BASE.replace(/\/$/, "");
        window.location.href = serverUrl;
      } else {
        if (error instanceof Error) {
          alert(`Errore durante il login: ${errorMessage}`);
        } else {
          alert(`Errore durante il login: ${errorMessage}`);
        }
      }
    }
  };

  // Logout
  const logout = () => {
    // Remove all Twitch-related data
    localStorage.removeItem("twitch_token");
    localStorage.removeItem("twitch_user_id");
    localStorage.removeItem("twitch_client_id");
    localStorage.removeItem("twitch_client_secret");
    setUser(null);
    setToken(null);
    updateApiToken();
    
    // Call logout endpoint
    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: {
          "X-Auth-Token": token,
        },
      }).catch(console.error);
    }
  };

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Global 401 handling: invalidate session and redirect to server (login)
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logoutRef.current();
      const serverUrl = API_BASE.replace(/\/$/, "");
      window.location.href = serverUrl;
    });
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

