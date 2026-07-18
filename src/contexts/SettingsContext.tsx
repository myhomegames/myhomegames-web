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
import { getApiBase } from "../config";
import { buildApiHeaders } from "../utils/api";
import { clearLegacyCatalogCredentialStorage, isCatalogSearchEnabled } from "../utils/catalogApi";
import { useTunnel } from "./TunnelContext";
import {
  DEFAULT_SKIN_WEB_MANIFEST,
  normalizeSkinWebManifest,
  type SkinWebManifest,
} from "../skins/skinWebManifest";

interface SettingsContextType {
  twitchApiEnabled: boolean;
  setTwitchApiEnabled: (value: boolean) => void;
  /** True when IGDB API is enabled in server settings (credentials on API gateway). */
  catalogSearchEnabled: boolean;
  /** Sunshine + Moonlight Web remote play for non-local browsers. */
  remoteStreamingEnabled: boolean;
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
  const { featureEnabled, statusLoaded, tunnelReady } = useTunnel();
  const [twitchApiEnabled, setTwitchApiEnabled] = useState(false);
  const [remoteStreamingEnabled, setRemoteStreamingEnabled] = useState(false);
  const [skinWeb, setSkinWeb] = useState<SkinWebManifest>(DEFAULT_SKIN_WEB_MANIFEST);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
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
    const maxAttempts = 4;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const url = new URL("/settings", getApiBase());
        const res = await fetch(url.toString(), {
          headers: buildApiHeaders({ Accept: "application/json" }),
        });
        if (res.ok) {
          const data = await res.json();
          const serverApiEnabled = !!data.twitchApiEnabled;
          setTwitchApiEnabled(serverApiEnabled);
          setRemoteStreamingEnabled(!!data.remoteStreamingEnabled);
          applySkinWeb(data.skinWeb);
          clearLegacyCatalogCredentialStorage();
          return;
        }
      } catch (err) {
        if (attempt === maxAttempts - 1) {
          console.error("Failed to refresh settings:", err);
        }
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 800));
      }
    }
  }, [applySkinWeb]);

  const updateSkinWebFlags = useCallback(
    async (partial: Partial<SkinWebManifest>) => {
      const token = ++latestSkinWebUpdateRef.current;
      try {
        const url = new URL("/settings", getApiBase());
        const res = await fetch(url.toString(), {
          method: "PUT",
          headers: buildApiHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ skinWeb: partial }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json().catch(() => null);
        if (token === latestSkinWebUpdateRef.current && data?.settings?.skinWeb) {
          applySkinWeb(data.settings.skinWeb);
        }
      } catch (err) {
        console.error("Failed to update skin web flags:", err);
      }
    },
    [applySkinWeb]
  );

  useEffect(() => {
    if (featureEnabled && (!statusLoaded || !tunnelReady)) return;
    void refreshSettings().finally(() => {
      setSettingsLoaded(true);
    });
  }, [featureEnabled, statusLoaded, tunnelReady, refreshSettings]);

  useEffect(() => {
    const onApiBaseChanged = () => {
      void refreshSettings();
    };
    window.addEventListener("mhg-api-base-changed", onApiBaseChanged);
    return () => window.removeEventListener("mhg-api-base-changed", onApiBaseChanged);
  }, [refreshSettings]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (skinWeb.verticalCoverAlignment) {
      document.documentElement.setAttribute("data-mhg-vertical-cover-alignment", "true");
    } else {
      document.documentElement.removeAttribute("data-mhg-vertical-cover-alignment");
    }
  }, [skinWeb.verticalCoverAlignment]);

  const catalogSearchEnabled = useMemo(() => isCatalogSearchEnabled(twitchApiEnabled), [twitchApiEnabled]);

  return (
    <SettingsContext.Provider
      value={{
        twitchApiEnabled,
        setTwitchApiEnabled,
        catalogSearchEnabled,
        remoteStreamingEnabled,
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
