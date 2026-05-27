import { describe, expect, it } from "vitest";
import { formatTwitchAuthError } from "./twitchAuthErrors";

describe("formatTwitchAuthError", () => {
  it("maps Invalid client credentials to a secret hint", () => {
    expect(formatTwitchAuthError("Invalid client credentials")).toContain("Client Secret");
  });

  it("unwraps twitch_secret_required prefix", () => {
    expect(
      formatTwitchAuthError("twitch_secret_required: Custom message")
    ).toBe("Custom message");
  });
});
