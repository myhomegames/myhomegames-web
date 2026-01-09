// contexts/AuthContext.tsx
// Authentication context for Twitch OAuth

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { API_BASE, updateApiToken } from "../config";

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
  login: () => void;
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
      await fetchUserInfo(twitchToken);
      updateApiToken();
      return;
    }

    // Check localStorage for Twitch token
    const storedToken = localStorage.getItem("twitch_token");
    if (storedToken) {
      await fetchUserInfo(storedToken);
      updateApiToken();
      return;
    }

    // Fallback to development token if available
    if (DEV_TOKEN && DEV_TOKEN !== "") {
      setToken(DEV_TOKEN);
      setUser({
        userId: "dev",
        userName: "Development User",
        userImage: null,
        isDev: true,
      });
      updateApiToken();
      return;
    }

      // No authentication
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user info from server
  const fetchUserInfo = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          "X-Auth-Token": authToken,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken(authToken);
      } else {
        // Token invalid, clear it
        localStorage.removeItem("twitch_token");
        localStorage.removeItem("twitch_user_id");
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error);
      setUser(null);
      setToken(null);
    }
  };

  // Initiate Twitch login
  const login = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/twitch`);
      if (response.ok) {
        const data = await response.json();
        // Redirect to Twitch OAuth
        window.location.href = data.authUrl;
      } else {
        console.error("Failed to initiate login");
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("twitch_token");
    localStorage.removeItem("twitch_user_id");
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

