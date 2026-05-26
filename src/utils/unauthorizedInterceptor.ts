/**
 * Global fetch interceptor:
 * - On 401 from our API: invalidate session and redirect (AuthProvider handler).
 * - On network/certificate error to a **local HTTPS** API: redirect to API_BASE so the user
 *   can accept a self-signed cert once. Skipped for remote APIs (Cloudflare Tunnel, etc.).
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

/**
 * Cert-acceptance redirect only applies when the API is local HTTPS (self-signed).
 * Remote APIs (e.g. Cloudflare Tunnel) must not redirect: server GET / would bounce
 * back to FRONTEND_URL and cause an infinite loop.
 */
export function isLocalHttpsApiBase(apiBase: string = API_BASE): boolean {
  try {
    const u = new URL(apiBase);
    const host = u.hostname.toLowerCase();
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
    return isLocal && u.protocol === "https:";
  } catch {
    return false;
  }
}

function shouldRedirectForCertAcceptance(url: string, message: string): boolean {
  return (
    isOurApiRequest(url) &&
    isNetworkOrCertError(message) &&
    isLocalHttpsApiBase()
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
    if (shouldRedirectForCertAcceptance(url, message)) {
      redirectToApiBase();
    }
    throw err;
  }
};
