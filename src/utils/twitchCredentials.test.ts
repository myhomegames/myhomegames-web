import { describe, expect, it, beforeEach } from "vitest";
import {
  applyTwitchCredentialsToLocalStorage,
  hasIgdbApiCredentials,
  isIgdbApiActive,
  resolveTwitchClientSecret,
} from "./twitchCredentials";

describe("twitchCredentials", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes secret from localStorage when server has no secret", () => {
    localStorage.setItem("twitch_client_secret", "stale-secret");
    localStorage.setItem("twitch_client_id", "id");

    const source = {
      twitchApiEnabled: true,
      serverClientId: "id",
      serverClientSecret: "",
      settingsLoaded: true,
    };

    expect(resolveTwitchClientSecret(source)).toBe("");
    expect(localStorage.getItem("twitch_client_secret")).toBeNull();
  });

  it("clears localStorage when API credentials are disabled", () => {
    localStorage.setItem("twitch_client_id", "id");
    localStorage.setItem("twitch_client_secret", "sec");
    applyTwitchCredentialsToLocalStorage("id", "sec", false);
    expect(localStorage.getItem("twitch_client_id")).toBeNull();
    expect(localStorage.getItem("twitch_client_secret")).toBeNull();
  });

  it("isIgdbApiActive requires enabled flag and both credentials", () => {
    expect(isIgdbApiActive(true, "id", "sec")).toBe(true);
    expect(isIgdbApiActive(false, "id", "sec")).toBe(false);
    expect(isIgdbApiActive(true, "id", "")).toBe(false);
  });

  it("hasIgdbApiCredentials requires both id and secret", () => {
    expect(hasIgdbApiCredentials("id", "sec")).toBe(true);
    expect(hasIgdbApiCredentials("id", "")).toBe(false);
  });
});
