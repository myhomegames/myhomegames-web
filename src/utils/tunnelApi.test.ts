import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adoptRemoteTunnelApi,
  connectTunnelWithFallback,
  getAppReturnUrl,
  getDeviceLinkUrl,
  getTunnelManagerAuthUrl,
  normalizePublicTunnelUrl,
  pollDevicePairing,
  requestDevicePairingCode,
} from "./tunnelApi";

vi.mock("../config", () => ({
  LOCAL_API_BASE: "http://localhost:4000",
  setTunnelApiBase: vi.fn(),
}));

import { setTunnelApiBase } from "../config";

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
    mockLocation("https://myhomegames.vige.it", "/app/settings");
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

describe("normalizePublicTunnelUrl", () => {
  it("adds https scheme and strips trailing slash", () => {
    expect(normalizePublicTunnelUrl("user-myhomegames-server.vige.it/")).toBe(
      "https://user-myhomegames-server.vige.it",
    );
  });
});

describe("device pairing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("getDeviceLinkUrl points at /link and optional code", () => {
    expect(getDeviceLinkUrl()).toBe("https://myhomegames-server.vige.it/link");
    expect(getDeviceLinkUrl("ABCD-EFGH")).toBe(
      "https://myhomegames-server.vige.it/link?code=ABCDEFGH",
    );
  });

  it("requestDevicePairingCode parses manager response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          device_code: "dev123",
          user_code: "ABCD-EFGH",
          verification_uri: "https://myhomegames-server.vige.it/link",
          verification_uri_complete: "https://myhomegames-server.vige.it/link?code=ABCDEFGH",
          expires_in: 600,
          interval: 5,
        }),
      }),
    );
    const session = await requestDevicePairingCode();
    expect(session.user_code).toBe("ABCD-EFGH");
    expect(session.device_code).toBe("dev123");
  });

  it("pollDevicePairing maps pending / ok", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "authorization_pending" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "ok",
          token: "tok",
          url: "user-myhomegames-server.vige.it",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    await expect(pollDevicePairing("dev123")).resolves.toEqual({
      status: "authorization_pending",
    });
    await expect(pollDevicePairing("dev123")).resolves.toEqual({
      status: "ok",
      token: "tok",
      url: "user-myhomegames-server.vige.it",
    });
  });
});

describe("connectTunnelWithFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(setTunnelApiBase).mockClear();
  });

  it("adopts public URL when local tunnel control is unreachable", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          featureEnabled: true,
          hasStoredToken: true,
          connected: true,
          publicUrl: "https://user-myhomegames-server.vige.it",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const status = await connectTunnelWithFallback("tok", "user-myhomegames-server.vige.it");
    expect(status.connected).toBe(true);
    expect(setTunnelApiBase).toHaveBeenCalledWith("https://user-myhomegames-server.vige.it");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("adoptRemoteTunnelApi throws when home tunnel is not connected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          featureEnabled: true,
          hasStoredToken: true,
          connected: false,
          publicUrl: "https://user-myhomegames-server.vige.it",
        }),
      }),
    );

    await expect(
      adoptRemoteTunnelApi("https://user-myhomegames-server.vige.it"),
    ).rejects.toThrow("tunnel_not_connected");
  });
});
