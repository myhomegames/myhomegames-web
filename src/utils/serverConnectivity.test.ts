import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { probeServerReachable } from "./serverConnectivity";

describe("probeServerReachable", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when /version responds ok", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    await expect(probeServerReachable("http://localhost:4000")).resolves.toBe(true);
  });

  it("returns false on HTTP error", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    await expect(probeServerReachable("http://localhost:4000")).resolves.toBe(false);
  });

  it("returns false on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Failed to fetch"));
    await expect(probeServerReachable("http://localhost:4000")).resolves.toBe(false);
  });
});
