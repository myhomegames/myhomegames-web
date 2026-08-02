import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { useTunnel } from "../contexts/TunnelContext";
import { useServerConnectivity } from "../contexts/ServerConnectivityContext";

const DEFAULT_ATTEMPTS = 4;
const DEFAULT_RETRY_MS = 800;

/**
 * Gate for library list providers: wait until settings + tunnel edge + connectivity
 * probe succeed. Without this, Smart TV cold starts often fire one-shot list fetches
 * against an unready Cloudflare public URL and never retry (empty lists until remount).
 */
export function useListDataReady(): { ready: boolean; reloadToken: number } {
  const { isLoading: authLoading } = useAuth();
  const { settingsLoaded } = useSettings();
  const { featureEnabled, tunnelReady } = useTunnel();
  const { connectivityLoaded, serverReachable } = useServerConnectivity();
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const onApiBaseChanged = () => setReloadToken((n) => n + 1);
    window.addEventListener("mhg-api-base-changed", onApiBaseChanged);
    return () => window.removeEventListener("mhg-api-base-changed", onApiBaseChanged);
  }, []);

  const ready =
    !authLoading &&
    settingsLoaded &&
    (!featureEnabled || tunnelReady) &&
    connectivityLoaded &&
    serverReachable;

  return { ready, reloadToken };
}

/** Retry transient network / cold-edge failures (same budget as connectivity probe). */
export async function withListFetchRetries<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const attempts = options?.attempts ?? DEFAULT_ATTEMPTS;
  const delayMs = options?.delayMs ?? DEFAULT_RETRY_MS;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}
