import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { API_BASE } from "../config";
import { buildApiHeaders } from "../utils/api";
import {
  DEFAULT_SKIN_WEB_MANIFEST,
  normalizeSkinWebManifest,
  type SkinWebManifest,
} from "../skins/skinWebManifest";

interface SettingsContextType {
  twitchLoginEnabled: boolean;
  setTwitchLoginEnabled: (value: boolean) => void;
  twitchClientId: string;
  twitchClientSecret: string;
  /**
   * Effective skin web flags as persisted in the server settings. Initialized from the active
   * skin's skin.json whenever the active skin changes, and from user toggles in the Settings
   * page afterwards. Use this instead of reading from the skin list when deciding what the SPA
   * should render.
   */
  skinWeb: SkinWebManifest;
  /**
   * Persist a partial update of `skinWeb`. Unknown keys are dropped server-side; the server
   * returns the merged manifest, which we then re-apply locally and via `refreshSettings()`.
   */
  updateSkinWebFlags: (partial: Partial<SkinWebManifest>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  settingsLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [twitchLoginEnabled, setTwitchLoginEnabled] = useState(false);
  const [twitchClientId, setTwitchClientId] = useState("");
  const [twitchClientSecret, setTwitchClientSecret] = useState("");
  const [skinWeb, setSkinWeb] = useState<SkinWebManifest>(DEFAULT_SKIN_WEB_MANIFEST);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  /*
   * Used by `updateSkinWebFlags` to avoid losing a newer response under a concurrent
   * refreshSettings(). Each PUT bumps the counter; only the latest wins.
   */
  const latestSkinWebUpdateRef = useRef(0);

  const applySkinWeb = useCallback((raw: unknown) => {
    const next = normalizeSkinWebManifest(raw);
    setSkinWeb((prev) => {
      const keys = Object.keys(next) as (keyof SkinWebManifest)[];
      const unchanged = keys.every((k) => prev[k] === next[k]);
      return unchanged ? prev : next;
    });
  }, []);

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
        applySkinWeb(data.skinWeb);
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
  }, [applySkinWeb]);

  const updateSkinWebFlags = useCallback(
    async (partial: Partial<SkinWebManifest>) => {
      const token = ++latestSkinWebUpdateRef.current;
      try {
        const url = new URL("/settings", API_BASE);
        const res = await fetch(url.toString(), {
          method: "PUT",
          headers: buildApiHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ skinWeb: partial }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json().catch(() => null);
        /*
         * The server already normalizes and persists the merged manifest. If a newer
         * updateSkinWebFlags was issued while this one was in flight, ignore this response so
         * we don't overwrite the newer state. `refreshSettings` further down re-syncs anyway.
         */
        if (token === latestSkinWebUpdateRef.current && data?.settings?.skinWeb) {
          applySkinWeb(data.settings.skinWeb);
        }
      } catch (err) {
        console.error("Failed to update skin web flags:", err);
      }
    },
    [applySkinWeb]
  );

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
        skinWeb,
        updateSkinWebFlags,
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
