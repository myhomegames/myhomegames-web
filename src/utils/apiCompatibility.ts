import webCompatibility from "../../compatibility.json";
import { parseSemver } from "./semver";

export type ServerVersionInfo = {
  version: string | null;
};

export const WEB_REQUIRES_MIN_SERVER_VERSION =
  webCompatibility.requires?.minServerVersion ?? "0.0.0";

export { parseSemver } from "./semver";

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
