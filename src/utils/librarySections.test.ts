import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getInitialLibrarySections,
  normalizeVisibleLibraries,
  readStoredVisibleLibraries,
} from "./librarySections";

describe("librarySections", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("getInitialLibrarySections returns empty list when nothing is stored", () => {
    expect(getInitialLibrarySections()).toEqual([]);
  });

  it("getInitialLibrarySections hydrates from localStorage", () => {
    localStorage.setItem(
      "visibleLibraries",
      JSON.stringify(["library", "collections", "developers"]),
    );
    expect(getInitialLibrarySections().map((s) => s.key)).toEqual([
      "library",
      "collections",
      "developers",
    ]);
  });

  it("readStoredVisibleLibraries ignores invalid JSON", () => {
    localStorage.setItem("visibleLibraries", "not-json");
    expect(readStoredVisibleLibraries()).toBeNull();
  });

  it("normalizeVisibleLibraries keeps configured order", () => {
    expect(
      normalizeVisibleLibraries(["developers", "library", "unknown"]),
    ).toEqual(["library", "developers"]);
  });
});
