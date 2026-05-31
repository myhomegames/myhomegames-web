const envApiBase = import.meta.env.VITE_API_BASE;
if (!envApiBase) {
  throw new Error("VITE_API_BASE environment variable is required. Please set it in your .env file.");
}
export const API_BASE = envApiBase;

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

