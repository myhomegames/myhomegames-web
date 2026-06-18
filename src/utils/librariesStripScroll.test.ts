import { describe, expect, it } from "vitest";
import {
  clampLibrariesStripScrollLeft,
  librariesStripNeedsHorizontalScroll,
  maxLibrariesStripScrollLeft,
  syncLibrariesStripScroll,
} from "./librariesStripScroll";

function mockRect(left: number, width: number): DOMRect {
  return {
    left,
    right: left + width,
    top: 0,
    bottom: 0,
    width,
    height: 0,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("librariesStripScroll", () => {
  it("returns 0 when the last tile already fits", () => {
    const tile = document.createElement("button");
    const container = document.createElement("div");
    container.appendChild(tile);
    Object.defineProperty(container, "clientWidth", { value: 400 });
    Object.defineProperty(container, "scrollLeft", { value: 0, writable: true });
    container.getBoundingClientRect = () => mockRect(0, 400);
    tile.getBoundingClientRect = () => mockRect(8, 96);

    expect(maxLibrariesStripScrollLeft(container)).toBe(0);
  });

  it("clamps scroll past the last tile right edge", () => {
    const tiles = [document.createElement("button"), document.createElement("button")];
    const container = document.createElement("div");
    tiles.forEach((tile) => container.appendChild(tile));
    Object.defineProperty(container, "clientWidth", { value: 200 });
    Object.defineProperty(container, "scrollLeft", { value: 700, writable: true });
    container.getBoundingClientRect = () => mockRect(0, 200);
    // Content ends at 800px; at scrollLeft 700 the last tile right sits at x=100 in the viewport.
    tiles[1]!.getBoundingClientRect = () => mockRect(4, 96);

    expect(maxLibrariesStripScrollLeft(container)).toBe(600);
    expect(clampLibrariesStripScrollLeft(container)).toBe(true);
    expect(container.scrollLeft).toBe(600);
  });

  it("allows scroll until the last tile reaches the viewport right edge", () => {
    const tiles = [document.createElement("button"), document.createElement("button")];
    const container = document.createElement("div");
    tiles.forEach((tile) => container.appendChild(tile));
    Object.defineProperty(container, "clientWidth", { value: 200 });
    Object.defineProperty(container, "scrollLeft", { value: 0, writable: true });
    container.getBoundingClientRect = () => mockRect(0, 200);
    tiles[0]!.getBoundingClientRect = () => mockRect(8, 96);
    tiles[1]!.getBoundingClientRect = () => mockRect(220, 96);

    expect(maxLibrariesStripScrollLeft(container)).toBe(116);
  });

  it("disables overflow when every tile fits", () => {
    const tile = document.createElement("button");
    const container = document.createElement("div");
    container.style.overflowX = "auto";
    container.appendChild(tile);
    Object.defineProperty(container, "clientWidth", { value: 400 });
    Object.defineProperty(container, "scrollLeft", { value: 3, writable: true });
    container.getBoundingClientRect = () => mockRect(0, 400);
    tile.getBoundingClientRect = () => mockRect(8, 96);

    expect(librariesStripNeedsHorizontalScroll(container)).toBe(false);
    syncLibrariesStripScroll(container);
    expect(container.scrollLeft).toBe(0);
    expect(container.style.overflowX).toBe("hidden");
  });

  it("restores overflow when tiles overflow", () => {
    const tiles = [document.createElement("button"), document.createElement("button")];
    const container = document.createElement("div");
    container.style.overflowX = "hidden";
    tiles.forEach((tile) => container.appendChild(tile));
    Object.defineProperty(container, "clientWidth", { value: 200 });
    Object.defineProperty(container, "scrollLeft", { value: 0, writable: true });
    container.getBoundingClientRect = () => mockRect(0, 200);
    tiles[0]!.getBoundingClientRect = () => mockRect(8, 96);
    tiles[1]!.getBoundingClientRect = () => mockRect(220, 96);

    syncLibrariesStripScroll(container);
    expect(librariesStripNeedsHorizontalScroll(container)).toBe(true);
    expect(container.style.overflowX).toBe("");
  });
});
