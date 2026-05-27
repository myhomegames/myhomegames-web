const CLIENT_ID_KEY = "twitch_client_id";
const CLIENT_SECRET_KEY = "twitch_client_secret";

/** Mirror server-side Twitch credentials into localStorage (clears keys when empty or disabled). */
export function applyTwitchCredentialsToLocalStorage(
  clientId: string,
  clientSecret: string,
  apiEnabled = true
): void {
  if (!apiEnabled) {
    localStorage.removeItem(CLIENT_ID_KEY);
    localStorage.removeItem(CLIENT_SECRET_KEY);
    return;
  }
  const id = (clientId || "").trim();
  const secret = (clientSecret || "").trim();
  if (id) localStorage.setItem(CLIENT_ID_KEY, id);
  else localStorage.removeItem(CLIENT_ID_KEY);
  if (secret) localStorage.setItem(CLIENT_SECRET_KEY, secret);
  else localStorage.removeItem(CLIENT_SECRET_KEY);
}

export type TwitchCredentialsSource = {
  twitchApiEnabled: boolean;
  serverClientId: string;
  serverClientSecret: string;
  settingsLoaded: boolean;
};

function syncFromServerWhenLoaded(source: TwitchCredentialsSource): void {
  if (!source.settingsLoaded) return;
  applyTwitchCredentialsToLocalStorage(
    source.serverClientId,
    source.serverClientSecret,
    source.twitchApiEnabled
  );
}

/** Client id for OAuth and /auth/me — inactive when API credentials are disabled. */
export function resolveTwitchClientId(source: TwitchCredentialsSource): string {
  syncFromServerWhenLoaded(source);
  if (source.settingsLoaded) {
    if (!source.twitchApiEnabled) return "";
    return (source.serverClientId || "").trim();
  }
  return (
    localStorage.getItem(CLIENT_ID_KEY) ||
    source.serverClientId ||
    ""
  ).trim();
}

/** IGDB uses Twitch client_credentials; both ID and secret are required by the Twitch API. */
export function hasIgdbApiCredentials(clientId: string, clientSecret: string): boolean {
  return !!(clientId || "").trim() && !!(clientSecret || "").trim();
}

export function isIgdbApiActive(
  apiEnabled: boolean,
  clientId: string,
  clientSecret: string
): boolean {
  return apiEnabled && hasIgdbApiCredentials(clientId, clientSecret);
}

export function resolveTwitchClientSecret(source: TwitchCredentialsSource): string {
  syncFromServerWhenLoaded(source);
  if (source.settingsLoaded) {
    if (!source.twitchApiEnabled) return "";
    return (source.serverClientSecret || "").trim();
  }
  return (
    localStorage.getItem(CLIENT_SECRET_KEY) ||
    source.serverClientSecret ||
    ""
  ).trim();
}
