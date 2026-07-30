import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useSettings } from "./SettingsContext";
import { useTunnel } from "./TunnelContext";
import { probeServerReachable } from "../utils/serverConnectivity";

type ServerConnectivityContextType = {
  connectivityLoaded: boolean;
  serverReachable: boolean;
  retry: () => Promise<void>;
};

const ServerConnectivityContext = createContext<ServerConnectivityContextType | undefined>(
  undefined,
);

const PROBE_ATTEMPTS = 4;
const PROBE_RETRY_MS = 800;

export function ServerConnectivityProvider({ children }: { children: ReactNode }) {
  const { settingsLoaded } = useSettings();
  const { statusLoaded, featureEnabled, tunnelReady } = useTunnel();
  const [connectivityLoaded, setConnectivityLoaded] = useState(false);
  const [serverReachable, setServerReachable] = useState(true);
  const [apiBaseEpoch, setApiBaseEpoch] = useState(0);

  const check = useCallback(async () => {
    for (let attempt = 0; attempt < PROBE_ATTEMPTS; attempt++) {
      const ok = await probeServerReachable();
      if (ok) {
        setServerReachable(true);
        setConnectivityLoaded(true);
        return;
      }
      if (attempt < PROBE_ATTEMPTS - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, PROBE_RETRY_MS));
      }
    }
    setServerReachable(false);
    setConnectivityLoaded(true);
  }, []);

  const retry = useCallback(async () => {
    const ok = await probeServerReachable();
    if (ok) {
      window.location.reload();
      return;
    }
    setServerReachable(false);
    setConnectivityLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded || !statusLoaded) return;
    // After device pairing / first connect, wait for Cloudflare edge warmup (tunnelReady).
    if (featureEnabled && !tunnelReady) {
      setConnectivityLoaded(false);
      return;
    }
    void check();
  }, [settingsLoaded, statusLoaded, featureEnabled, tunnelReady, apiBaseEpoch, check]);

  useEffect(() => {
    const onApiBaseChanged = () => {
      // Do not probe here: the public URL is often not routable yet. Reset and let the
      // tunnelReady-gated effect above re-check once the tunnel is ready.
      setConnectivityLoaded(false);
      setApiBaseEpoch((n) => n + 1);
    };
    window.addEventListener("mhg-api-base-changed", onApiBaseChanged);
    return () => window.removeEventListener("mhg-api-base-changed", onApiBaseChanged);
  }, []);

  const value = useMemo(
    () => ({
      connectivityLoaded,
      serverReachable,
      retry,
    }),
    [connectivityLoaded, serverReachable, retry],
  );

  return (
    <ServerConnectivityContext.Provider value={value}>
      {children}
    </ServerConnectivityContext.Provider>
  );
}

export function useServerConnectivity(): ServerConnectivityContextType {
  const ctx = useContext(ServerConnectivityContext);
  if (ctx === undefined) {
    throw new Error("useServerConnectivity must be used within a ServerConnectivityProvider");
  }
  return ctx;
}
