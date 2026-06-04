/**
 * Vite dev proxy: forward API paths to the local Node server (VITE_API_BASE).
 * Lets the SPA stay on https://localhost:5173 while talking to http://127.0.0.1:4000 same-origin.
 *
 * /igdb is excluded — devIgdbProxyPlugin forwards to the public tunnel (worker injects creds).
 */
export const DEV_API_PROXY_PATH_PATTERN =
  "^/(?!app(?:/|$)|@|node_modules|src|certs|igdb(?:/|$))";

export function devApiProxyTarget(envApiBase: string): string {
  const base = (envApiBase || "http://127.0.0.1:4000").trim();
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://127.0.0.1:4000";
  }
}
