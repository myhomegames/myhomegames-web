import { describe, expect, it } from "vitest";
import { parseCloudflareTunnelProfile } from "./tunnelProfile";

describe("parseCloudflareTunnelProfile", () => {
  it("extracts username from user tunnel hostname", () => {
    expect(
      parseCloudflareTunnelProfile("https://luca-stancapiano-vige-it-myhomegames-server.vige.it"),
    ).toEqual({
      userName: "luca-stancapiano-vige-it",
      userId: "luca-stancapiano-vige-it-myhomegames-server.vige.it",
      publicUrl: "https://luca-stancapiano-vige-it-myhomegames-server.vige.it",
    });
  });

  it("accepts hostname without scheme", () => {
    expect(
      parseCloudflareTunnelProfile("luca-stancapiano-gmail-com-myhomegames-server.vige.it")?.userName,
    ).toBe("luca-stancapiano-gmail-com");
  });

  it("returns null for manager hostname", () => {
    expect(parseCloudflareTunnelProfile("https://myhomegames-server.vige.it")).toBeNull();
  });

  it("returns null for localhost", () => {
    expect(parseCloudflareTunnelProfile("http://localhost:4000")).toBeNull();
  });
});
