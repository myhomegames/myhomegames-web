import { describe, expect, it } from "vitest";
import { collectionLikeHasPlayableInContext } from "./collectionLikePlay";

describe("collectionLikeHasPlayableInContext", () => {
  const libraryGames = new Map<string, { executables?: string[] | null }>([
    ["10", { executables: null }],
    ["20", { executables: ["play"] }],
    ["30", { executables: [] }],
  ]);

  it("prefers direct playable games over children", () => {
    const idsMap = new Map<string, string[]>([
      ["parent", ["20"]],
      ["child", ["10"]],
    ]);
    const items = new Map([
      ["parent", { childs: ["child"] }],
      ["child", { childs: [] }],
    ]);
    expect(collectionLikeHasPlayableInContext("parent", idsMap, items, libraryGames)).toBe(true);
  });

  it("falls back to child collection-likes when direct games are not playable", () => {
    const idsMap = new Map<string, string[]>([
      ["parent", ["10"]],
      ["child", ["20"]],
    ]);
    const items = new Map([
      ["parent", { childs: ["child"] }],
      ["child", { childs: [] }],
    ]);
    expect(collectionLikeHasPlayableInContext("parent", idsMap, items, libraryGames)).toBe(true);
  });

  it("returns false when neither direct nor child games are playable", () => {
    const idsMap = new Map<string, string[]>([
      ["parent", ["10"]],
      ["child", ["30"]],
    ]);
    const items = new Map([
      ["parent", { childs: ["child"] }],
      ["child", { childs: [] }],
    ]);
    expect(collectionLikeHasPlayableInContext("parent", idsMap, items, libraryGames)).toBe(false);
  });

  it("returns null when a needed game-id map entry is missing", () => {
    const idsMap = new Map<string, string[]>([["parent", ["10"]]]);
    const items = new Map([
      ["parent", { childs: ["missing-child"] }],
    ]);
    expect(collectionLikeHasPlayableInContext("parent", idsMap, items, libraryGames)).toBe(null);
  });
});
