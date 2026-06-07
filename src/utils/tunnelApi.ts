import { LOCAL_API_BASE } from "../config";

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

export function getTunnelManagerUrl(): string {
  const fromEnv = (import.meta.env.VITE_TUNNEL_MANAGER_URL as string | undefined)?.trim();
  return (fromEnv || DEFAULT_TUNNEL_MANAGER_URL).replace(/\/$/, "");
}

export function getAppReturnUrl(): string {
  if (typeof window === "undefined") return "";
  const base = import.meta.env.BASE || "/";
  const path = base.startsWith("/") ? base : `/${base}`;
  return `${window.location.origin}${path}`;
}

/** Cloudflare Access login; with returnTo, the manager redirects back to the web app after auth. */
export function getTunnelManagerAuthUrl(returnTo?: string): string {
  const url = new URL(`${getTunnelManagerUrl()}/api/get-token`);
  const dest = returnTo?.trim() || getAppReturnUrl();
  if (dest) {
    url.searchParams.set("return_to", dest);
  }
  return url.toString();
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  return atob(padded + "=".repeat(padLen));
}

const TUNNEL_PAYLOAD_SESSION_KEY = "mhg_tunnel_connect_payload";

function normalizeTunnelPayload(raw: { token?: string; url?: string }): TunnelTokenResponse | null {
  const token = raw.token?.trim();
  let url = raw.url?.trim();
  if (!token || !url) return null;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return { token, url };
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

export async function fetchTunnelStatus(): Promise<TunnelStatus> {
  const res = await fetch(`${LOCAL_API_BASE}/tunnel/status`);
  if (!res.ok) {
    throw new Error(`tunnel status failed (${res.status})`);
  }
  return res.json() as Promise<TunnelStatus>;
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
