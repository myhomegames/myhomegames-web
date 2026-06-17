import webCompatibility from "../../compatibility.json";

export type ServerVersionInfo = {
  version: string | null;
};

export const WEB_REQUIRES_MIN_SERVER_VERSION =
  webCompatibility.requires?.minServerVersion ?? "0.0.0";

export function parseSemver(version: string): [number, number, number] | null {
  const v = version.trim().replace(/^v/i, "");
  const core = v.split("-")[0];
  const parts = core.split(".").map((n) => parseInt(n, 10));
  if (parts.length < 1 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/** True when server `actual` >= required minimum semver. */
export function isServerVersionCompatible(
  serverVersion: string | null | undefined,
  minRequired: string = WEB_REQUIRES_MIN_SERVER_VERSION
): boolean {
  const required = parseSemver(minRequired);
  const actual = serverVersion ? parseSemver(serverVersion) : null;
  if (!required) return true;
  if (!actual) return false;
  for (let i = 0; i < 3; i++) {
    if (actual[i] > required[i]) return true;
    if (actual[i] < required[i]) return false;
  }
  return true;
}

export function parseServerVersionPayload(json: unknown): ServerVersionInfo {
  if (!json || typeof json !== "object") {
    return { version: null };
  }
  const body = json as Record<string, unknown>;
  const version = typeof body.version === "string" ? body.version : null;
  return { version };
}
