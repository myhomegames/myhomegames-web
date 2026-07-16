import { useState, useEffect, useCallback, useMemo } from "react";
import { GITHUB_REPO } from "../config";
import { useServerVersion } from "./useServerVersion";

const CACHE_KEY = "mhg_latest_release";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type GitHubAsset = { name: string; browser_download_url: string };
type GitHubRelease = { tag_name: string; assets: GitHubAsset[]; body?: string | null };

function parseVersion(s: string): number[] {
  const v = s.replace(/^v/i, "").trim();
  const parts = v.split(".").map((n) => parseInt(n, 10) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function versionGreater(a: string, b: string): boolean {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (va[i] > vb[i]) return true;
    if (va[i] < vb[i]) return false;
  }
  return false;
}

export type OsKind = "win" | "mac-arm64" | "mac-x64" | "linux";

function detectOs(): OsKind {
  if (typeof navigator === "undefined") return "linux";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string; architecture?: string } }).userAgentData?.platform?.toLowerCase();
  const arch = (navigator as Navigator & { userAgentData?: { architecture?: string } }).userAgentData?.architecture?.toLowerCase();

  if (ua.includes("win") || platform === "windows") return "win";
  if (ua.includes("mac") || platform === "macos") {
    // Browsers on Apple Silicon can expose inconsistent UA strings (often "Intel Mac OS X")
    // and sometimes omit/obfuscate architecture. Prefer arm64 unless x64 is explicit.
    const isExplicitX64 =
      (typeof arch === "string" && /x86|x64|amd64|intel/i.test(arch)) ||
      /x86_64|amd64|wow64/.test(ua);
    const isExplicitArm64 =
      (typeof arch === "string" && /arm|aarch64/i.test(arch)) ||
      /arm64|aarch64|apple silicon/.test(ua);
    if (isExplicitArm64) return "mac-arm64";
    if (isExplicitX64) return "mac-x64";
    return "mac-arm64";
  }
  return "linux";
}

const ASSET_PATTERNS: Record<OsKind, RegExp[]> = {
  win: [/MyHomeGames-[0-9.]+-win-x64\.zip$/i],
  "mac-arm64": [/MyHomeGames-[0-9.]+-mac-arm64\.pkg$/i],
  "mac-x64": [/MyHomeGames-[0-9.]+-mac-x64\.pkg$/i],
  linux: [
    /MyHomeGames-[0-9.]+-linux-x64\.tar\.gz$/i,
    /myhomegames-server_[0-9.]+_amd64\.deb$/i,
    /myhomegames-server-[0-9.]+-1\.x86_64\.rpm$/i,
  ],
};

function findAssetForOs(assets: GitHubAsset[], os: OsKind): { url: string; name: string } | null {
  const patterns = ASSET_PATTERNS[os];
  for (const pattern of patterns) {
    const asset = assets.find((a) => pattern.test(a.name));
    if (asset) return { url: asset.browser_download_url, name: asset.name };
  }
  return null;
}

function allDownloadOptions(assets: GitHubAsset[]): { os: OsKind; url: string; name: string }[] {
  const results: { os: OsKind; url: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const os of ["win", "mac-arm64", "mac-x64", "linux"] as OsKind[]) {
    const found = findAssetForOs(assets, os);
    if (found && !seen.has(found.url)) {
      seen.add(found.url);
      results.push({ os, ...found });
    }
  }
  for (const a of assets) {
    if (/\.deb$/i.test(a.name) && !results.some((r) => r.url === a.browser_download_url)) {
      results.push({ os: "linux", url: a.browser_download_url, name: a.name });
    }
    if (/\.rpm$/i.test(a.name) && !results.some((r) => r.url === a.browser_download_url)) {
      results.push({ os: "linux", url: a.browser_download_url, name: a.name });
    }
  }
  return results;
}

export type LatestReleaseState = {
  updateAvailable: boolean;
  latestVersion: string | null;
  currentVersion: string | null;
  changelog: string | null;
  downloadUrl: string | null;
  downloadName: string | null;
  allDownloads: { os: OsKind; url: string; name: string }[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useLatestRelease(): LatestReleaseState {
  const [data, setData] = useState<{
    tag_name: string;
    assets: GitHubAsset[];
    body?: string | null;
  } | null>(null);
  const {
    version: serverVersion,
    loading: serverVersionLoading,
    refetch: refetchServerVersion,
  } = useServerVersion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRelease = useCallback(async () => {
    setLoading(true);
    await refetchServerVersion();

    if (!GITHUB_REPO || GITHUB_REPO.trim() === "") {
      setLoading(false);
      return;
    }
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { at, payload } = JSON.parse(cached);
        if (Date.now() - at < CACHE_TTL_MS && payload) {
          setData(payload);
          setLoading(false);
          return;
        }
      } catch {
        // ignore
      }
    }
    setError(null);
    try {
      const [owner, repo] = GITHUB_REPO.split("/").map((s) => s.trim()).filter(Boolean);
      if (!owner || !repo) {
        setLoading(false);
        return;
      }
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
        headers: { Accept: "application/vnd.github.v3+json" },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setLoading(false);
          return;
        }
        throw new Error(`GitHub API: ${res.status}`);
      }
      const json: GitHubRelease = await res.json();
      const payload = {
        tag_name: json.tag_name,
        assets: json.assets || [],
        body: json.body ?? null,
      };
      setData(payload);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), payload }));
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [refetchServerVersion]);

  useEffect(() => {
    fetchRelease();
  }, [fetchRelease]);

  const latestVersion = data?.tag_name?.replace(/^v/i, "") ?? null;
  const currentVersion = serverVersion;
  const updateAvailable = useMemo(
    () =>
      Boolean(
        latestVersion &&
          currentVersion &&
          data?.assets?.length &&
          versionGreater(latestVersion, currentVersion)
      ),
    [latestVersion, currentVersion, data?.assets?.length]
  );

  // After upgrading the server, the SPA may still hold the old /version until we poll or the tab regains focus.
  useEffect(() => {
    if (!updateAvailable) return;
    const id = window.setInterval(() => {
      void refetchServerVersion();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [updateAvailable, refetchServerVersion]);

  useEffect(() => {
    if (!updateAvailable) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void refetchServerVersion();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [updateAvailable, refetchServerVersion]);

  const os = detectOs();
  const primary = data?.assets ? findAssetForOs(data.assets, os) : null;
  const allDownloads = data?.assets ? allDownloadOptions(data.assets) : [];

  return {
    updateAvailable,
    latestVersion,
    currentVersion: serverVersion,
    changelog: data?.body?.trim() || null,
    downloadUrl: primary?.url ?? null,
    downloadName: primary?.name ?? null,
    allDownloads,
    loading: loading || serverVersionLoading,
    error,
    refetch: fetchRelease,
  };
}
