import { getApiBase, isLocalApiBase, isUserTunnelApiBase, readStoredPublicApiBase } from "../config";
import { buildApiUrl } from "./api";

const LEGACY_CLIENT_ID_KEY = "twitch_client_id";
const LEGACY_CLIENT_SECRET_KEY = "twitch_client_secret";

/**
 * IGDB routes must hit the user tunnel hostname so the Cloudflare worker can inject Twitch credentials.
 */
export function resolveIgdbApiBase(): string {
  const stored = readStoredPublicApiBase();
  if (stored && isUserTunnelApiBase(stored)) {
    return stored;
  }
  const current = getApiBase();
  if (isUserTunnelApiBase(current)) {
    return current;
  }
  if (isLocalApiBase(current) && stored) {
    return stored;
  }
  return current;
}

export function buildIgdbApiUrl(
  path: string,
  params: Record<string, string | number | boolean> = {},
): string {
  return buildApiUrl(resolveIgdbApiBase(), path, params);
}

/** Remove legacy Twitch app credential keys from localStorage (credentials live on API gateway). */
export function clearLegacyIgdbCredentialStorage(): void {
  localStorage.removeItem(LEGACY_CLIENT_ID_KEY);
  localStorage.removeItem(LEGACY_CLIENT_SECRET_KEY);
}

/** IGDB catalog features when the server setting enables the API (no app-stored credentials). */
export function isIgdbApiEnabled(twitchApiEnabled: boolean): boolean {
  return twitchApiEnabled;
}
