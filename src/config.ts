const envApiBase = import.meta.env.VITE_API_BASE;
if (!envApiBase) {
  throw new Error("VITE_API_BASE environment variable is required. Please set it in your .env file.");
}
export const API_BASE = envApiBase;

// Get API token - prefer Twitch token, fallback to dev token
export function getApiToken(): string {
  // Check for Twitch token in localStorage
  const twitchToken = localStorage.getItem("twitch_token");
  if (twitchToken) {
    return twitchToken;
  }
  
  // Fallback to development token
  return import.meta.env.VITE_API_TOKEN || "";
}

// Get Twitch Client ID from localStorage (saved during login)
export function getTwitchClientId(): string | null {
  return localStorage.getItem("twitch_client_id");
}

// Get Twitch Client Secret from localStorage (saved during login)
export function getTwitchClientSecret(): string | null {
  return localStorage.getItem("twitch_client_secret");
}

// For backward compatibility - this will be updated dynamically
// Components should use getApiToken() or useAuth().token instead
export let API_TOKEN = getApiToken();

// Update API_TOKEN when token changes (called from AuthContext)
export function updateApiToken() {
  API_TOKEN = getApiToken();
}

