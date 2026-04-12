import { API_BASE, getApiToken } from "../config";

export type ServerSkinInfo = { id: string; name: string };

export async function fetchSkinList(): Promise<ServerSkinInfo[]> {
  const url = new URL("/skins", API_BASE).toString();
  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Auth-Token": getApiToken() || "" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { skins?: ServerSkinInfo[] };
  return Array.isArray(data.skins) ? data.skins : [];
}

export async function fetchServerSkinCss(skinId: string): Promise<string | null> {
  const url = new URL(`/skins/${encodeURIComponent(skinId)}/bundle.css`, API_BASE).toString();
  const res = await fetch(url, {
    headers: { Accept: "text/css", "X-Auth-Token": getApiToken() || "" },
  });
  if (!res.ok) return null;
  return res.text();
}

export async function uploadSkinArchive(
  file: File,
  displayName?: string
): Promise<{ id: string; name: string }> {
  const fd = new FormData();
  fd.append("archive", file);
  if (displayName?.trim()) fd.append("displayName", displayName.trim());
  const url = new URL("/skins", API_BASE).toString();
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

export async function deleteSkinOnServer(skinId: string): Promise<void> {
  const url = new URL(`/skins/${encodeURIComponent(skinId)}`, API_BASE).toString();
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "X-Auth-Token": getApiToken() || "" },
  });
  if (res.status !== 204 && res.status !== 404) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "delete_failed");
  }
}
