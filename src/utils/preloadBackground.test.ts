import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  collectGameBackgroundUrls,
  isBackgroundUrlWarmed,
  preloadBackgroundUrl,
  preloadBackgroundUrls,
  whenBackgroundUrlReady,
} from "./preloadBackground";

describe("collectGameBackgroundUrls", () => {
  it("builds unique URLs with per-section and total caps", () => {
    const sections = [
      {
        games: [
          { background: "/backgrounds/a" },
          { background: "/backgrounds/b" },
          { background: "/backgrounds/a" },
          { background: "" },
          { background: "/backgrounds/c" },
        ],
      },
      {
        games: [{ background: "/backgrounds/d" }, { background: "/backgrounds/e" }],
      },
    ];
    const urls = collectGameBackgroundUrls(
      sections,
      (bg) => `https://api.test${bg}`,
      { perSection: 2, maxTotal: 3 },
    );
    expect(urls).toEqual([
      "https://api.test/backgrounds/a",
      "https://api.test/backgrounds/b",
      "https://api.test/backgrounds/d",
    ]);
  });
});

describe("preloadBackgroundUrls", () => {
  let OriginalImage: typeof Image;

  beforeEach(() => {
    OriginalImage = globalThis.Image;
    class FakeImage {
      decoding = "";
      onload: ((ev: Event) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      decode = () => Promise.resolve();
      set src(_value: string) {
        queueMicrotask(() => this.onload?.(new Event("load")));
      }
    }
    globalThis.Image = FakeImage as unknown as typeof Image;
  });

  afterEach(() => {
    globalThis.Image = OriginalImage;
    vi.restoreAllMocks();
  });

  it("marks URLs warmed after load", async () => {
    preloadBackgroundUrl("https://api.test/backgrounds/x");
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(isBackgroundUrlWarmed("https://api.test/backgrounds/x")).toBe(true);
  });

  it("ignores empty URLs", () => {
    preloadBackgroundUrls(["", "  "]);
    expect(isBackgroundUrlWarmed("")).toBe(false);
  });

  it("whenBackgroundUrlReady resolves after decode", async () => {
    const ok = await whenBackgroundUrlReady("https://api.test/backgrounds/ready");
    expect(ok).toBe(true);
    expect(isBackgroundUrlWarmed("https://api.test/backgrounds/ready")).toBe(true);
  });
});
