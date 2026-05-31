const LEGACY_CLIENT_ID_KEY = "twitch_client_id";
const LEGACY_CLIENT_SECRET_KEY = "twitch_client_secret";

/** Remove legacy Twitch app credential keys from localStorage (credentials live on API gateway). */
export function clearLegacyIgdbCredentialStorage(): void {
  localStorage.removeItem(LEGACY_CLIENT_ID_KEY);
  localStorage.removeItem(LEGACY_CLIENT_SECRET_KEY);
}

/** IGDB catalog features when the server setting enables the API (no app-stored credentials). */
export function isIgdbApiEnabled(twitchApiEnabled: boolean): boolean {
  return twitchApiEnabled;
}
