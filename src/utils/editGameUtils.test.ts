import { describe, it, expect } from "vitest";
import { normalizeWebsites, areWebsitesEqual, normalizeSimilarGames, areSimilarGamesEqual } from "./editGameUtils";

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

describe("normalizeSimilarGames", () => {
  it("returns empty array for null or undefined", () => {
    expect(normalizeSimilarGames(null)).toEqual([]);
    expect(normalizeSimilarGames(undefined)).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(normalizeSimilarGames([])).toEqual([]);
  });

  it("normalizes id to number and name to string", () => {
    expect(
      normalizeSimilarGames([
        { id: 1, name: "Game A" },
        { id: "2", name: "Game B" },
      ])
    ).toEqual([
      { id: 1, name: "Game A" },
      { id: 2, name: "Game B" },
    ]);
  });

  it("uses id as name when name is missing or empty", () => {
    expect(normalizeSimilarGames([{ id: 42 }, { id: 10, name: "" }])).toEqual([
      { id: 42, name: "42" },
      { id: 10, name: "10" },
    ]);
  });

  it("trims name", () => {
    expect(normalizeSimilarGames([{ id: 1, name: "  Foo  " }])).toEqual([{ id: 1, name: "Foo" }]);
  });

  it("filters out invalid items and deduplicates by id", () => {
    expect(
      normalizeSimilarGames([
        { id: 1, name: "A" },
        { id: null as unknown as number, name: "B" },
        { id: 1, name: "A again" },
        { id: 2, name: "B" },
      ])
    ).toEqual([
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ]);
  });

  it("filters out NaN ids", () => {
    expect(normalizeSimilarGames([{ id: "not-a-number", name: "X" }])).toEqual([]);
  });
});

describe("areSimilarGamesEqual", () => {
  it("returns true for empty arrays", () => {
    expect(areSimilarGamesEqual([], [])).toBe(true);
  });

  it("returns false when lengths differ", () => {
    expect(areSimilarGamesEqual([{ id: 1, name: "A" }], [])).toBe(false);
    expect(areSimilarGamesEqual([], [{ id: 1, name: "A" }])).toBe(false);
  });

  it("returns true when id and name match", () => {
    const a = [{ id: 1, name: "Game A" }];
    const b = [{ id: 1, name: "Game A" }];
    expect(areSimilarGamesEqual(a, b)).toBe(true);
  });

  it("returns false when id differs", () => {
    const a = [{ id: 1, name: "A" }];
    const b = [{ id: 2, name: "A" }];
    expect(areSimilarGamesEqual(a, b)).toBe(false);
  });

  it("returns false when name differs", () => {
    const a = [{ id: 1, name: "A" }];
    const b = [{ id: 1, name: "B" }];
    expect(areSimilarGamesEqual(a, b)).toBe(false);
  });
});
