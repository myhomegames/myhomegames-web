import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildIgdbApiUrl,
  clearLegacyIgdbCredentialStorage,
  isIgdbApiEnabled,
  resolveIgdbApiBase,
} from "./igdbApi";

const STORAGE_KEY = "mhg_tunnel_api_base";

describe("igdbApi", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("clearLegacyIgdbCredentialStorage removes legacy keys", () => {
    localStorage.setItem("twitch_client_secret", "stale-secret");
    localStorage.setItem("twitch_client_id", "id");
    clearLegacyIgdbCredentialStorage();
    expect(localStorage.getItem("twitch_client_secret")).toBeNull();
    expect(localStorage.getItem("twitch_client_id")).toBeNull();
  });

  it("isIgdbApiEnabled follows twitchApiEnabled only", () => {
    expect(isIgdbApiEnabled(true)).toBe(true);
    expect(isIgdbApiEnabled(false)).toBe(false);
  });

  it("resolveIgdbApiBase prefers stored user tunnel hostname over localhost", () => {
    localStorage.setItem(
      STORAGE_KEY,
      "https://myhomegames-myhomegames-server.vige.it",
    );
    expect(resolveIgdbApiBase()).toBe("https://myhomegames-myhomegames-server.vige.it");
  });

  it("buildIgdbApiUrl targets the user tunnel host", () => {
    localStorage.setItem(
      STORAGE_KEY,
      "https://myhomegames-myhomegames-server.vige.it",
    );
    expect(buildIgdbApiUrl("/igdb/games-by-keyword")).toBe(
      "https://myhomegames-myhomegames-server.vige.it/igdb/games-by-keyword",
    );
  });
});
