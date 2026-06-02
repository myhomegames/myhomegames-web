/**
 * Vite dev proxy: forward API paths to the local Node server (VITE_API_BASE).
 * Lets the SPA stay on https://localhost:5173 while talking to http://127.0.0.1:4000 same-origin.
 *
 * Proxy everything except the Vite SPA (/app/) and Vite internals (@vite, src, …).
 */
export const DEV_API_PROXY_PATH_PATTERN =
  "^/(?!app(?:/|$)|@|node_modules|src|certs)";

export function devApiProxyTarget(envApiBase: string): string {
  const base = (envApiBase || "http://127.0.0.1:4000").trim();
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://127.0.0.1:4000";
  }
}
