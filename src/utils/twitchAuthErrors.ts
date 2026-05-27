/** User-facing messages for Twitch OAuth errors returned via ?auth_error= */
export function formatTwitchAuthError(raw: string): string {
  const decoded = decodeURIComponent(raw.replace(/\+/g, " ")).trim();
  if (decoded.startsWith("twitch_secret_required:")) {
    return decoded.slice("twitch_secret_required:".length).trim();
  }
  if (/invalid client credentials/i.test(decoded)) {
    return (
      "Credenziali Twitch non valide. Per il login con server è obbligatorio il Client Secret: " +
      "nella Twitch Developer Console apri la tua app → Manage → New Secret, poi incollalo in Impostazioni."
    );
  }
  return decoded;
}
