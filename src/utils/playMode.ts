import { getApiBase, isLocalApiBase, LOCAL_API_BASE } from "../config";

const FORCE_REMOTE_STORAGE_KEY = "mhg_force_remote_streaming";

/** Dev/test helper: force Moonlight Web path even on the home PC. */
export function isForceRemoteStreaming(): boolean {
  if (import.meta.env.VITE_FORCE_REMOTE_STREAMING === "true") return true;
  try {
    return globalThis.localStorage?.getItem(FORCE_REMOTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** True when the home server responds on the local tunnel control port (same machine). */
export async function canReachLocalServer(timeoutMs = 2000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${LOCAL_API_BASE}/tunnel/status`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Remote Moonlight Web streaming when the API is not local and this browser is not on the home PC.
 *
 * For local streaming tests, set VITE_FORCE_REMOTE_STREAMING=true or
 * localStorage mhg_force_remote_streaming=1 to use Moonlight Web even on the home PC.
 */
export async function shouldUseRemoteStreaming(remoteStreamingEnabled: boolean): Promise<boolean> {
  if (!remoteStreamingEnabled) return false;
  if (isForceRemoteStreaming()) return true;
  if (isLocalApiBase(getApiBase())) return false;
  if (await canReachLocalServer()) return false;
  return true;
}
