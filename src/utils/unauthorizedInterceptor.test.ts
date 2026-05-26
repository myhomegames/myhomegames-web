import { describe, expect, it } from "vitest";
import { isLocalHttpsApiBase } from "./unauthorizedInterceptor";

describe("isLocalHttpsApiBase", () => {
  it("returns true for local HTTPS API (self-signed cert flow)", () => {
    expect(isLocalHttpsApiBase("https://localhost:41440")).toBe(true);
    expect(isLocalHttpsApiBase("https://127.0.0.1:41440")).toBe(true);
  });

  it("returns false for remote HTTPS API (Cloudflare Tunnel)", () => {
    expect(isLocalHttpsApiBase("https://myhomegames-server.vige.it")).toBe(false);
  });

  it("returns false for local HTTP API", () => {
    expect(isLocalHttpsApiBase("http://localhost:4000")).toBe(false);
  });
});
