import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { canReachLocalServer, shouldUseRemoteStreaming } from "./playMode";

vi.mock("../config", () => ({
  getApiBase: () => "https://user-myhomegames-server.vige.it",
  isLocalApiBase: (base?: string) => {
    const host = new URL(base || "https://user-myhomegames-server.vige.it").hostname;
    return host === "localhost" || host === "127.0.0.1";
  },
  LOCAL_API_BASE: "http://127.0.0.1:4000",
}));

describe("playMode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects reachable local server", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    await expect(canReachLocalServer()).resolves.toBe(true);
  });

  it("uses local launch when home server is reachable", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    await expect(shouldUseRemoteStreaming(true)).resolves.toBe(false);
  });

  it("uses remote streaming when away from home", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    await expect(shouldUseRemoteStreaming(true)).resolves.toBe(true);
  });

  it("skips remote streaming when disabled", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    await expect(shouldUseRemoteStreaming(false)).resolves.toBe(false);
  });
});
