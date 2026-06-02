const envApiBase = import.meta.env.VITE_API_BASE;
if (!envApiBase) {
  throw new Error("VITE_API_BASE environment variable is required. Please set it in your .env file.");
}

const TUNNEL_API_BASE_KEY = "mhg_tunnel_api_base";

function loadApiBase(): string {
  try {
    const stored = localStorage.getItem(TUNNEL_API_BASE_KEY);
    if (stored?.trim()) {
      return stored.trim().replace(/\/$/, "");
    }
  } catch {
    // ignore
  }
  return String(envApiBase).trim().replace(/\/$/, "");
}

/** Always the local Node server (tunnel control + pre-connect). */
export const LOCAL_API_BASE = String(envApiBase).trim().replace(/\/$/, "");

/** API used by the app — local in dev, per-user public URL after tunnel connect. */
export let API_BASE = loadApiBase();

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
}

export function clearTunnelApiBase(): void {
  API_BASE = LOCAL_API_BASE;
  try {
    localStorage.removeItem(TUNNEL_API_BASE_KEY);
  } catch {
    // ignore
  }
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

