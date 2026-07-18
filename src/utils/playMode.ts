import { getApiBase, isLocalApiBase, LOCAL_API_BASE } from "../config";

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
 */
export async function shouldUseRemoteStreaming(remoteStreamingEnabled: boolean): Promise<boolean> {
  if (!remoteStreamingEnabled) return false;
  if (isLocalApiBase(getApiBase())) return false;
  if (await canReachLocalServer()) return false;
  return true;
}
