import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppReturnUrl, getTunnelManagerAuthUrl } from "./tunnelApi";

function mockLocation(origin: string, pathname: string) {
  vi.stubGlobal("location", {
    origin,
    pathname,
    search: "",
    hash: "",
  });
}

describe("tunnelApi return URL", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getAppReturnUrl uses /app/ when pathname is under the SPA mount", () => {
    mockLocation("https://myhomegames.vige.it", "/app/login");
    expect(getAppReturnUrl()).toBe("https://myhomegames.vige.it/app/");
  });

  it("getAppReturnUrl uses /app/ when pathname is exactly /app", () => {
    mockLocation("https://myhomegames.vige.it", "/app");
    expect(getAppReturnUrl()).toBe("https://myhomegames.vige.it/app/");
  });

  it("getTunnelManagerAuthUrl embeds return_to in path and query", () => {
    mockLocation("https://myhomegames.vige.it", "/app/");
    const url = new URL(getTunnelManagerAuthUrl());
    expect(url.pathname).toMatch(/^\/api\/get-token\/r\//);
    expect(url.searchParams.get("return_to")).toBe("https://myhomegames.vige.it/app/");
    const segment = url.pathname.slice("/api/get-token/r/".length);
    const decoded = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
    expect(decoded).toBe("https://myhomegames.vige.it/app/");
  });
});
