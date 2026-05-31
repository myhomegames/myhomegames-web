import { describe, expect, it } from "vitest";
import { clearLegacyIgdbCredentialStorage, isIgdbApiEnabled } from "./igdbApi";

describe("igdbApi", () => {
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
});
