import { describe, expect, it, vi, afterEach } from "vitest";
import {
  ensureElementVisibleInScrollParents,
  nudgeScrollParentForDirection,
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
