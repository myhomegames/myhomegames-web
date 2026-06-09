import { LOCAL_API_BASE, setTunnelApiBase } from "../config";

const LOCAL_TUNNEL_PROBE_MS = 2500;
const REMOTE_TUNNEL_PROBE_MS = 8000;

export type TunnelStatus = {
  featureEnabled: boolean;
  hasStoredToken: boolean;
  connected: boolean;
  publicUrl: string;
};

export type TunnelTokenResponse = {
  token: string;
  url: string;
};

const DEFAULT_TUNNEL_MANAGER_URL = "https://myhomegames-server.vige.it";
/** GitHub Pages SPA mount (must match vite.config base). */
const SPA_MOUNT_PATH = "/app/";

export function getTunnelManagerUrl(): string {
  const fromEnv = (import.meta.env.VITE_TUNNEL_MANAGER_URL as string | undefined)?.trim();
  return (fromEnv || DEFAULT_TUNNEL_MANAGER_URL).replace(/\/$/, "");
}

function normalizeBasePath(base: string): string {
  let path = (base || "/").trim();
  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.endsWith("/")) path = `${path}/`;
  return path;
}

function encodeBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * OAuth return URL for the web SPA after Cloudflare Access.
 * Prefer /app/ when the user is already under the SPA path (works even if BASE was baked as "/").
 */
export function getAppReturnUrl(): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    return `${origin}${SPA_MOUNT_PATH}`;
  }
  const configured = normalizeBasePath(import.meta.env.BASE || SPA_MOUNT_PATH);
  return `${origin}${configured}`;
}

/**
 * Cloudflare Access login URL for the tunnel manager.
 * return_to is embedded in the path (/api/get-token/r/<b64url>) so Access preserves it; query param is redundant backup.
 */
export function getTunnelManagerAuthUrl(returnTo?: string): string {
  const dest = returnTo?.trim() || getAppReturnUrl();
  const manager = getTunnelManagerUrl();
  if (!dest) {
    return `${manager}/api/get-token`;
  }
  const encoded = encodeBase64Url(dest);
  const url = new URL(`${manager}/api/get-token/r/${encoded}`);
  url.searchParams.set("return_to", dest);
  return url.toString();
}

/**
 * Cloudflare Access logout. Clears the Access session cookie on the manager domain.
 * After logout, lands on get-token with return_to so login can send the user back to the app.
 */
export function getCloudflareAccessLogoutUrl(): string {
  const authUrl = getTunnelManagerAuthUrl();
  const logout = `${getTunnelManagerUrl()}/cdn-cgi/access/logout?redirect_url=${encodeURIComponent(authUrl)}`;
  return logout;
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  return atob(padded + "=".repeat(padLen));
}

const TUNNEL_PAYLOAD_SESSION_KEY = "mhg_tunnel_connect_payload";

export function normalizePublicTunnelUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, "");
}

function normalizeTunnelPayload(raw: { token?: string; url?: string }): TunnelTokenResponse | null {
  const token = raw.token?.trim();
  const url = raw.url?.trim();
  if (!token || !url) return null;
  return { token, url: normalizePublicTunnelUrl(url) };
}

function readTunnelPayloadFromHash(): TunnelTokenResponse | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw.startsWith("tunnel=")) return null;
  try {
    const json = JSON.parse(decodeBase64Url(raw.slice("tunnel=".length))) as {
      token?: string;
      url?: string;
    };
    return normalizeTunnelPayload(json);
  } catch {
    return null;
  }
}

export function stashTunnelPayload(payload: TunnelTokenResponse): void {
  try {
    sessionStorage.setItem(TUNNEL_PAYLOAD_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function readStashedTunnelPayload(): TunnelTokenResponse | null {
  try {
    const raw = sessionStorage.getItem(TUNNEL_PAYLOAD_SESSION_KEY);
    if (!raw) return null;
    return normalizeTunnelPayload(JSON.parse(raw) as { token?: string; url?: string });
  } catch {
    return null;
  }
}

export function clearStashedTunnelPayload(): void {
  try {
    sessionStorage.removeItem(TUNNEL_PAYLOAD_SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Token + hostname from URL hash or session stash (survives hash cleanup / Strict Mode). */
export function readTunnelPayloadFromReturn(): TunnelTokenResponse | null {
  const fromHash = readTunnelPayloadFromHash();
  if (fromHash) {
    stashTunnelPayload(fromHash);
    return fromHash;
  }
  return readStashedTunnelPayload();
}

export function clearTunnelReturnHash(): void {
  if (typeof window === "undefined") return;
  if (!window.location.hash.startsWith("#tunnel=")) return;
  const next = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, next);
}

export async function canReachLocalTunnelControl(): Promise<boolean> {
  try {
    const res = await fetch(`${LOCAL_API_BASE}/tunnel/status`, {
      signal: AbortSignal.timeout(LOCAL_TUNNEL_PROBE_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTunnelStatusAt(apiBase: string): Promise<TunnelStatus> {
  const base = normalizePublicTunnelUrl(apiBase);
  if (!base) {
    throw new Error("tunnel_unreachable");
  }
  const res = await fetch(`${base}/tunnel/status`, {
    signal: AbortSignal.timeout(REMOTE_TUNNEL_PROBE_MS),
  });
  if (!res.ok) {
    throw new Error(`tunnel status failed (${res.status})`);
  }
  const data = (await res.json()) as TunnelStatus;
  return {
    featureEnabled: Boolean(data.featureEnabled),
    hasStoredToken: Boolean(data.hasStoredToken),
    connected: Boolean(data.connected),
    publicUrl: (data.publicUrl || base).replace(/\/$/, ""),
  };
}

export async function fetchTunnelStatus(): Promise<TunnelStatus> {
  return fetchTunnelStatusAt(LOCAL_API_BASE);
}

/**
 * Remote browsers cannot POST /tunnel/connect to localhost. After Access login, adopt the
 * public API URL and verify the home tunnel is up.
 */
export async function adoptRemoteTunnelApi(publicUrl: string): Promise<TunnelStatus> {
  const base = normalizePublicTunnelUrl(publicUrl);
  if (!base) {
    throw new Error("tunnel_unreachable");
  }
  setTunnelApiBase(base);
  let status: TunnelStatus;
  try {
    status = await fetchTunnelStatusAt(base);
  } catch {
    throw new Error("tunnel_unreachable");
  }
  if (!status.featureEnabled) {
    throw new Error("tunnel_feature_disabled");
  }
  if (!status.connected) {
    throw new Error("tunnel_not_connected");
  }
  return { ...status, publicUrl: status.publicUrl || base };
}

/** Start tunnel locally when the server is on this machine; otherwise adopt the public API URL. */
export async function connectTunnelWithFallback(
  token: string,
  url: string,
): Promise<TunnelStatus> {
  const payload = normalizeTunnelPayload({ token, url });
  if (!payload) {
    throw new Error("Invalid tunnel credentials");
  }
  if (await canReachLocalTunnelControl()) {
    return connectTunnel(payload.token, payload.url);
  }
  return adoptRemoteTunnelApi(payload.url);
}

export async function fetchTunnelTokenFromManager(): Promise<TunnelTokenResponse> {
  const manager = getTunnelManagerUrl();
  const res = await fetch(`${manager}/api/get-token`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body?.error === "string" ? body.error : `get-token failed (${res.status})`;
    throw new Error(message);
  }
  const data = (await res.json()) as { token?: string; url?: string };
  const token = data.token?.trim();
  const url = data.url?.trim();
  if (!token || !url) {
    throw new Error("Invalid tunnel token response");
  }
  return { token, url };
}

export async function connectTunnel(token: string, url: string): Promise<TunnelStatus> {
  const res = await fetch(`${LOCAL_API_BASE}/tunnel/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, url }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof body?.error === "string"
        ? body.error
        : typeof body?.detail === "string"
          ? body.detail
          : `tunnel connect failed (${res.status})`;
    throw new Error(message);
  }
  return fetchTunnelStatus();
}

export async function reconnectTunnel(): Promise<TunnelStatus> {
  const res = await fetch(`${LOCAL_API_BASE}/tunnel/reconnect`, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof body?.error === "string"
        ? body.error
        : typeof body?.detail === "string"
          ? body.detail
          : `tunnel reconnect failed (${res.status})`;
    throw new Error(message);
  }
  return fetchTunnelStatus();
}

export async function disconnectTunnel(): Promise<void> {
  await fetch(`${LOCAL_API_BASE}/tunnel/logout`, { method: "POST" });
}
