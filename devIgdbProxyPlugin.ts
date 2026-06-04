import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { devApiProxyTarget } from "./devApiProxy";

const IGDB_PATH_PREFIX = "/igdb";
/** Dominio principale: TLS ok da localhost; worker relay → sottodominio tunnel. */
const IGDB_DEV_GATEWAY_ORIGIN = "https://myhomegames-server.vige.it";
const IGDB_GATEWAY_PREFIX = "/api/igdb-gateway";

let cachedTunnelHost: string | null = null;
let cachedAt = 0;
const CACHE_MS = 3000;

async function resolveTunnelHost(localApiTarget: string): Promise<string | null> {
  const now = Date.now();
  if (cachedTunnelHost && now - cachedAt < CACHE_MS) {
    return cachedTunnelHost;
  }

  const localBase = localApiTarget.replace(/\/$/, "");
  try {
    const res = await fetch(`${localBase}/tunnel/status`);
    if (res.ok) {
      const data = (await res.json()) as {
        connected?: boolean;
        publicUrl?: string;
      };
      if (data.connected && data.publicUrl?.trim()) {
        const host = new URL(data.publicUrl.trim()).hostname;
        if (host) {
          cachedTunnelHost = host;
          cachedAt = now;
          return cachedTunnelHost;
        }
      }
    }
  } catch {
    // tunnel/status unreachable
  }

  cachedTunnelHost = null;
  cachedAt = now;
  return null;
}

function readRequestBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (!req.method || req.method === "GET" || req.method === "HEAD") {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function forwardHeaders(
  req: IncomingMessage,
  targetHost: string,
  tunnelHost: string,
): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "connection") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    } else {
      headers.set(key, value);
    }
  }
  headers.set("host", targetHost);
  headers.set("X-MHG-Tunnel-Host", tunnelHost);
  return headers;
}

async function proxyIgdbViaManagerGateway(
  req: IncomingMessage,
  res: ServerResponse,
  tunnelHost: string,
  body: Buffer | undefined,
): Promise<void> {
  const reqUrl = req.url || IGDB_PATH_PREFIX;
  const target = new URL(`${IGDB_GATEWAY_PREFIX}${reqUrl}`, IGDB_DEV_GATEWAY_ORIGIN);
  const upstream = await fetch(target, {
    method: req.method || "GET",
    headers: forwardHeaders(req, target.host, tunnelHost),
    body: body ? new Uint8Array(body) : undefined,
    redirect: "manual",
  });

  res.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

/**
 * Dev-only: /igdb → myhomegames-server.vige.it/api/igdb-gateway/igdb/… (worker injects creds).
 * Evita HTTPS diretto sul sottodominio utente quando il TLS edge è rotto in locale.
 */
export function devIgdbProxyPlugin(options: { localApiTarget: string }): Plugin {
  return {
    name: "dev-igdb-gateway-proxy",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith(IGDB_PATH_PREFIX)) {
          return next();
        }

        void (async () => {
          try {
            const body = await readRequestBody(req);
            const tunnelHost = await resolveTunnelHost(options.localApiTarget);

            if (!tunnelHost) {
              res.statusCode = 503;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: "IGDB gateway unavailable",
                  hint: "Connect the Cloudflare tunnel first (Settings → tunnel / POST /tunnel/connect).",
                }),
              );
              return;
            }

            const target = `${IGDB_DEV_GATEWAY_ORIGIN}${IGDB_GATEWAY_PREFIX}${req.url || ""}`;
            console.log("[dev-igdb-proxy] →", target, "tunnelHost:", tunnelHost);
            await proxyIgdbViaManagerGateway(req, res, tunnelHost, body);
          } catch (err) {
            console.error("[dev-igdb-proxy]", err);
            if (!res.headersSent) {
              res.statusCode = 502;
              res.setHeader("Content-Type", "application/json");
              const message = err instanceof Error ? err.message : String(err);
              res.end(
                JSON.stringify({
                  error: "IGDB gateway proxy error",
                  detail: message,
                  hint:
                    "Deploy the latest worker (api/igdb-gateway relay) or fix TLS on the tunnel subdomain.",
                }),
              );
            }
          }
        })();
      });
    },
  };
}

export function devIgdbProxyPluginFromEnv(env: Record<string, string>): Plugin | null {
  if (env.VITE_HTTPS_ENABLED !== "true") {
    return null;
  }
  return devIgdbProxyPlugin({
    localApiTarget: devApiProxyTarget(env.VITE_API_BASE || "http://127.0.0.1:4000"),
  });
}
