import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readLibraryGamesSessionCache,
  writeLibraryGamesSessionCache,
} from "./sessionPageCache";

vi.mock("../config", () => ({
  API_BASE: "https://test.example",
}));

describe("sessionPageCache", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("round-trips library games for the current API base", () => {
    expect(readLibraryGamesSessionCache()).toBeNull();
    writeLibraryGamesSessionCache([
      { id: "1", title: "Game A" } as any,
    ]);
    expect(readLibraryGamesSessionCache()).toEqual([
      { id: "1", title: "Game A" },
    ]);
  });
});
