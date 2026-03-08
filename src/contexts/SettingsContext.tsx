import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { API_BASE } from "../config";
import { buildApiHeaders } from "../utils/api";

interface SettingsContextType {
  twitchLoginEnabled: boolean;
  setTwitchLoginEnabled: (value: boolean) => void;
  refreshSettings: () => Promise<void>;
  settingsLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [twitchLoginEnabled, setTwitchLoginEnabled] = useState(false);
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
      value={{ twitchLoginEnabled, setTwitchLoginEnabled, refreshSettings, settingsLoaded }}
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
