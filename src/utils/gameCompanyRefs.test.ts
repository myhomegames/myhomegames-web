import { describe, expect, it } from "vitest";
import { mergeDeveloperPublisherRefsForGame } from "./gameCompanyRefs";

describe("mergeDeveloperPublisherRefsForGame", () => {
  const catalog = [{ id: 37, name: "Capcom" }];

  it("uses catalog names when API returns bare ids", () => {
    expect(mergeDeveloperPublisherRefsForGame([37], catalog)).toEqual([{ id: 37, name: "Capcom" }]);
  });

  it("prefers catalog name over placeholder API name equal to id", () => {
    expect(mergeDeveloperPublisherRefsForGame([{ id: 37, name: "37" }], catalog)).toEqual([
      { id: 37, name: "Capcom" },
    ]);
  });

  it("keeps non-placeholder API name when catalog has no entry", () => {
    expect(mergeDeveloperPublisherRefsForGame([{ id: 99, name: "New Studio" }], catalog)).toEqual([
      { id: 99, name: "New Studio" },
    ]);
  });

  it("falls back to catalog when API value is empty", () => {
    expect(mergeDeveloperPublisherRefsForGame(null, catalog)).toEqual([{ id: 37, name: "Capcom" }]);
  });
});
