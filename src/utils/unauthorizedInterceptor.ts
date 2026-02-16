/**
 * Global fetch interceptor: on 401 from our API, invalidate session and redirect.
 * AuthProvider registers the handler (logout + redirect to server URL).
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

const originalFetch = window.fetch;
window.fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await originalFetch.call(this, input, init);
  if (response.status === 401) {
    const url = getRequestUrl(input);
    if (isOurApiRequest(url) && !isSettingsRequest(url)) {
      unauthorizedHandler?.();
    }
  }
  return response;
};
