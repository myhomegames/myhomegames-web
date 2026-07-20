import { useState, useEffect, useCallback, useMemo } from "react";
import { GITHUB_REPO } from "../config";
import { useServerVersion } from "./useServerVersion";
import {
  detectServerOs,
  findServerAssetForOs,
  listServerDownloadOptions,
  type ServerOsKind,
} from "../utils/serverDownload";

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

export type OsKind = ServerOsKind;

export type LatestReleaseState = {
  updateAvailable: boolean;
  latestVersion: string | null;
  currentVersion: string | null;
  changelog: string | null;
  downloadUrl: string | null;
  downloadName: string | null;
  allDownloads: { os: ServerOsKind; url: string; name: string }[];
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

  const os = detectServerOs();
  const primaryAsset = data?.assets ? findServerAssetForOs(data.assets, os) : null;
  const primary = primaryAsset
    ? { url: primaryAsset.browser_download_url, name: primaryAsset.name }
    : null;
  const allDownloads = data?.assets ? listServerDownloadOptions(data.assets) : [];

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
