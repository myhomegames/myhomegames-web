import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { API_BASE } from "../config";
import { buildApiHeaders } from "../utils/api";

interface SettingsContextType {
  twitchLoginEnabled: boolean;
  setTwitchLoginEnabled: (value: boolean) => void;
  twitchClientId: string;
  twitchClientSecret: string;
  refreshSettings: () => Promise<void>;
  settingsLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [twitchLoginEnabled, setTwitchLoginEnabled] = useState(false);
  const [twitchClientId, setTwitchClientId] = useState("");
  const [twitchClientSecret, setTwitchClientSecret] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const refreshSettings = useCallback(async () => {
    try {
      const url = new URL("/settings", API_BASE);
      const res = await fetch(url.toString(), {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (res.ok) {
        const data = await res.json();
        setTwitchLoginEnabled(!!data.twitchLoginEnabled);
        const serverClientId = typeof data.twitchClientId === "string" ? data.twitchClientId : "";
        const serverClientSecret = typeof data.twitchClientSecret === "string" ? data.twitchClientSecret : "";
        setTwitchClientId(serverClientId);
        setTwitchClientSecret(serverClientSecret);
        // Keep localStorage in sync for existing code paths that still read from it.
        if (serverClientId) localStorage.setItem("twitch_client_id", serverClientId);
        else localStorage.removeItem("twitch_client_id");
        if (serverClientSecret) localStorage.setItem("twitch_client_secret", serverClientSecret);
        else localStorage.removeItem("twitch_client_secret");
      }
    } catch (err) {
      console.error("Failed to refresh settings:", err);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  // Load settings as soon as the app mounts (don't wait for auth)
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <SettingsContext.Provider
      value={{
        twitchLoginEnabled,
        setTwitchLoginEnabled,
        twitchClientId,
        twitchClientSecret,
        refreshSettings,
        settingsLoaded,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (ctx === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
