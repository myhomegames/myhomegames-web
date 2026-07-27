import { afterEach, describe, expect, it, vi } from "vitest";
import { isHorizontalLibraryStripMode, stepLibraryStrip } from "./libraryStripStep";

function mountStrip(opts?: { verticalList?: boolean; activeIndex?: number }) {
  document.documentElement.setAttribute("data-mhg-vertical-cover-alignment", "true");
  const bar = document.createElement("div");
  bar.className = "mhg-libraries-bar";
  if (opts?.verticalList) {
    bar.setAttribute("data-mhg-library-pages-vertical-list", "true");
  }
  const row = document.createElement("div");
  row.className = "mhg-libraries-container";
  const clicks: string[] = [];
  for (let i = 0; i < 3; i++) {
    const btn = document.createElement("button");
    btn.className = "mhg-library-button";
    btn.dataset.key = `lib-${i}`;
    btn.setAttribute("data-mhg-strip-has-list", "true");
    if (i === (opts?.activeIndex ?? 0)) btn.classList.add("mhg-library-active");
    btn.addEventListener("click", () => clicks.push(btn.dataset.key || ""));
    // jsdom getBoundingClientRect is 0 — stub visible size
    vi.spyOn(btn, "getBoundingClientRect").mockReturnValue({
      width: 40,
      height: 40,
      top: 0,
      left: i * 40,
      bottom: 40,
      right: (i + 1) * 40,
      x: i * 40,
      y: 0,
      toJSON: () => ({}),
    });
    row.appendChild(btn);
  }
  bar.appendChild(row);
  document.body.appendChild(bar);
  return { bar, clicks };
}

describe("libraryStripStep", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-mhg-vertical-cover-alignment");
    vi.restoreAllMocks();
  });

  it("detects horizontal strip mode", () => {
    expect(isHorizontalLibraryStripMode()).toBe(false);
    mountStrip();
    expect(isHorizontalLibraryStripMode()).toBe(true);
  });

  it("does not step in vertical library list mode", () => {
    const { clicks } = mountStrip({ verticalList: true, activeIndex: 0 });
    expect(isHorizontalLibraryStripMode()).toBe(false);
    expect(stepLibraryStrip(1)).toBe(false);
    expect(clicks).toEqual([]);
  });

  it("steps to the next and previous library button", () => {
    const { clicks, bar } = mountStrip({ activeIndex: 1 });
    expect(stepLibraryStrip(1)).toBe(true);
    expect(clicks).toEqual(["lib-2"]);

    bar.querySelector(".mhg-library-active")?.classList.remove("mhg-library-active");
    bar.querySelectorAll(".mhg-library-button")[2]?.classList.add("mhg-library-active");

    expect(stepLibraryStrip(-1)).toBe(true);
    expect(clicks).toEqual(["lib-2", "lib-1"]);
  });

  it("returns false at strip edges", () => {
    const { clicks } = mountStrip({ activeIndex: 0 });
    expect(stepLibraryStrip(-1)).toBe(false);
    expect(clicks).toEqual([]);

    mountStrip({ activeIndex: 2 });
    // second strip from afterEach cleared — remount
  });

  it("scrolls to non-list strip icons without auto-clicking them", () => {
    document.documentElement.setAttribute("data-mhg-vertical-cover-alignment", "true");
    const bar = document.createElement("div");
    bar.className = "mhg-libraries-bar";
    const row = document.createElement("div");
    row.className = "mhg-libraries-container";
    const clicks: string[] = [];

    const lib = document.createElement("button");
    lib.className = "mhg-library-button mhg-library-active";
    lib.dataset.key = "collections";
    lib.setAttribute("data-mhg-strip-has-list", "true");
    lib.addEventListener("click", () => clicks.push("collections"));
    vi.spyOn(lib, "getBoundingClientRect").mockReturnValue({
      width: 40,
      height: 40,
      top: 0,
      left: 0,
      bottom: 40,
      right: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    row.appendChild(lib);

    const addGame = document.createElement("button");
    addGame.className = "mhg-library-button";
    addGame.setAttribute("data-mhg-library-key", "mhg-header-add-game");
    addGame.addEventListener("click", () => clicks.push("mhg-header-add-game"));
    addGame.scrollIntoView = () => {};
    vi.spyOn(addGame, "getBoundingClientRect").mockReturnValue({
      width: 40,
      height: 40,
      top: 0,
      left: 40,
      bottom: 40,
      right: 80,
      x: 40,
      y: 0,
      toJSON: () => ({}),
    });
    row.appendChild(addGame);

    const settings = document.createElement("button");
    settings.className = "mhg-library-button";
    settings.setAttribute("data-mhg-library-key", "mhg-header-settings");
    settings.addEventListener("click", () => clicks.push("mhg-header-settings"));
    settings.scrollIntoView = () => {};
    vi.spyOn(settings, "getBoundingClientRect").mockReturnValue({
      width: 40,
      height: 40,
      top: 0,
      left: 80,
      bottom: 40,
      right: 120,
      x: 80,
      y: 0,
      toJSON: () => ({}),
    });
    row.appendChild(settings);

    bar.appendChild(row);
    document.body.appendChild(bar);

    expect(stepLibraryStrip(1)).toBe(true);
    expect(clicks).toEqual([]);
    expect(addGame.getAttribute("data-mhg-strip-focus")).toBe("true");

    expect(stepLibraryStrip(1)).toBe(true);
    expect(clicks).toEqual([]);
    expect(settings.getAttribute("data-mhg-strip-focus")).toBe("true");
    expect(addGame.hasAttribute("data-mhg-strip-focus")).toBe(false);

    expect(stepLibraryStrip(-1)).toBe(true);
    expect(clicks).toEqual([]);
    expect(addGame.getAttribute("data-mhg-strip-focus")).toBe("true");

    expect(stepLibraryStrip(-1)).toBe(true);
    expect(clicks).toEqual(["collections"]);
    expect(addGame.hasAttribute("data-mhg-strip-focus")).toBe(false);
  });
});
