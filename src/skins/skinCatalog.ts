import { SKINS_GITHUB_REPO } from "../config";
import { isServerVersionCompatible } from "../utils/apiCompatibility";
import { semverGreater } from "../utils/semver";
import type { ServerSkinInfo } from "./skinApi";

export type InstalledSkinForUpdate = Pick<ServerSkinInfo, "id" | "name" | "version">;

const GITHUB_JSON_ACCEPT = "application/vnd.github.v3+json";
const SKIN_ZIP_SUFFIX = ".mhg-skin.zip";
const CACHE_KEY = "mhg_skins_catalog";
const CACHE_TTL_MS = 60 * 60 * 1000;

export type CatalogSkin = {
  id: string;
  name: string;
  version: string;
  zip: string;
  downloadUrl: string;
};

export type SkinsCompatibilityRequires = {
  minServerVersion?: string;
  minWebVersion?: string;
};

export type SkinsCatalog = {
  version: string | null;
  requires: SkinsCompatibilityRequires | null;
  skins: CatalogSkin[];
};

type GitHubAsset = { name: string; browser_download_url: string };
type GitHubRelease = { tag_name: string; assets: GitHubAsset[] };

/** `<skinId>-<version>.mhg-skin.zip` (legacy: `<skinId>.mhg-skin.zip`). */
export function parseSkinZipFileName(fileName: string): { id: string; version?: string } | null {
  if (!fileName.endsWith(SKIN_ZIP_SUFFIX)) return null;
  const base = fileName.slice(0, -SKIN_ZIP_SUFFIX.length);
  const versioned = base.match(/^(.+)-(\d+\.\d+\.\d+)$/);
  if (versioned) {
    return { id: versioned[1], version: versioned[2] };
  }
  return { id: base };
}

export function normalizeSkinName(name: string): string {
  return name.trim().toLowerCase();
}

function catalogFromReleaseAssets(assets: GitHubAsset[]): CatalogSkin[] {
  const skins: CatalogSkin[] = [];
  for (const zipAsset of assets) {
    // GitHub flattens uploaded paths: "plex-1.0.0.mhg-skin.zip" (optional legacy "zips/" prefix).
    if (!zipAsset.name.endsWith(SKIN_ZIP_SUFFIX)) continue;
    const fileName = zipAsset.name.includes("/")
      ? zipAsset.name.slice(zipAsset.name.lastIndexOf("/") + 1)
      : zipAsset.name;
    const parsed = parseSkinZipFileName(fileName);
    if (!parsed?.version) continue;
    skins.push({
      id: parsed.id,
      name: parsed.id,
      version: parsed.version,
      zip: fileName,
      downloadUrl: zipAsset.browser_download_url,
    });
  }
  return skins;
}

async function fetchSkinsCompatibility(
  owner: string,
  repo: string,
  ref: string
): Promise<SkinsCompatibilityRequires | null> {
  if (!ref) return null;
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/compatibility.json`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { requires?: SkinsCompatibilityRequires };
    if (!data.requires || typeof data.requires !== "object") return null;
    return data.requires;
  } catch {
    return null;
  }
}

/** True when the connected server and web app meet the skins release compatibility.json. */
export function areSkinsReleaseRequirementsMet(
  requires: SkinsCompatibilityRequires | null | undefined,
  serverVersion: string | null | undefined,
  appVersion: string | null | undefined
): boolean {
  if (requires?.minServerVersion && !isServerVersionCompatible(serverVersion, requires.minServerVersion)) {
    return false;
  }
  if (requires?.minWebVersion && !isServerVersionCompatible(appVersion, requires.minWebVersion)) {
    return false;
  }
  return true;
}

async function enrichCatalogSkins(
  skins: CatalogSkin[],
  owner: string,
  repo: string,
  ref: string
): Promise<CatalogSkin[]> {
  if (!ref) return skins;

  return Promise.all(
    skins.map(async (skin) => {
      try {
        const res = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/skins/${encodeURIComponent(skin.id)}/skin.json`
        );
        if (!res.ok) return skin;
        const data = (await res.json()) as { name?: string; version?: string };
        const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : skin.name;
        const version =
          typeof data.version === "string" && data.version.trim() ? data.version.trim() : skin.version;
        return { ...skin, name, version };
      } catch {
        return skin;
      }
    })
  );
}

export async function fetchSkinsCatalog(): Promise<SkinsCatalog> {
  if (!SKINS_GITHUB_REPO?.includes("/")) {
    return { version: null, requires: null, skins: [] };
  }

  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { at, payload } = JSON.parse(cached) as { at: number; payload: SkinsCatalog };
      if (Date.now() - at < CACHE_TTL_MS && payload) {
        return payload;
      }
    } catch {
      // ignore
    }
  }

  const [owner, repo] = SKINS_GITHUB_REPO.split("/").map((s) => s.trim()).filter(Boolean);
  if (!owner || !repo) {
    return { version: null, requires: null, skins: [] };
  }

  const releaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
    headers: { Accept: GITHUB_JSON_ACCEPT },
  });
  if (!releaseRes.ok) {
    throw new Error(`GitHub skins releases API: ${releaseRes.status}`);
  }

  const release = (await releaseRes.json()) as GitHubRelease;
  const tag = release.tag_name?.replace(/^v/i, "") ?? "";
  const ref = release.tag_name?.trim() || tag;
  let skins = catalogFromReleaseAssets(release.assets ?? []);
  const requires = await fetchSkinsCompatibility(owner, repo, ref);
  if (skins.length === 0) {
    return { version: tag || null, requires, skins: [] };
  }

  skins = await enrichCatalogSkins(skins, owner, repo, ref);
  const payload = { version: tag || null, requires, skins };
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), payload }));
  } catch {
    // ignore
  }
  return payload;
}

export function findCatalogSkinForInstalled(
  installed: InstalledSkinForUpdate,
  catalog: CatalogSkin[]
): CatalogSkin | null {
  const key = normalizeSkinName(installed.name);
  if (!key) return null;
  return catalog.find((c) => normalizeSkinName(c.name) === key) ?? null;
}

export function isInstalledSkinOutdated(
  installed: InstalledSkinForUpdate,
  catalogEntry: CatalogSkin
): boolean {
  const current = installed.version?.trim() || "0.0.0";
  const latest = catalogEntry.version?.trim();
  if (!latest) return false;
  return semverGreater(latest, current);
}

export function findOutdatedInstalledSkins(
  installed: InstalledSkinForUpdate[],
  catalog: CatalogSkin[]
): { installed: InstalledSkinForUpdate; catalog: CatalogSkin }[] {
  const out: { installed: InstalledSkinForUpdate; catalog: CatalogSkin }[] = [];
  for (const skin of installed) {
    const entry = findCatalogSkinForInstalled(skin, catalog);
    if (!entry) continue;
    if (isInstalledSkinOutdated(skin, entry)) {
      out.push({ installed: skin, catalog: entry });
    }
  }
  return out;
}

export async function downloadSkinArchive(url: string, fileName: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`skin_download_failed:${res.status}`);
  }
  const blob = await res.blob();
  return new File([blob], fileName, { type: "application/zip" });
}
