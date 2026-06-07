const envApiBase = import.meta.env.VITE_API_BASE;
if (!envApiBase) {
  throw new Error("VITE_API_BASE environment variable is required. Please set it in your .env file.");
}

const TUNNEL_API_BASE_KEY = "mhg_tunnel_api_base";
const USER_TUNNEL_HOST_SUFFIX = "-myhomegames-server.vige.it";
const INTERIM_API_SUFFIX = "-api.vige.it";
const LEGACY_NESTED_SUFFIX = ".myhomegames-server.vige.it";

function migrateUserTunnelPublicUrl(url: string): string {
  const raw = url.trim().replace(/\/$/, "");
  if (!raw) return raw;
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = new URL(normalized).hostname.toLowerCase();
    if (host.endsWith(USER_TUNNEL_HOST_SUFFIX)) {
      return raw;
    }
    if (host.endsWith(INTERIM_API_SUFFIX)) {
      const username = host.slice(0, -INTERIM_API_SUFFIX.length);
      if (username && !username.includes(".")) {
        return `https://${username}${USER_TUNNEL_HOST_SUFFIX}`;
      }
    }
    const nested = host.match(/^([a-z0-9-]+)\.myhomegames-server\.vige\.it$/);
    if (nested) {
      return `https://${nested[1]}${USER_TUNNEL_HOST_SUFFIX}`;
    }
    if (host.endsWith(LEGACY_NESTED_SUFFIX)) {
      return raw;
    }
    return raw;
  } catch {
    return raw;
  }
}

/** Per-user public API after tunnel connect (https://user-myhomegames-server.vige.it). */
export function readStoredPublicApiBase(): string | null {
  try {
    const stored = localStorage.getItem(TUNNEL_API_BASE_KEY);
    if (stored?.trim()) {
      const migrated = migrateUserTunnelPublicUrl(stored.trim());
      if (migrated !== stored.trim().replace(/\/$/, "")) {
        localStorage.setItem(TUNNEL_API_BASE_KEY, migrated);
      }
      return migrated.replace(/\/$/, "");
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

export function setTunnelApiBase(url: string): void {
  const normalized = migrateUserTunnelPublicUrl(url.trim()).replace(/\/$/, "");
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
