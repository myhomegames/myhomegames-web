import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildCatalogApiUrl,
  clearLegacyCatalogCredentialStorage,
  isCatalogSearchEnabled,
  resolveCatalogApiBase,
} from "./catalogApi";

const STORAGE_KEY = "mhg_tunnel_api_base";

describe("catalogApi", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("clearLegacyCatalogCredentialStorage removes legacy keys", () => {
    localStorage.setItem("twitch_client_secret", "stale-secret");
    localStorage.setItem("twitch_client_id", "id");
    clearLegacyCatalogCredentialStorage();
    expect(localStorage.getItem("twitch_client_secret")).toBeNull();
    expect(localStorage.getItem("twitch_client_id")).toBeNull();
  });

  it("isCatalogSearchEnabled follows twitchApiEnabled only", () => {
    expect(isCatalogSearchEnabled(true)).toBe(true);
    expect(isCatalogSearchEnabled(false)).toBe(false);
  });

  it("resolveCatalogApiBase prefers stored user tunnel hostname over localhost", () => {
    localStorage.setItem(
      STORAGE_KEY,
      "https://myhomegames-myhomegames-server.vige.it",
    );
    expect(resolveCatalogApiBase()).toBe("https://myhomegames-myhomegames-server.vige.it");
  });

  it("buildCatalogApiUrl targets the user tunnel host", () => {
    localStorage.setItem(
      STORAGE_KEY,
      "https://myhomegames-myhomegames-server.vige.it",
    );
    expect(buildCatalogApiUrl("/igdb/games-by-keyword")).toBe(
      "https://myhomegames-myhomegames-server.vige.it/igdb/games-by-keyword",
    );
  });
});
