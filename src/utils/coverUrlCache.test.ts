import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  bumpCoverCache,
  normalizeCoverCacheKey,
  resolveStableCoverUrl,
} from "./coverUrlCache";

describe("coverUrlCache", () => {
  const apiBase = "http://localhost:4000";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes server paths and strips query strings", () => {
    expect(normalizeCoverCacheKey("/covers/1.jpg?t=1")).toBe("/covers/1.jpg");
    expect(normalizeCoverCacheKey("http://localhost:4000/covers/2.jpg?x=1")).toBe(
      "/covers/2.jpg",
    );
  });

  it("returns stable URL for the same cover path", () => {
    const first = resolveStableCoverUrl(apiBase, "/covers/game-1.jpg");
    const second = resolveStableCoverUrl(apiBase, "/covers/game-1.jpg");
    expect(first).toBe(second);
    expect(first).toContain("/covers/game-1.jpg");
    expect(first).toMatch(/[?&]t=\d+/);
  });

  it("keeps external fallback URLs intact (IGDB)", () => {
    const igdb = "https://images.igdb.com/igdb/image/upload/t_1080p/co1234.png";
    expect(resolveStableCoverUrl(apiBase, igdb)).toBe(igdb);
  });

  it("bumps cache timestamp for the same path", () => {
    const now = vi.spyOn(Date, "now");
    now.mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    const before = resolveStableCoverUrl(apiBase, "/covers/bump-me.jpg");
    bumpCoverCache("/covers/bump-me.jpg");
    const after = resolveStableCoverUrl(apiBase, "/covers/bump-me.jpg");
    expect(after).not.toBe(before);
    now.mockRestore();
  });
});
