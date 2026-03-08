/**
 * Global fetch interceptor:
 * - On 401 from our API: invalidate session and redirect (AuthProvider handler).
 * - On network/certificate error (fetch throws): redirect to API_BASE so user can accept cert at app open.
 */

import { API_BASE } from "../config";

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export function getUnauthorizedHandler(): (() => void) | null {
  return unauthorizedHandler;
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof Request) return input.url;
  return String(input);
}

function isOurApiRequest(url: string): boolean {
  const base = API_BASE.replace(/\/$/, "");
  return url === base || url.startsWith(base + "/");
}

function isSettingsRequest(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, "");
    return pathname === "/settings" || pathname.endsWith("/settings");
  } catch {
    return false;
  }
}

function isLoginPage(): boolean {
  try {
    const p = window.location.pathname;
    return p === "/login" || p.endsWith("/login");
  } catch {
    return false;
  }
}

function isNetworkOrCertError(message: string): boolean {
  const m = message?.toLowerCase() ?? "";
  return (
    message === "Failed to fetch" ||
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("certificate") ||
    m.includes("ssl") ||
    m.includes("unable to connect")
  );
}

function redirectToApiBase(): void {
  const serverUrl = API_BASE.replace(/\/$/, "");
  window.location.href = serverUrl;
}

const originalFetch = window.fetch;
window.fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = getRequestUrl(input);
  const isOurApi = isOurApiRequest(url);
  try {
    const response = await originalFetch.call(this, input, init);
    if (response.status === 401 && isOurApi && !isSettingsRequest(url) && !isLoginPage()) {
      unauthorizedHandler?.();
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isOurApi && isNetworkOrCertError(message)) {
      redirectToApiBase();
    }
    throw err;
  }
};
