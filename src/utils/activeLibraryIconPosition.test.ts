import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { syncActiveLibraryIconPosition } from "./activeLibraryIconPosition";

describe("syncActiveLibraryIconPosition", () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty("--mhg-active-library-icon-center-x");
    document.documentElement.style.removeProperty("--mhg-active-library-icon-center-y");
    document.documentElement.style.removeProperty("--mhg-active-library-icon-left-x");
    document.documentElement.style.removeProperty("--mhg-active-library-icon-graphic-left-x");
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("writes icon position CSS vars from the active library button", () => {
    const bar = document.createElement("div");
    bar.className = "mhg-libraries-bar-container";
    const active = document.createElement("button");
    active.className = "mhg-library-active";
    active.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 40,
        width: 80,
        height: 60,
        right: 180,
        bottom: 100,
        x: 100,
        y: 40,
        toJSON: () => ({}),
      }) as DOMRect;
    bar.append(active);
    document.body.append(bar);

    syncActiveLibraryIconPosition(bar);

    expect(
      document.documentElement.style.getPropertyValue("--mhg-active-library-icon-center-x"),
    ).toBe("140px");
    expect(
      document.documentElement.style.getPropertyValue("--mhg-active-library-icon-center-y"),
    ).toBe("70px");
    expect(
      document.documentElement.style.getPropertyValue("--mhg-active-library-icon-left-x"),
    ).toBe("100px");
  });

  it("no-ops when the bar container has no active icon", () => {
    const bar = document.createElement("div");
    document.body.append(bar);

    syncActiveLibraryIconPosition(bar);

    expect(
      document.documentElement.style.getPropertyValue("--mhg-active-library-icon-center-x"),
    ).toBe("");
  });
});
