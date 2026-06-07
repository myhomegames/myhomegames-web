const USER_TUNNEL_HOST_SUFFIX = "-myhomegames-server.vige.it";

export type CloudflareTunnelProfile = {
  userName: string;
  userId: string;
  publicUrl: string;
};

/** Derive the Cloudflare tunnel identity from the per-user public API hostname. */
export function parseCloudflareTunnelProfile(publicUrl: string): CloudflareTunnelProfile | null {
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;

  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const host = new URL(withScheme).hostname.toLowerCase();
    if (!host.endsWith(USER_TUNNEL_HOST_SUFFIX)) return null;

    const userName = host.slice(0, -USER_TUNNEL_HOST_SUFFIX.length);
    if (!userName) return null;

    return {
      userName,
      userId: host,
      publicUrl: withScheme.replace(/\/$/, ""),
    };
  } catch {
    return null;
  }
}
