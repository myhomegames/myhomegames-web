import { describe, it, expect } from "vitest";
import {
  GAME_TYPE_IDS,
  toGameTypeId,
  displayGameType,
} from "./gameType";

describe("GAME_TYPE_IDS", () => {
  it("lists ids 0 through 14", () => {
    expect(GAME_TYPE_IDS).toHaveLength(15);
    expect(GAME_TYPE_IDS[0]).toBe(0);
    expect(GAME_TYPE_IDS[14]).toBe(14);
    expect([...GAME_TYPE_IDS].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 15 }, (_, i) => i)
    );
  });
});

describe("toGameTypeId", () => {
  it("returns undefined for nullish", () => {
    expect(toGameTypeId(null)).toBeUndefined();
    expect(toGameTypeId(undefined)).toBeUndefined();
  });

  it("returns number for numeric id", () => {
    expect(toGameTypeId(0)).toBe(0);
    expect(toGameTypeId(11)).toBe(11);
  });

  it("accepts legacy { id }", () => {
    expect(toGameTypeId({ id: 4 })).toBe(4);
  });

  it("returns undefined for invalid values", () => {
    expect(toGameTypeId("1" as unknown as number)).toBeUndefined();
  });
});

describe("displayGameType", () => {
  it("returns empty string for nullish or invalid", () => {
    expect(displayGameType(null)).toBe("");
    expect(displayGameType(undefined)).toBe("");
    expect(displayGameType(Number.NaN)).toBe("");
  });

  it("hides main game and keeps other known ids visible", () => {
    expect(displayGameType(0)).toBe("");
    expect(displayGameType(1).length).toBeGreaterThan(0);
  });
});
