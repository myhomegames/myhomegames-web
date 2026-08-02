import { describe, expect, it, vi, afterEach } from "vitest";
import { withListFetchRetries } from "./useListDataReady";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("withListFetchRetries", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withListFetchRetries(fn, { attempts: 3, delayMs: 1 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries until success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("cold"))
      .mockRejectedValueOnce(new Error("cold"))
      .mockResolvedValue("warm");
    await expect(withListFetchRetries(fn, { attempts: 4, delayMs: 1 })).resolves.toBe("warm");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last error after exhausting attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("down"));
    await expect(withListFetchRetries(fn, { attempts: 3, delayMs: 1 })).rejects.toThrow("down");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
