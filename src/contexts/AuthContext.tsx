// contexts/AuthContext.tsx — optional VITE_API_TOKEN for development

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { updateApiToken } from "../config";
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
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_TOKEN = import.meta.env.VITE_API_TOKEN || "";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { settingsLoaded } = useSettings();

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      if (DEV_TOKEN) {
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

      setUser(null);
      setToken(null);
      updateApiToken();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    updateApiToken();
  };

  useEffect(() => {
    if (!settingsLoaded) return;
    void checkAuth();
  }, [settingsLoaded]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
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
