import { describe, expect, it } from "vitest";
import {
  isCollectionLikePseudoActiveDetail,
  matchesActiveCollectionLikeDetail,
} from "./collectionLikePseudoGame";

describe("matchesActiveCollectionLikeDetail", () => {
  const active = { resourceType: "developers" as const, id: "37" };

  it("matches same resource type and id", () => {
    expect(matchesActiveCollectionLikeDetail("developers", "37", active)).toBe(true);
    expect(matchesActiveCollectionLikeDetail("developers", 37, active)).toBe(true);
  });

  it("does not match other ids or resource types", () => {
    expect(matchesActiveCollectionLikeDetail("developers", "38", active)).toBe(false);
    expect(matchesActiveCollectionLikeDetail("publishers", "37", active)).toBe(false);
  });
});

describe("isCollectionLikePseudoActiveDetail", () => {
  it("detects pseudo ids for the active detail entity", () => {
    expect(
      isCollectionLikePseudoActiveDetail("collectionlike:developers:37", {
        resourceType: "developers",
        id: "37",
      }),
    ).toBe(true);
    expect(
      isCollectionLikePseudoActiveDetail("collectionlike:developers:38", {
        resourceType: "developers",
        id: "37",
      }),
    ).toBe(false);
  });
});
