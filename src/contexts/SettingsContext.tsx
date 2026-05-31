import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import { API_BASE } from "../config";
import { buildApiHeaders } from "../utils/api";
import { clearLegacyIgdbCredentialStorage, isIgdbApiEnabled } from "../utils/igdbApi";
import {
  DEFAULT_SKIN_WEB_MANIFEST,
  normalizeSkinWebManifest,
  type SkinWebManifest,
} from "../skins/skinWebManifest";

interface SettingsContextType {
  twitchLoginEnabled: boolean;
  setTwitchLoginEnabled: (value: boolean) => void;
  twitchApiEnabled: boolean;
  setTwitchApiEnabled: (value: boolean) => void;
  /** True when IGDB API is enabled in server settings (credentials on API gateway). */
  igdbEnabled: boolean;
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
  const [twitchApiEnabled, setTwitchApiEnabled] = useState(false);
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
        const serverApiEnabled = !!data.twitchApiEnabled;
        setTwitchApiEnabled(serverApiEnabled);
        applySkinWeb(data.skinWeb);
        clearLegacyIgdbCredentialStorage();
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

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (skinWeb.verticalCoverAlignment) {
      document.documentElement.setAttribute("data-mhg-vertical-cover-alignment", "true");
    } else {
      document.documentElement.removeAttribute("data-mhg-vertical-cover-alignment");
    }
  }, [skinWeb.verticalCoverAlignment]);

  const igdbEnabled = useMemo(() => isIgdbApiEnabled(twitchApiEnabled), [twitchApiEnabled]);

  return (
    <SettingsContext.Provider
      value={{
        twitchLoginEnabled,
        setTwitchLoginEnabled,
        twitchApiEnabled,
        setTwitchApiEnabled,
        igdbEnabled,
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
