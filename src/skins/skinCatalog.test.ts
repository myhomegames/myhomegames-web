import { describe, expect, it } from "vitest";
import {
  findOutdatedInstalledSkins,
  isInstalledSkinOutdated,
  normalizeSkinName,
  parseSkinZipFileName,
} from "./skinCatalog";
import type { ServerSkinInfo } from "./skinApi";
import { normalizeSkinWebManifest } from "./skinWebManifest";

function skin(overrides: Partial<ServerSkinInfo> & Pick<ServerSkinInfo, "id" | "name">): ServerSkinInfo {
  return {
    web: normalizeSkinWebManifest(undefined),
    ...overrides,
  };
}

describe("skinCatalog", () => {
  it("parses versioned zip file names", () => {
    expect(parseSkinZipFileName("plex-1.0.0.mhg-skin.zip")).toEqual({
      id: "plex",
      version: "1.0.0",
    });
    expect(parseSkinZipFileName("plex.mhg-skin.zip")).toEqual({ id: "plex" });
    expect(parseSkinZipFileName("readme.txt")).toBeNull();
  });

  it("matches installed skins to catalog by normalized name", () => {
    const installed = [
      skin({ id: "a", name: "Plex", version: "1.0.0" }),
      skin({ id: "b", name: "Custom", version: "2.0.0" }),
    ];
    const catalog = [
      {
        id: "plex",
        name: "Plex",
        version: "1.1.0",
        zip: "plex-1.1.0.mhg-skin.zip",
        downloadUrl: "https://example.com/plex.zip",
      },
    ];
    expect(normalizeSkinName(" Plex ")).toBe("plex");
    expect(isInstalledSkinOutdated(installed[0], catalog[0])).toBe(true);
    expect(findOutdatedInstalledSkins(installed, catalog)).toHaveLength(1);
    expect(findOutdatedInstalledSkins(installed, catalog)[0].installed.id).toBe("a");
  });

  it("treats missing installed version as 0.0.0", () => {
    const installed = skin({ id: "a", name: "Plex" });
    const catalog = {
      id: "plex",
      name: "Plex",
      version: "0.0.1",
      zip: "plex-0.0.1.mhg-skin.zip",
      downloadUrl: "https://example.com/plex.zip",
    };
    expect(isInstalledSkinOutdated(installed, catalog)).toBe(true);
  });
});
