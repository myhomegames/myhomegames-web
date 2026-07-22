/** Mirrors docs/index.html on main (homepage download button). */
export const GITHUB_SERVER_REPO = "myhomegames/myhomegames-server";

export const SERVER_RELEASES_URL =
  "https://github.com/myhomegames/myhomegames-server/releases";

export type ServerOsKind =
  | "win"
  | "mac-arm64"
  | "mac-x64"
  | "linux-deb"
  | "linux-rpm"
  | "linux";

export const SERVER_OS_I18N_KEY: Record<ServerOsKind, string> = {
  win: "header.downloadWindows",
  "mac-arm64": "header.downloadMacArm",
  "mac-x64": "header.downloadMacIntel",
  "linux-deb": "header.downloadLinuxDeb",
  "linux-rpm": "header.downloadLinuxRpm",
  linux: "header.downloadLinux",
};

/** Platforms listed in the update popup (primary OS first is handled separately). */
export const SERVER_OS_DOWNLOAD_ORDER: ServerOsKind[] = [
  "win",
  "mac-arm64",
  "mac-x64",
  "linux-deb",
  "linux-rpm",
  "linux",
];

type GitHubAsset = { name: string; browser_download_url: string };

const ASSET_PATTERNS: Record<ServerOsKind, RegExp[]> = {
  win: [/MyHomeGames-[0-9.]+-win-x64\.zip$/i],
  "mac-arm64": [/MyHomeGames-[0-9.]+-mac-arm64\.pkg$/i],
  "mac-x64": [/MyHomeGames-[0-9.]+-mac-x64\.pkg$/i],
  "linux-deb": [
    /myhomegames-server_[0-9.]+_amd64\.deb$/i,
    /MyHomeGames-[0-9.]+-linux-x64\.tar\.gz$/i,
  ],
  "linux-rpm": [
    /myhomegames-server-[0-9.]+-1\.x86_64\.rpm$/i,
    /MyHomeGames-[0-9.]+-linux-x64\.tar\.gz$/i,
  ],
  linux: [/MyHomeGames-[0-9.]+-linux-x64\.tar\.gz$/i],
};

/** Browsers often embed the distro name in the UA (Chrome/Firefox on Linux). */
export function detectLinuxFlavor(ua: string): "linux-deb" | "linux-rpm" | "linux" {
  const lower = ua.toLowerCase();
  if (
    /ubuntu|debian|linux mint|mint\/|pop!_os|elementary|kali|raspbian|zorin|mx linux|chrome.?os/i.test(
      lower,
    )
  ) {
    return "linux-deb";
  }
  if (
    /fedora|centos|red hat|rhel|rocky|alma|suse|opensuse|mageia|mandriva|nobara/i.test(
      lower,
    )
  ) {
    return "linux-rpm";
  }
  return "linux";
}

/** True for phones/tablets that should not get a desktop server package. */
export function isPhoneWithoutServerPackage(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua) || /iPhone|iPod|iPad/i.test(ua)) return true;

  const uaData = navigator as Navigator & {
    userAgentData?: { mobile?: boolean; platform?: string };
  };
  const uad = uaData.userAgentData;
  if (uad?.mobile === true) return true;
  if (typeof uad?.platform === "string" && /android|ios/i.test(uad.platform)) {
    return true;
  }

  // iPadOS 13+ desktop UA
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;

  // "Desktop site" on phones: Linux UA without "Android", but coarse touch + phone-sized screen
  try {
    if (
      navigator.maxTouchPoints > 0 &&
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches
    ) {
      const shortest = Math.min(window.screen?.width || 0, window.screen?.height || 0);
      if (shortest > 0 && shortest <= 920) return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export function detectServerOs(): ServerOsKind {
  if (typeof navigator === "undefined") return "linux";
  const ua = navigator.userAgent.toLowerCase();
  const uaData = navigator as Navigator & {
    userAgentData?: { platform?: string; architecture?: string; mobile?: boolean };
  };
  const platform = uaData.userAgentData?.platform?.toLowerCase();
  const arch = uaData.userAgentData?.architecture?.toLowerCase();

  if (ua.includes("win") || platform === "windows") return "win";

  // iPhone UA contains "mac os x" — do not treat phones as macOS desktop packages.
  if (
    (ua.includes("mac") || platform === "macos") &&
    !/iphone|ipod|ipad/i.test(ua) &&
    platform !== "ios" &&
    !isPhoneWithoutServerPackage()
  ) {
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

  // Android UA contains "linux" — never map phones to a Linux server package flavor.
  if (
    /android/i.test(ua) ||
    platform === "android" ||
    /iphone|ipod|ipad/i.test(ua) ||
    platform === "ios" ||
    isPhoneWithoutServerPackage()
  ) {
    return "linux";
  }

  if (
    ua.includes("linux") ||
    ua.includes("x11") ||
    platform === "linux" ||
    platform === "chrome os"
  ) {
    return detectLinuxFlavor(ua);
  }
  return "linux";
}

export function findServerAssetForOs(
  assets: GitHubAsset[],
  os: ServerOsKind,
): GitHubAsset | null {
  const patterns = ASSET_PATTERNS[os] ?? [];
  for (const pattern of patterns) {
    const asset = assets.find((a) => pattern.test(a.name));
    if (asset) return asset;
  }
  return null;
}

export function listServerDownloadOptions(
  assets: GitHubAsset[],
): { os: ServerOsKind; url: string; name: string }[] {
  const results: { os: ServerOsKind; url: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const os of SERVER_OS_DOWNLOAD_ORDER) {
    const found = findServerAssetForOs(assets, os);
    if (found && !seen.has(found.browser_download_url)) {
      seen.add(found.browser_download_url);
      results.push({
        os,
        url: found.browser_download_url,
        name: found.name,
      });
    }
  }
  return results;
}

export type ServerDownloadOffer = {
  url: string;
  os: ServerOsKind;
  fileName: string | null;
  /** True when the URL points to a platform-specific release asset. */
  platformSpecific: boolean;
};

/** Same resolution as setupDownloadButton() in docs/index.html on main. */
export async function resolveServerDownloadOffer(
  fetchImpl: typeof fetch = fetch,
): Promise<ServerDownloadOffer> {
  const os = detectServerOs();

  // Phones have no server package — don't advertise a Linux/mac/win asset.
  if (isPhoneWithoutServerPackage()) {
    return {
      url: SERVER_RELEASES_URL,
      os,
      fileName: null,
      platformSpecific: false,
    };
  }

  try {
    const res = await fetchImpl(
      `https://api.github.com/repos/${GITHUB_SERVER_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github.v3+json" } },
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const release = (await res.json()) as { assets?: GitHubAsset[] };
    const asset = findServerAssetForOs(release.assets ?? [], os);
    if (asset) {
      return {
        url: asset.browser_download_url,
        os,
        fileName: asset.name,
        platformSpecific: true,
      };
    }
  } catch {
    // fall through to releases page
  }

  return {
    url: SERVER_RELEASES_URL,
    os,
    fileName: null,
    platformSpecific: false,
  };
}
