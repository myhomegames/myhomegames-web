import { describe, expect, it } from "vitest";
import {
  centerActiveLibraryInStrip,
  clampLibrariesStripScrollLeft,
  librariesStripNeedsHorizontalScroll,
  maxLibrariesStripScrollLeft,
  syncLibrariesStripScroll,
  targetActiveLibraryIconCenterX,
  verticalCoverRailScrollLayoutForPath,
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

  it("centers the active tile so the cover rail fits on screen", () => {
    const tiles = [
      document.createElement("button"),
      document.createElement("button"),
      document.createElement("button"),
    ];
    tiles[1]!.className = "mhg-library-active";
    const container = document.createElement("div");
    tiles.forEach((tile) => container.appendChild(tile));
    Object.defineProperty(container, "clientWidth", { value: 120 });
    Object.defineProperty(container, "scrollLeft", { value: 0, writable: true });
    container.getBoundingClientRect = () => mockRect(0, 120);
    tiles[0]!.getBoundingClientRect = () => mockRect(8, 96);
    tiles[1]!.getBoundingClientRect = () => mockRect(112, 96);
    tiles[2]!.getBoundingClientRect = () => mockRect(216, 96);

    Object.defineProperty(window, "innerWidth", { value: 600, configurable: true });
    document.documentElement.style.setProperty("--mhg-vertical-column-width", "480");
    document.documentElement.style.setProperty("--mhg-vertical-column-viewport-margin", "72");
    document.documentElement.style.setProperty("--mhg-vertical-rail-align-half-width", "180");
    document.documentElement.style.setProperty("--mhg-vertical-column-shift-x", "72");

    const layout = verticalCoverRailScrollLayoutForPath("/library");
    // columnWidth = min(480, 528) = 480; minX = 108; maxX = 228; target = 168
    expect(targetActiveLibraryIconCenterX(600, layout)).toBe(168);

    // Active center at 160; target 168 needs scrollLeft −8, clamped to 0
    expect(centerActiveLibraryInStrip(container, layout)).toBe(true);
    expect(container.scrollLeft).toBe(0);
  });

  it("scrolls the strip when the active icon sits too far right for the cover rail", () => {
    const tiles = [
      document.createElement("button"),
      document.createElement("button"),
      document.createElement("button"),
    ];
    tiles[2]!.className = "mhg-library-active";
    const container = document.createElement("div");
    tiles.forEach((tile) => container.appendChild(tile));
    Object.defineProperty(container, "clientWidth", { value: 200 });
    Object.defineProperty(container, "scrollLeft", { value: 0, writable: true });
    container.getBoundingClientRect = () => mockRect(0, 200);
    tiles[0]!.getBoundingClientRect = () => mockRect(8, 96);
    tiles[1]!.getBoundingClientRect = () => mockRect(112, 96);
    tiles[2]!.getBoundingClientRect = () => mockRect(320, 96);

    Object.defineProperty(window, "innerWidth", { value: 600, configurable: true });
    document.documentElement.style.setProperty("--mhg-vertical-column-width", "480");
    document.documentElement.style.setProperty("--mhg-vertical-column-viewport-margin", "72");
    document.documentElement.style.setProperty("--mhg-vertical-rail-align-half-width", "180");
    document.documentElement.style.setProperty("--mhg-vertical-column-shift-x", "72");

    const layout = verticalCoverRailScrollLayoutForPath("/library");
    // Active center 368; target 168 → scrollLeft += 200
    expect(centerActiveLibraryInStrip(container, layout)).toBe(true);
    expect(container.scrollLeft).toBe(200);
  });

  it("uses tag cover half-width for tag routes", () => {
    document.documentElement.style.setProperty("--tag-list-cover-size", "150");
    document.documentElement.style.setProperty("--mhg-tag-vertical-column-width", "560");
    document.documentElement.style.setProperty("--mhg-vertical-column-viewport-margin", "72");

    const layout = verticalCoverRailScrollLayoutForPath("/tags");
    expect(layout.railLeftOffsetFromIconCenter).toBe(75);
    expect(layout.columnWidthMax).toBe(560);
    // vw 600 → column 528; min 75, max 147, target 111
    expect(targetActiveLibraryIconCenterX(600, layout)).toBe(111);
  });

  it("does not scroll the strip when every tile fits", () => {
    const tile = document.createElement("button");
    tile.className = "mhg-library-active";
    const container = document.createElement("div");
    container.appendChild(tile);
    Object.defineProperty(container, "clientWidth", { value: 400 });
    Object.defineProperty(container, "scrollLeft", { value: 0, writable: true });
    container.getBoundingClientRect = () => mockRect(0, 400);
    tile.getBoundingClientRect = () => mockRect(8, 96);

    expect(centerActiveLibraryInStrip(container)).toBe(false);
    expect(container.scrollLeft).toBe(0);
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
