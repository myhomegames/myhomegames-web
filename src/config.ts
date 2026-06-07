const envApiBase = import.meta.env.VITE_API_BASE;
if (!envApiBase) {
  throw new Error("VITE_API_BASE environment variable is required. Please set it in your .env file.");
}

const TUNNEL_API_BASE_KEY = "mhg_tunnel_api_base";

/** Per-user public API after tunnel connect (https://user-myhomegames-server.vige.it). */
export function readStoredPublicApiBase(): string | null {
  try {
    const stored = localStorage.getItem(TUNNEL_API_BASE_KEY);
    if (stored?.trim()) {
      return stored.trim().replace(/\/$/, "");
    }
  } catch {
    // ignore
  }
  return null;
}

/** Local Node — tunnel control only (`/tunnel/*` in tunnelApi.ts). Not used for app API in normal flow. */
export const LOCAL_API_BASE = String(envApiBase).trim().replace(/\/$/, "");

function resolveApiBase(): string {
  return readStoredPublicApiBase() ?? LOCAL_API_BASE;
}

/** API used by the app: public tunnel URL after connect, otherwise unset until /tunnel/status runs. */
export let API_BASE = resolveApiBase();

/** Prefer stored public tunnel URL (survives brief status/sync glitches). */
export function getApiBase(): string {
  return readStoredPublicApiBase() ?? API_BASE;
}

export function isLocalApiBase(apiBase: string = getApiBase()): boolean {
  try {
    const host = new URL(apiBase).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return false;
  }
}

const USER_TUNNEL_HOST_SUFFIX = "-myhomegames-server.vige.it";

export function isUserTunnelApiBase(apiBase: string = getApiBase()): boolean {
  try {
    const host = new URL(apiBase.startsWith("http") ? apiBase : `https://${apiBase}`).hostname.toLowerCase();
    return host.endsWith(USER_TUNNEL_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export function setTunnelApiBase(url: string): void {
  const normalized = url.trim().replace(/\/$/, "");
  const withScheme = /^https?:\/\//i.test(normalized)
    ? normalized
    : `https://${normalized}`;
  API_BASE = withScheme.replace(/\/$/, "");
  try {
    localStorage.setItem(TUNNEL_API_BASE_KEY, API_BASE);
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mhg-api-base-changed"));
  }
}

export function clearTunnelApiBase(): void {
  API_BASE = LOCAL_API_BASE;
  try {
    localStorage.removeItem(TUNNEL_API_BASE_KEY);
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mhg-api-base-changed"));
  }
}

export function syncTunnelApiBaseFromStatus(status: {
  featureEnabled: boolean;
  connected: boolean;
  publicUrl: string;
}): void {
  if (!status.featureEnabled) {
    return;
  }
  if (status.connected) {
    const nextUrl = status.publicUrl?.trim();
    if (nextUrl) {
      setTunnelApiBase(nextUrl);
    }
    return;
  }
  clearTunnelApiBase();
}

export function hasPublicApiBase(): boolean {
  return readStoredPublicApiBase() !== null;
}

/** GitHub repo "owner/repo" for checking releases (optional). e.g. MyHomeGames/MyHomeGames */
export const GITHUB_REPO = (import.meta.env.VITE_GITHUB_REPO as string) || "";

// Get API token - prefer dev token if available, otherwise use Twitch token
export function getApiToken(): string {
  // If VITE_API_TOKEN is set, prefer it (for development mode)
  const devToken = import.meta.env.VITE_API_TOKEN;
  if (devToken && devToken !== "") {
    return devToken;
  }

  // Fallback to Twitch token in localStorage
  const twitchToken = localStorage.getItem("twitch_token");
  if (twitchToken) {
    return twitchToken;
  }

  return "";
}

// For backward compatibility - this will be updated dynamically
// Components should use getApiToken() or useAuth().token instead
export let API_TOKEN = getApiToken();

// Update API_TOKEN when token changes (called from AuthContext)
export function updateApiToken() {
  API_TOKEN = getApiToken();
}
