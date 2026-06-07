import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clearTunnelApiBase, syncTunnelApiBaseFromStatus } from "../config";
import {
  clearStashedTunnelPayload,
  clearTunnelReturnHash,
  connectTunnel,
  disconnectTunnel,
  fetchTunnelStatus,
  fetchTunnelTokenFromManager,
  getTunnelManagerAuthUrl,
  readTunnelPayloadFromReturn,
  reconnectTunnel,
  type TunnelStatus,
} from "../utils/tunnelApi";

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
  warmupPending: boolean;
  connectError: string | null;
};

const TunnelContext = createContext<TunnelContextValue | null>(null);

const TUNNEL_AUTH_SESSION_KEY = "mhg_tunnel_auth_redirect";
/** Brief pause after first connect so Cloudflare edge routing can settle before SPA API calls. */
const PUBLIC_API_WARMUP_MS = 2500;

function readTunnelAuthFromUrl(): "ok" | "error" | null {
  if (typeof window === "undefined") return null;
  const auth = new URLSearchParams(window.location.search).get("tunnel_auth");
  if (auth === "ok" || auth === "error") return auth;
  return null;
}

export function TunnelProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [warmupPending, setWarmupPending] = useState(false);
  const tunnelPayloadRef = useRef(readTunnelPayloadFromReturn());
  const returnedFromAuthRef = useRef(readTunnelAuthFromUrl() === "ok");
  const autoConnectInFlightRef = useRef(false);
  const tunnelWasConnectedOnLoadRef = useRef<boolean | null>(null);
  const warmupTimerRef = useRef<number | undefined>(undefined);

  const clearTunnelAuthQuery = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("tunnel_auth") && !params.has("reason")) return null;
    const reason = params.get("reason");
    params.delete("tunnel_auth");
    params.delete("reason");
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState({}, document.title, next);
    return reason;
  }, []);

  const clearWarmupTimer = useCallback(() => {
    if (warmupTimerRef.current !== undefined) {
      window.clearTimeout(warmupTimerRef.current);
      warmupTimerRef.current = undefined;
    }
  }, []);

  const schedulePublicApiWarmup = useCallback(() => {
    clearWarmupTimer();
    setWarmupPending(true);
    warmupTimerRef.current = window.setTimeout(() => {
      warmupTimerRef.current = undefined;
      setWarmupPending(false);
    }, PUBLIC_API_WARMUP_MS);
  }, [clearWarmupTimer]);

  const applyTunnelStatus = useCallback(
    (next: TunnelStatus, options?: { warmupAfterConnect?: boolean }) => {
      setStatus(next);
      syncTunnelApiBaseFromStatus(next);
      if (options?.warmupAfterConnect && next.connected) {
        schedulePublicApiWarmup();
      }
    },
    [schedulePublicApiWarmup],
  );

  const redirectToManagerForAuth = useCallback(() => {
    try {
      sessionStorage.setItem(TUNNEL_AUTH_SESSION_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    window.location.assign(getTunnelManagerAuthUrl());
  }, []);

  const connectWithPayload = useCallback(async (token: string, url: string): Promise<TunnelStatus> => {
    return connectTunnel(token, url);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await fetchTunnelStatus();
      if (tunnelWasConnectedOnLoadRef.current === null) {
        tunnelWasConnectedOnLoadRef.current = next.connected;
      }
      applyTunnelStatus(next);
    } catch {
      setStatus({
        featureEnabled: false,
        hasStoredToken: false,
        connected: false,
        publicUrl: "",
      });
      clearTunnelApiBase();
    } finally {
      setStatusLoaded(true);
    }
  }, [applyTunnelStatus]);

  useEffect(() => {
    void refreshStatus();
    return () => {
      clearWarmupTimer();
    };
  }, [refreshStatus, clearWarmupTimer]);

  useEffect(() => {
    const auth = readTunnelAuthFromUrl();
    if (auth === "ok") {
      clearTunnelAuthQuery();
      if (!tunnelPayloadRef.current) {
        tunnelPayloadRef.current = readTunnelPayloadFromReturn();
      }
      try {
        sessionStorage.removeItem(TUNNEL_AUTH_SESSION_KEY);
      } catch {
        // ignore
      }
      return;
    }
    if (auth === "error") {
      const reason = clearTunnelAuthQuery();
      clearTunnelReturnHash();
      clearStashedTunnelPayload();
      setConnectError(`Cloudflare tunnel auth failed: ${reason || "unknown"}`);
      try {
        sessionStorage.removeItem(TUNNEL_AUTH_SESSION_KEY);
      } catch {
        // ignore
      }
    }
  }, [clearTunnelAuthQuery]);

  const connectFromManager = useCallback(async () => {
    redirectToManagerForAuth();
  }, [redirectToManagerForAuth]);

  const runAutoConnect = useCallback(async () => {
    if (autoConnectInFlightRef.current) return;
    if (!status?.featureEnabled || status.connected) return;

    autoConnectInFlightRef.current = true;
    setIsConnecting(true);
    setConnectError(null);

    try {
      let next: TunnelStatus;

      const payload = tunnelPayloadRef.current;
      if (payload) {
        tunnelPayloadRef.current = null;
        returnedFromAuthRef.current = false;
        next = await connectWithPayload(payload.token, payload.url);
      } else if (status.hasStoredToken) {
        next = await reconnectTunnel();
      } else if (returnedFromAuthRef.current) {
        returnedFromAuthRef.current = false;
        const creds = await fetchTunnelTokenFromManager();
        next = await connectWithPayload(creds.token, creds.url);
      } else {
        redirectToManagerForAuth();
        return;
      }

      clearTunnelReturnHash();
      clearStashedTunnelPayload();
      const needsWarmup = !tunnelWasConnectedOnLoadRef.current;
      applyTunnelStatus(next, { warmupAfterConnect: needsWarmup });
      try {
        sessionStorage.removeItem(TUNNEL_AUTH_SESSION_KEY);
      } catch {
        // ignore
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setConnectError(message);
    } finally {
      setIsConnecting(false);
      autoConnectInFlightRef.current = false;
    }
  }, [status, connectWithPayload, redirectToManagerForAuth, applyTunnelStatus]);

  useEffect(() => {
    if (!tunnelPayloadRef.current) {
      tunnelPayloadRef.current = readTunnelPayloadFromReturn();
    }
    if (!statusLoaded || !status?.featureEnabled || status.connected) return;
    void runAutoConnect();
  }, [statusLoaded, status?.featureEnabled, status?.connected, status?.hasStoredToken, runAutoConnect]);

  const disconnect = useCallback(async () => {
    clearWarmupTimer();
    setWarmupPending(false);
    await disconnectTunnel();
    clearTunnelApiBase();
    tunnelPayloadRef.current = null;
    tunnelWasConnectedOnLoadRef.current = false;
    clearStashedTunnelPayload();
    try {
      sessionStorage.removeItem(TUNNEL_AUTH_SESSION_KEY);
    } catch {
      // ignore
    }
    await refreshStatus();
  }, [refreshStatus, clearWarmupTimer]);

  const featureEnabled = Boolean(status?.featureEnabled);
  const tunnelReady =
    !featureEnabled || (Boolean(status?.connected) && !isConnecting && !warmupPending);

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
      warmupPending,
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
      warmupPending,
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
