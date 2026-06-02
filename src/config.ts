const envApiBase = import.meta.env.VITE_API_BASE;
if (!envApiBase) {
  throw new Error("VITE_API_BASE environment variable is required. Please set it in your .env file.");
}

const TUNNEL_API_BASE_KEY = "mhg_tunnel_api_base";

/** Per-user public API after tunnel connect (https://user.myhomegames-server.vige.it). */
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

function resolveLocalApiBase(): string {
  const envBase = String(envApiBase).trim().replace(/\/$/, "");
  // Vite proxies API paths to envBase when HTTPS dev server is on (see vite.config.ts).
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_HTTPS_ENABLED === "true" &&
    typeof window !== "undefined"
  ) {
    return window.location.origin;
  }
  return envBase;
}

/** Local Node server — tunnel control and API calls before the public URL is set. */
export const LOCAL_API_BASE = resolveLocalApiBase();

function resolveApiBase(): string {
  // In dev, start on local/proxy until /tunnel/status confirms cloudflared is connected.
  if (import.meta.env.DEV) {
    return LOCAL_API_BASE;
  }
  return readStoredPublicApiBase() ?? LOCAL_API_BASE;
}

/** API used by the app: stored public URL after connect, otherwise local Node. */
export let API_BASE = resolveApiBase();

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
  // Dev: always use Vite → local Node (see vite.config.ts). cloudflared is for external
  // access (OAuth, remote clients); the browser SPA must not call the public hostname if
  // edge TLS/DNS is misconfigured (ERR_SSL_VERSION_OR_CIPHER_MISMATCH).
  if (import.meta.env.DEV) {
    clearTunnelApiBase();
    return;
  }
  if (status.featureEnabled && status.connected && status.publicUrl) {
    setTunnelApiBase(status.publicUrl);
    return;
  }
  if (status.featureEnabled) {
    clearTunnelApiBase();
  }
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
