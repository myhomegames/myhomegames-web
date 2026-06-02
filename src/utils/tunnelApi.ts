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

export async function disconnectTunnel(): Promise<void> {
  await fetch(`${LOCAL_API_BASE}/tunnel/logout`, { method: "POST" });
}
