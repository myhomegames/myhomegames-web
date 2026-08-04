import { describe, expect, it } from "vitest";
import {
  filterSearchCatalog,
  MIN_SEARCH_QUERY_LENGTH,
} from "./searchCatalog";
import type { CollectionItem, GameItem } from "../types";

const game = (id: string, title: string): GameItem =>
  ({ id, title } as GameItem);
const collection = (id: string, title: string): CollectionItem =>
  ({ id, title } as CollectionItem);

describe("filterSearchCatalog", () => {
  it("requires the minimum query length", () => {
    const hits = filterSearchCatalog(
      "a",
      [game("1", "Alien")],
      [collection("c1", "Arcade")],
    );
    expect(hits.games).toEqual([]);
    expect(hits.collections).toEqual([]);
    expect(MIN_SEARCH_QUERY_LENGTH).toBe(2);
  });

  it("matches titles case-insensitively", () => {
    const hits = filterSearchCatalog(
      "ALI",
      [game("1", "Alien"), game("2", "Doom")],
      [collection("c1", "Aliens Franchise")],
      [collection("d1", "Ali Games Studio")],
      [collection("p1", "Alice Pub")],
    );
    expect(hits.games.map((g) => g.id)).toEqual(["1"]);
    expect(hits.collections.map((c) => c.id)).toEqual(["c1"]);
    expect(hits.developers.map((d) => d.id)).toEqual(["d1"]);
    expect(hits.publishers.map((p) => p.id)).toEqual(["p1"]);
  });
});
