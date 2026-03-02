import { describe, it, expect } from "vitest";
import { normalizeWebsites, areWebsitesEqual } from "./editGameUtils";

describe("normalizeWebsites", () => {
  it("returns empty array for null or undefined", () => {
    expect(normalizeWebsites(null)).toEqual([]);
    expect(normalizeWebsites(undefined)).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(normalizeWebsites([])).toEqual([]);
  });

  it("trims URLs and filters empty", () => {
    expect(
      normalizeWebsites([
        { url: "  https://a.com  ", category: 1 },
        { url: "", category: 2 },
        { url: "https://b.com" },
      ])
    ).toEqual([
      { url: "https://a.com", category: 1 },
      { url: "https://b.com", category: undefined },
    ]);
  });

  it("preserves category when present", () => {
    expect(normalizeWebsites([{ url: "https://x.com", category: 3 }])).toEqual([
      { url: "https://x.com", category: 3 },
    ]);
  });
});

describe("areWebsitesEqual", () => {
  it("returns true for empty arrays", () => {
    expect(areWebsitesEqual([], [])).toBe(true);
  });

  it("returns false when lengths differ", () => {
    expect(areWebsitesEqual([{ url: "https://a.com" }], [])).toBe(false);
    expect(areWebsitesEqual([], [{ url: "https://a.com" }])).toBe(false);
  });

  it("returns true when url and category match", () => {
    const a = [{ url: "https://a.com", category: 1 }];
    const b = [{ url: "https://a.com", category: 1 }];
    expect(areWebsitesEqual(a, b)).toBe(true);
  });

  it("returns false when url differs", () => {
    const a = [{ url: "https://a.com" }];
    const b = [{ url: "https://b.com" }];
    expect(areWebsitesEqual(a, b)).toBe(false);
  });

  it("returns false when category differs", () => {
    const a = [{ url: "https://a.com", category: 1 }];
    const b = [{ url: "https://a.com", category: 2 }];
    expect(areWebsitesEqual(a, b)).toBe(false);
  });

  it("returns true when both have undefined category", () => {
    const a = [{ url: "https://a.com" }];
    const b = [{ url: "https://a.com" }];
    expect(areWebsitesEqual(a, b)).toBe(true);
  });
});
