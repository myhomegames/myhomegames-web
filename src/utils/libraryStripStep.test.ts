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
});
