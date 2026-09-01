import { describe, expect, it } from "vitest";
import {
  readAbsoluteStripCoverIndex,
  stripNavFromAbsoluteIndex,
} from "./horizontalStripNavState";

describe("horizontalStripNavState", () => {
  it("reads absolute strip index from cover cell", () => {
    const section = document.createElement("div");
    const cell = document.createElement("div");
    cell.setAttribute("data-mhg-strip-index", "42");
    const cover = document.createElement("div");
    cell.appendChild(cover);
    section.appendChild(cell);

    expect(readAbsoluteStripCoverIndex(cover)).toBe(42);
  });

  it("hides right chevron at last column and left chevron at first", () => {
    expect(stripNavFromAbsoluteIndex(0, 60)).toEqual({
      canScrollLeft: false,
      canScrollRight: true,
    });
    expect(stripNavFromAbsoluteIndex(59, 60)).toEqual({
      canScrollLeft: true,
      canScrollRight: false,
    });
    expect(stripNavFromAbsoluteIndex(30, 60)).toEqual({
      canScrollLeft: true,
      canScrollRight: true,
    });
  });
});
