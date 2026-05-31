// contexts/AuthContext.tsx
// Authentication context for Twitch OAuth

import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { API_BASE, updateApiToken } from "../config";
import { setUnauthorizedHandler } from "../utils/unauthorizedInterceptor";
import { buildApiHeaders } from "../utils/api";
import { useSettings } from "./SettingsContext";

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
  const { twitchLoginEnabled, twitchApiEnabled, settingsLoaded } = useSettings();

  // Check authentication status
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const twitchToken = urlParams.get("twitch_token");
      const userId = urlParams.get("user_id");

      if (twitchToken && userId) {
        localStorage.setItem("twitch_token", twitchToken);
        localStorage.setItem("twitch_user_id", userId);
        window.history.replaceState({}, document.title, window.location.pathname);
        const success = await fetchUserInfo(twitchToken);
        if (success) {
          return;
        }
      }

      const storedToken = localStorage.getItem("twitch_token");
      if (storedToken) {
        const success = await fetchUserInfo(storedToken);
        if (success) {
          return;
        }
        localStorage.removeItem("twitch_token");
        localStorage.removeItem("twitch_user_id");
      }

      if (DEV_TOKEN && DEV_TOKEN !== "") {
        localStorage.clear();
        await fetchUserInfo(DEV_TOKEN);
        return;
      }

      setUser(null);
      setToken(null);
    } catch (error) {
      console.error("Auth check error:", error);
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

  const fetchUserInfo = async (authToken: string): Promise<boolean> => {
    const isDevToken = DEV_TOKEN && authToken === DEV_TOKEN;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 90000);
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: buildApiHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken(authToken);
        updateApiToken();
        return true;
      }

      const errorText = await response.text().catch(() => "");
      console.error(`Failed to validate token: ${response.status} ${errorText}`);

      if (!isDevToken) {
        localStorage.removeItem("twitch_token");
        localStorage.removeItem("twitch_user_id");
        setUser(null);
        setToken(null);
        return false;
      }

      setToken(authToken);
      setUser({
        userId: "dev",
        userName: "Development User",
        userImage: null,
        isDev: true,
      });
      updateApiToken();
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Failed to fetch user info:", error);
      if (!isDevToken) {
        localStorage.removeItem("twitch_token");
        localStorage.removeItem("twitch_user_id");
        setUser(null);
        setToken(null);
        return false;
      }
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
  };

  const login = async (forceVerify = false) => {
    if (!twitchApiEnabled) {
      return;
    }

    try {
      const basePath = import.meta.env.BASE || "/";
      const frontendUrl = `${window.location.origin}${basePath.startsWith("/") ? basePath : `/${basePath}`}`;

      const response = await fetch(`${API_BASE}/auth/twitch`, {
        method: "POST",
        headers: buildApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          forceVerify: Boolean(forceVerify),
          frontendUrl,
        }),
      });

      if (response.ok) {
        const data = await response.json();
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
      const isFetchError =
        errorMessage === "Failed to fetch" ||
        errorMessage?.toLowerCase().includes("network") ||
        errorMessage?.toLowerCase().includes("fetch");
      if (isFetchError) {
        window.location.href = API_BASE.replace(/\/$/, "");
      } else {
        alert(`Errore durante il login: ${errorMessage}`);
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("twitch_token");
    localStorage.removeItem("twitch_user_id");
    setUser(null);
    setToken(null);
    updateApiToken();

    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: buildApiHeaders(),
      }).catch(console.error);
    }
  };

  useEffect(() => {
    if (!settingsLoaded) return;
    checkAuth();
  }, [settingsLoaded]);

  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!twitchLoginEnabled) return;
      logoutRef.current();
      window.location.href = API_BASE.replace(/\/$/, "");
    });
  }, [twitchLoginEnabled]);

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
