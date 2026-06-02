import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setTunnelApiBase } from "../config";
import {
  connectTunnel,
  disconnectTunnel,
  fetchTunnelStatus,
  fetchTunnelTokenFromManager,
  type TunnelStatus,
} from "../utils/tunnelApi";
import { clearTunnelApiBase } from "../config";

type TunnelContextValue = {
  status: TunnelStatus | null;
  statusLoaded: boolean;
  featureEnabled: boolean;
  tunnelReady: boolean;
  publicUrl: string;
  refreshStatus: () => Promise<void>;
  connectFromManager: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnecting: boolean;
  connectError: string | null;
};

const TunnelContext = createContext<TunnelContextValue | null>(null);

const DEV_TOKEN = (import.meta.env.VITE_API_TOKEN as string | undefined) || "";
const isDevMode = DEV_TOKEN !== "";

export function TunnelProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await fetchTunnelStatus();
      setStatus(next);
      if (next.publicUrl) {
        setTunnelApiBase(next.publicUrl);
      }
    } catch {
      setStatus({
        featureEnabled: false,
        hasStoredToken: false,
        connected: false,
        publicUrl: "",
      });
    } finally {
      setStatusLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const connectFromManager = useCallback(async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const { token, url } = await fetchTunnelTokenFromManager();
      const next = await connectTunnel(token, url);
      setStatus(next);
      setTunnelApiBase(url.startsWith("http") ? url : `https://${url}`);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectTunnel();
    clearTunnelApiBase();
    await refreshStatus();
  }, [refreshStatus]);

  const featureEnabled = Boolean(status?.featureEnabled) && !isDevMode;
  const tunnelReady =
    !featureEnabled || Boolean(status?.hasStoredToken || status?.connected);

  const value = useMemo(
    () => ({
      status,
      statusLoaded,
      featureEnabled,
      tunnelReady,
      publicUrl: status?.publicUrl || "",
      refreshStatus,
      connectFromManager,
      disconnect,
      isConnecting,
      connectError,
    }),
    [
      status,
      statusLoaded,
      featureEnabled,
      tunnelReady,
      refreshStatus,
      connectFromManager,
      disconnect,
      isConnecting,
      connectError,
    ],
  );

  return <TunnelContext.Provider value={value}>{children}</TunnelContext.Provider>;
}

export function useTunnel(): TunnelContextValue {
  const ctx = useContext(TunnelContext);
  if (!ctx) {
    throw new Error("useTunnel must be used within TunnelProvider");
  }
  return ctx;
}
