import { API_BASE, LOCAL_API_BASE } from "../config";

export function isLocalHttpApiBase(apiBase: string = API_BASE): boolean {
  try {
    const u = new URL(apiBase);
    const host = u.hostname.toLowerCase();
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host === "::1";
    return isLocal && u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Bare local HTTP API is not a useful browser redirect target (no UI, no TLS). */
export function shouldSkipApiBaseBrowserRedirect(options?: {
  tunnelFeatureEnabled?: boolean;
  tunnelReady?: boolean;
}): boolean {
  if (options?.tunnelFeatureEnabled && !options?.tunnelReady) {
    return true;
  }
  if (isLocalHttpApiBase(API_BASE) || isLocalHttpApiBase(LOCAL_API_BASE)) {
    return true;
  }
  return false;
}
