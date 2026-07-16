import { describe, it, expect, vi } from "vitest";
import {
  findServerAssetForOs,
  resolveServerDownloadOffer,
  SERVER_RELEASES_URL,
} from "./serverDownload";

describe("resolveServerDownloadOffer", () => {
  it("returns platform asset URL from latest GitHub release", async () => {
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

  it("falls back to releases page when GitHub API fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));

    const offer = await resolveServerDownloadOffer(fetchMock as typeof fetch);
    expect(offer.platformSpecific).toBe(false);
    expect(offer.url).toBe(SERVER_RELEASES_URL);
    expect(offer.fileName).toBeNull();
  });

  it("falls back to releases page when no asset matches OS", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ assets: [{ name: "README.md", browser_download_url: "https://x/readme" }] }),
    });

    const offer = await resolveServerDownloadOffer(fetchMock as typeof fetch);
    expect(offer.platformSpecific).toBe(false);
    expect(offer.url).toBe(SERVER_RELEASES_URL);
  });
});

describe("findServerAssetForOs", () => {
  it("matches mac arm64 pkg pattern", () => {
    const asset = findServerAssetForOs(
      [{ name: "MyHomeGames-1.0.0-mac-arm64.pkg", browser_download_url: "https://x/pkg" }],
      "mac-arm64",
    );
    expect(asset?.browser_download_url).toBe("https://x/pkg");
  });
});
