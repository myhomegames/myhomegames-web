import { getApiBase, getApiToken } from "../config";
import { buildApiHeaders } from "../utils/api";
import { normalizeSkinWebManifest, type SkinWebManifest } from "./skinWebManifest";

export type ServerSkinInfo = {
  id: string;
  name: string;
  version?: string;
  snapshotUrl?: string;
  web: SkinWebManifest;
};

type ServerSettingsPayload = {
  activeSkinId?: string;
};

export async function fetchSkinList(): Promise<ServerSkinInfo[]> {
  const url = new URL("/skins", getApiBase()).toString();
  const res = await fetch(url, {
    headers: buildApiHeaders({ Accept: "application/json" }),
  });
  if (!res.ok) {
    throw new Error(`skins_list_failed_${res.status}`);
  }
  const data = (await res.json()) as { skins?: ServerSkinInfo[] };
  if (!Array.isArray(data.skins)) return [];
  return data.skins
    .filter((s) => s && typeof s.id === "string" && typeof s.name === "string")
    .map((s) => ({
      id: s.id,
      name: s.name,
      version: typeof s.version === "string" && s.version.trim() ? s.version.trim() : undefined,
      snapshotUrl: typeof s.snapshotUrl === "string" ? s.snapshotUrl : undefined,
      web: normalizeSkinWebManifest((s as { web?: unknown }).web),
    }));
}

async function fetchWithRetries(
  run: () => Promise<string | null>,
  attempts = 4,
  delayMs = 800,
): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const value = await run();
      if (value?.trim()) return value;
    } catch {
      // retry
    }
    if (i < attempts - 1) {
      await new Promise((r) => window.setTimeout(r, delayMs));
    }
  }
  return null;
}

export async function fetchServerSkinCss(skinId: string): Promise<string | null> {
  return fetchWithRetries(async () => {
    const url = new URL(`/skins/${encodeURIComponent(skinId)}/bundle.css`, getApiBase()).toString();
    const res = await fetch(url, {
      headers: buildApiHeaders({ Accept: "text/css" }),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim() ? text : null;
  });
}

export async function uploadSkinArchive(
  file: File,
  displayName?: string
): Promise<{ id: string; name: string }> {
  const fd = new FormData();
  fd.append("archive", file);
  if (displayName?.trim()) fd.append("displayName", displayName.trim());
  const url = new URL("/skins", getApiBase()).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-Auth-Token": getApiToken() || "" },
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string; name?: string };
  if (!res.ok) {
    throw new Error(data.error || "upload_failed");
  }
  if (!data.id || !data.name) throw new Error("upload_failed");
  return { id: data.id, name: data.name };
}

/** Server downloads the GitHub release zip (avoids browser CORS) and installs it. */
export async function installSkinFromUrl(
  downloadUrl: string,
  displayName?: string
): Promise<{ id: string; name: string }> {
  const url = new URL("/skins/install-from-url", getApiBase()).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: buildApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      url: downloadUrl,
      ...(displayName?.trim() ? { displayName: displayName.trim() } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string; name?: string };
  if (!res.ok) {
    throw new Error(data.error || "install_from_url_failed");
  }
  if (!data.id || !data.name) throw new Error("install_from_url_failed");
  return { id: data.id, name: data.name };
}

export async function deleteSkinOnServer(skinId: string): Promise<void> {
  const url = new URL(`/skins/${encodeURIComponent(skinId)}`, getApiBase()).toString();
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "X-Auth-Token": getApiToken() || "" },
  });
  if (res.status !== 204 && res.status !== 404) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "delete_failed");
  }
}

export async function fetchServerActiveSkinId(): Promise<string> {
  const url = new URL("/settings", getApiBase()).toString();
  const res = await fetch(url, {
    headers: buildApiHeaders({ Accept: "application/json" }),
  });
  if (!res.ok) return "";
  const data = (await res.json().catch(() => ({}))) as ServerSettingsPayload;
  return typeof data.activeSkinId === "string" ? data.activeSkinId : "";
}

export async function saveServerActiveSkinId(activeSkinId: string): Promise<void> {
  const url = new URL("/settings", getApiBase()).toString();
  await fetch(url, {
    method: "PUT",
    headers: buildApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ activeSkinId }),
  });
}
