import { describe, it, expect } from "vitest";
import { getEmbedVideoUrl, normalizeVideoUrl, buildApiUrl, buildCoverUrl } from "./api";

describe("normalizeVideoUrl", () => {
  it("converts youtube watch URL to embed", () => {
    expect(
      normalizeVideoUrl("https://www.youtube.com/watch?v=abc123")
    ).toBe("https://www.youtube.com/embed/abc123");
    expect(
      normalizeVideoUrl("https://youtube.com/watch?v=xyz789")
    ).toBe("https://www.youtube.com/embed/xyz789");
  });

  it("converts youtu.be and shorts URLs to embed", () => {
    expect(normalizeVideoUrl("https://youtu.be/abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
    expect(normalizeVideoUrl("https://www.youtube.com/shorts/abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("keeps existing embed URLs canonical", () => {
    expect(
      normalizeVideoUrl("https://www.youtube.com/embed/abc123?rel=0")
    ).toBe("https://www.youtube.com/embed/abc123");
    expect(
      normalizeVideoUrl("https://www.youtube-nocookie.com/embed/abc123")
    ).toBe("https://www.youtube.com/embed/abc123");
  });

  it("returns other URLs unchanged", () => {
    const vimeo = "https://player.vimeo.com/video/123";
    expect(normalizeVideoUrl(vimeo)).toBe(vimeo);
  });

  it("returns empty string for empty or whitespace input", () => {
    expect(normalizeVideoUrl("")).toBe("");
    expect(normalizeVideoUrl("   ")).toBe("");
  });

  it("trims input", () => {
    expect(
      normalizeVideoUrl("  https://www.youtube.com/watch?v=id  ")
    ).toBe("https://www.youtube.com/embed/id");
  });

  it("handles invalid URL by returning trimmed input", () => {
    const invalid = "not-a-url";
    expect(normalizeVideoUrl(invalid)).toBe(invalid);
  });
});

describe("getEmbedVideoUrl", () => {
  it("converts youtube.com embed to youtube-nocookie.com", () => {
    expect(
      getEmbedVideoUrl("https://www.youtube.com/embed/abc123")
    ).toBe("https://www.youtube-nocookie.com/embed/abc123");
    expect(
      getEmbedVideoUrl("https://youtube.com/embed/xyz?rel=0")
    ).toBe("https://www.youtube-nocookie.com/embed/xyz");
  });

  it("converts youtube watch URL to youtube-nocookie embed", () => {
    expect(
      getEmbedVideoUrl("https://www.youtube.com/watch?v=abc123")
    ).toBe("https://www.youtube-nocookie.com/embed/abc123");
  });

  it("returns other URLs unchanged", () => {
    const vimeo = "https://player.vimeo.com/video/123";
    expect(getEmbedVideoUrl(vimeo)).toBe(vimeo);
    const nocookie = "https://www.youtube-nocookie.com/embed/abc";
    expect(getEmbedVideoUrl(nocookie)).toBe(nocookie);
  });

  it("returns empty string for empty or whitespace input", () => {
    expect(getEmbedVideoUrl("")).toBe("");
    expect(getEmbedVideoUrl("   ")).toBe("");
  });

  it("trims input", () => {
    expect(
      getEmbedVideoUrl("  https://www.youtube.com/embed/id  ")
    ).toBe("https://www.youtube-nocookie.com/embed/id");
  });

  it("handles invalid URL by returning trimmed input", () => {
    const invalid = "not-a-url";
    expect(getEmbedVideoUrl(invalid)).toBe(invalid);
  });
});

describe("buildApiUrl", () => {
  it("builds URL from base and path", () => {
    expect(buildApiUrl("http://localhost:4000", "/games/1")).toBe(
      "http://localhost:4000/games/1"
    );
  });

  it("adds query params when provided", () => {
    const url = buildApiUrl("http://api", "/games", { a: "1", b: 2 });
    expect(url).toContain("http://api/games");
    expect(url).toContain("a=1");
    expect(url).toContain("b=2");
  });
});

describe("buildCoverUrl", () => {
  it("returns empty string for empty cover", () => {
    expect(buildCoverUrl("http://api", undefined)).toBe("");
    expect(buildCoverUrl("http://api", "")).toBe("");
  });

  it("returns full URL as-is when cover starts with http", () => {
    const full = "https://example.com/cover.jpg";
    expect(buildCoverUrl("http://api", full)).toBe(full);
  });

  it("resolves relative path against apiBase", () => {
    expect(buildCoverUrl("http://localhost:4000", "/covers/1")).toBe(
      "http://localhost:4000/covers/1"
    );
  });
});
