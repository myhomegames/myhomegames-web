import { describe, expect, it, vi, afterEach } from "vitest";
import {
  ensureElementVisibleInScrollParents,
  nudgeScrollParentForDirection,
  resolveScrollVisibilityTarget,
} from "./ensureVisibleInScrollParent";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function mockBox(
  el: HTMLElement,
  box: { top: number; left: number; width: number; height: number },
): void {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    top: box.top,
    left: box.left,
    right: box.left + box.width,
    bottom: box.top + box.height,
    width: box.width,
    height: box.height,
    x: box.left,
    y: box.top,
    toJSON: () => ({}),
  } as DOMRect);
}

describe("resolveScrollVisibilityTarget", () => {
  it("prefers the cover tile that includes the title wrapper", () => {
    const tile = document.createElement("div");
    tile.className = "games-list-item";
    const cover = document.createElement("div");
    cover.className = "games-list-cover";
    const title = document.createElement("div");
    title.className = "games-list-title-wrapper";
    tile.append(cover, title);
    document.body.appendChild(tile);

    expect(resolveScrollVisibilityTarget(cover)).toBe(tile);
  });
});

describe("ensureElementVisibleInScrollParents", () => {
  it("scrolls a vertical overflow parent so a clipped child is visible", () => {
    const parent = document.createElement("div");
    const child = document.createElement("button");
    parent.appendChild(child);
    document.body.appendChild(parent);

    Object.defineProperty(parent, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(parent, "scrollHeight", { value: 400, configurable: true });
    Object.defineProperty(parent, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v;
      },
    });
    let scrollTop = 0;

    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () => ({ overflowY: "auto", overflowX: "hidden" }) as CSSStyleDeclaration,
    );
    mockBox(parent, { top: 0, left: 0, width: 200, height: 100 });
    mockBox(child, { top: 220, left: 0, width: 200, height: 40 });

    ensureElementVisibleInScrollParents(child, 8);

    expect(scrollTop).toBe(168); // 220 - 0 - 8 + 40 wait: delta = bottom - parentBottom + pad = 260 - 100 + 8 = 168
  });

  it("scrolls up when the focused child is above the viewport", () => {
    const parent = document.createElement("div");
    const child = document.createElement("button");
    parent.appendChild(child);
    document.body.appendChild(parent);

    Object.defineProperty(parent, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(parent, "scrollHeight", { value: 400, configurable: true });
    let scrollTop = 200;
    Object.defineProperty(parent, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v;
      },
    });

    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () => ({ overflowY: "auto", overflowX: "hidden" }) as CSSStyleDeclaration,
    );
    mockBox(parent, { top: 0, left: 0, width: 200, height: 100 });
    mockBox(child, { top: -40, left: 0, width: 200, height: 40 });

    ensureElementVisibleInScrollParents(child, 8);

    expect(scrollTop).toBe(152); // 200 + (-40 - 0 - 8) = 152
  });

  it("scrolls far enough to keep cover titles visible, not only the cover image", () => {
    const parent = document.createElement("div");
    const tile = document.createElement("div");
    tile.className = "games-list-item";
    const cover = document.createElement("div");
    cover.className = "games-list-cover";
    const title = document.createElement("div");
    title.className = "games-list-title-wrapper";
    tile.append(cover, title);
    parent.appendChild(tile);
    document.body.appendChild(parent);

    Object.defineProperty(parent, "clientHeight", { value: 200, configurable: true });
    Object.defineProperty(parent, "scrollHeight", { value: 800, configurable: true });
    let scrollTop = 0;
    Object.defineProperty(parent, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v;
      },
    });

    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () => ({ overflowY: "auto", overflowX: "hidden" }) as CSSStyleDeclaration,
    );
    mockBox(parent, { top: 0, left: 0, width: 200, height: 200 });
    // Cover fits in the viewport; title below it is clipped.
    mockBox(cover, { top: 50, left: 0, width: 120, height: 140 });
    mockBox(tile, { top: 50, left: 0, width: 120, height: 188 });

    ensureElementVisibleInScrollParents(cover, 12);

    // Tile bottom 238 > parent bottom 200 → delta 50; pad 12 → scrollTop 50
    expect(scrollTop).toBe(50);
  });
});

describe("nudgeScrollParentForDirection", () => {
  it("nudges scrollTop downward when more content exists", () => {
    const parent = document.createElement("div");
    const child = document.createElement("button");
    parent.appendChild(child);
    document.body.appendChild(parent);

    Object.defineProperty(parent, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(parent, "scrollHeight", { value: 400, configurable: true });
    let scrollTop = 0;
    Object.defineProperty(parent, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v;
      },
    });

    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () => ({ overflowY: "auto", overflowX: "hidden" }) as CSSStyleDeclaration,
    );
    mockBox(child, { top: 20, left: 0, width: 200, height: 80 });

    expect(nudgeScrollParentForDirection(child, "down")).toBe(true);
    expect(scrollTop).toBe(80);
  });
});
