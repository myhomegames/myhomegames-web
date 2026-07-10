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

export function ServerConnectivityProvider({ children }: { children: ReactNode }) {
  const { settingsLoaded } = useSettings();
  const { statusLoaded } = useTunnel();
  const [connectivityLoaded, setConnectivityLoaded] = useState(false);
  const [serverReachable, setServerReachable] = useState(true);

  const check = useCallback(async () => {
    const ok = await probeServerReachable();
    setServerReachable(ok);
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
    void check();
  }, [settingsLoaded, statusLoaded, check]);

  useEffect(() => {
    const onApiBaseChanged = () => {
      setConnectivityLoaded(false);
      void check();
    };
    window.addEventListener("mhg-api-base-changed", onApiBaseChanged);
    return () => window.removeEventListener("mhg-api-base-changed", onApiBaseChanged);
  }, [check]);

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
