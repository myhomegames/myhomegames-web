import { describe, expect, it } from "vitest";
import { isTitleOnlyWrapperCollectionLike } from "./collectionLikePseudoGame";

describe("isTitleOnlyWrapperCollectionLike", () => {
  it("returns true when there is one child and no direct games", () => {
    expect(isTitleOnlyWrapperCollectionLike({ childs: ["child-1"] }, 0)).toBe(true);
  });

  it("returns false when there are direct games", () => {
    expect(isTitleOnlyWrapperCollectionLike({ childs: ["child-1"] }, 3)).toBe(false);
  });

  it("returns false when there are multiple children", () => {
    expect(isTitleOnlyWrapperCollectionLike({ childs: ["a", "b"] }, 0)).toBe(false);
  });

  it("returns false when there are no children", () => {
    expect(isTitleOnlyWrapperCollectionLike({ childs: [] }, 0)).toBe(false);
    expect(isTitleOnlyWrapperCollectionLike({}, 0)).toBe(false);
  });
});
