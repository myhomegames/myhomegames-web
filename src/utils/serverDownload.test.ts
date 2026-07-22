import { describe, it, expect, vi, afterEach } from "vitest";
import {
  detectLinuxFlavor,
  detectServerOs,
  findServerAssetForOs,
  isPhoneWithoutServerPackage,
  listServerDownloadOptions,
  resolveServerDownloadOffer,
  SERVER_RELEASES_URL,
} from "./serverDownload";

function stubDesktopNavigator(userAgent: string) {
  vi.stubGlobal("navigator", {
    userAgent,
    maxTouchPoints: 0,
  });
  vi.stubGlobal("window", {
    ...window,
    matchMedia: () => ({ matches: false }),
    screen: { width: 1920, height: 1080 },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("detectLinuxFlavor", () => {
  it("maps Ubuntu/Debian to linux-deb", () => {
    expect(detectLinuxFlavor("Mozilla/5.0 (X11; Ubuntu; Linux x86_64)")).toBe("linux-deb");
    expect(detectLinuxFlavor("Mozilla/5.0 (X11; Linux x86_64; Debian)")).toBe("linux-deb");
  });

  it("maps Fedora/RHEL family to linux-rpm", () => {
    expect(detectLinuxFlavor("Mozilla/5.0 (X11; Fedora; Linux x86_64)")).toBe("linux-rpm");
    expect(detectLinuxFlavor("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Fedora/39")).toBe(
      "linux-rpm",
    );
  });

  it("falls back to generic linux when distro is unknown", () => {
    expect(detectLinuxFlavor("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")).toBe("linux");
  });
});

describe("isPhoneWithoutServerPackage", () => {
  it("detects Android even though UA also contains Linux", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro XL) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      maxTouchPoints: 5,
    });
    expect(isPhoneWithoutServerPackage()).toBe(true);
  });

  it("detects iPhone", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      maxTouchPoints: 5,
    });
    expect(isPhoneWithoutServerPackage()).toBe(true);
  });
});

describe("findServerAssetForOs", () => {
  const assets = [
    {
      name: "MyHomeGames-1.2.0-linux-x64.tar.gz",
      browser_download_url: "https://example.com/tgz",
    },
    {
      name: "myhomegames-server_1.2.0_amd64.deb",
      browser_download_url: "https://example.com/deb",
    },
    {
      name: "myhomegames-server-1.2.0-1.x86_64.rpm",
      browser_download_url: "https://example.com/rpm",
    },
    {
      name: "MyHomeGames-1.0.0-mac-arm64.pkg",
      browser_download_url: "https://x/pkg",
    },
  ];

  it("prefers .deb for linux-deb", () => {
    expect(findServerAssetForOs(assets, "linux-deb")?.browser_download_url).toBe(
      "https://example.com/deb",
    );
  });

  it("prefers .rpm for linux-rpm", () => {
    expect(findServerAssetForOs(assets, "linux-rpm")?.browser_download_url).toBe(
      "https://example.com/rpm",
    );
  });

  it("prefers tar.gz for generic linux", () => {
    expect(findServerAssetForOs(assets, "linux")?.browser_download_url).toBe(
      "https://example.com/tgz",
    );
  });

  it("matches mac arm64 pkg pattern", () => {
    const asset = findServerAssetForOs(assets, "mac-arm64");
    expect(asset?.browser_download_url).toBe("https://x/pkg");
  });
});

describe("listServerDownloadOptions", () => {
  it("lists deb, rpm and tar.gz as distinct options", () => {
    const options = listServerDownloadOptions([
      {
        name: "MyHomeGames-1.2.0-linux-x64.tar.gz",
        browser_download_url: "https://example.com/tgz",
      },
      {
        name: "myhomegames-server_1.2.0_amd64.deb",
        browser_download_url: "https://example.com/deb",
      },
      {
        name: "myhomegames-server-1.2.0-1.x86_64.rpm",
        browser_download_url: "https://example.com/rpm",
      },
    ]);
    expect(options.map((o) => o.os)).toEqual(["linux-deb", "linux-rpm", "linux"]);
    expect(options.map((o) => o.name)).toEqual([
      "myhomegames-server_1.2.0_amd64.deb",
      "myhomegames-server-1.2.0-1.x86_64.rpm",
      "MyHomeGames-1.2.0-linux-x64.tar.gz",
    ]);
  });
});

describe("resolveServerDownloadOffer", () => {
  it("returns .deb for Ubuntu UA", async () => {
    stubDesktopNavigator("Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [
          {
            name: "MyHomeGames-1.2.0-linux-x64.tar.gz",
            browser_download_url: "https://github.com/example/asset.tgz",
          },
          {
            name: "myhomegames-server_1.2.0_amd64.deb",
            browser_download_url: "https://github.com/example/asset.deb",
          },
          {
            name: "myhomegames-server-1.2.0-1.x86_64.rpm",
            browser_download_url: "https://github.com/example/asset.rpm",
          },
        ],
      }),
    });

    const offer = await resolveServerDownloadOffer(fetchMock as typeof fetch);
    expect(detectServerOs()).toBe("linux-deb");
    expect(offer.platformSpecific).toBe(true);
    expect(offer.url).toBe("https://github.com/example/asset.deb");
    expect(offer.fileName).toBe("myhomegames-server_1.2.0_amd64.deb");
  });

  it("returns platform asset URL from latest GitHub release", async () => {
    stubDesktopNavigator("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [
          {
            name: "MyHomeGames-1.2.0-linux-x64.tar.gz",
            browser_download_url: "https://github.com/example/asset.tgz",
          },
          {
            name: "MyHomeGames-1.2.0-win-x64.zip",
            browser_download_url: "https://github.com/example/asset.zip",
          },
        ],
      }),
    });

    const offer = await resolveServerDownloadOffer(fetchMock as typeof fetch);
    expect(offer.platformSpecific).toBe(true);
    expect(offer.url).toBe("https://github.com/example/asset.tgz");
    expect(offer.fileName).toBe("MyHomeGames-1.2.0-linux-x64.tar.gz");
  });

  it("does not offer a Linux package asset on Android", async () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro XL) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      maxTouchPoints: 5,
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [
          {
            name: "MyHomeGames-1.2.0-linux-x64.tar.gz",
            browser_download_url: "https://github.com/example/asset.tgz",
          },
        ],
      }),
    });

    const offer = await resolveServerDownloadOffer(fetchMock as typeof fetch);
    expect(offer.platformSpecific).toBe(false);
    expect(offer.url).toBe(SERVER_RELEASES_URL);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to releases page when GitHub API fails", async () => {
    stubDesktopNavigator("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36");
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));

    const offer = await resolveServerDownloadOffer(fetchMock as typeof fetch);
    expect(offer.platformSpecific).toBe(false);
    expect(offer.url).toBe(SERVER_RELEASES_URL);
    expect(offer.fileName).toBeNull();
  });

  it("falls back to releases page when no asset matches OS", async () => {
    stubDesktopNavigator("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [{ name: "README.md", browser_download_url: "https://x/readme" }],
      }),
    });

    const offer = await resolveServerDownloadOffer(fetchMock as typeof fetch);
    expect(offer.platformSpecific).toBe(false);
    expect(offer.url).toBe(SERVER_RELEASES_URL);
  });
});
