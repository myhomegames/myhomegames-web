/** Ignore sub-pixel slack when deciding if an axis can scroll. */
const SCROLL_SLACK_PX = 2;

function canScrollAxis(el: HTMLElement, axis: "x" | "y"): boolean {
  const style = window.getComputedStyle(el);
  const overflow = axis === "y" ? style.overflowY : style.overflowX;
  if (overflow !== "auto" && overflow !== "scroll" && overflow !== "overlay") {
    return false;
  }
  if (axis === "y") {
    return el.scrollHeight > el.clientHeight + SCROLL_SLACK_PX;
  }
  return el.scrollWidth > el.clientWidth + SCROLL_SLACK_PX;
}

function findScrollParent(el: HTMLElement, axis: "x" | "y"): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    if (canScrollAxis(node, axis)) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Cover tiles keep the title in a sibling `.games-list-title-wrapper` below the
 * focused `.games-list-cover`. Prefer the whole tile so D-pad focus doesn't leave
 * titles clipped under the viewport (e.g. first Down from Play into a collection grid).
 */
export function resolveScrollVisibilityTarget(el: HTMLElement): HTMLElement {
  const cover = el.classList.contains("games-list-cover")
    ? el
    : (el.closest(".games-list-cover") as HTMLElement | null);
  if (!cover) return el;
  const tile = cover.closest(
    [
      ".games-list-item",
      ".collections-list-item",
      ".library-item-detail-subcollection-cell",
      ".similar-games-cover-cell",
      ".fixed-focal-games-item",
      ".virtualized-grid-cell-pad",
      ".virtualized-horizontal-games-strip-cell-pad",
      ".tag-list-item",
      ".fixed-focal-tag-item",
    ].join(","),
  ) as HTMLElement | null;
  if (tile) return tile;
  const parent = cover.parentElement;
  if (parent?.querySelector(":scope > .games-list-title-wrapper")) return parent;
  return el;
}

/** Recommended horizontal strip keyword (section title) for the focused cover. */
export function resolveScrollableSectionKeyword(
  el: HTMLElement,
): HTMLElement | null {
  const section = el.closest(".scrollable-section") as HTMLElement | null;
  if (!section) return null;
  // Only Recommended strips: detail-page carousels keep their own scroll behavior.
  if (!section.closest(".recommended-page-scroll")) return null;
  return (
    section.querySelector<HTMLElement>(".scrollable-section-header") ??
    section.querySelector<HTMLElement>(".scrollable-section-title") ??
    null
  );
}

function clampScroll(parent: HTMLElement, axis: "x" | "y", next: number): void {
  if (axis === "y") {
    const max = Math.max(0, parent.scrollHeight - parent.clientHeight);
    parent.scrollTop = Math.max(0, Math.min(max, next));
    return;
  }
  const max = Math.max(0, parent.scrollWidth - parent.clientWidth);
  parent.scrollLeft = Math.max(0, Math.min(max, next));
}

/** Keep the same summary↔keyword gap as at rest (scroll container padding-top). */
function recommendedKeywordTopInset(parent: HTMLElement, fallbackPadPx: number): number {
  const padTop = Number.parseFloat(window.getComputedStyle(parent).paddingTop || "");
  return Number.isFinite(padTop) ? padTop : fallbackPadPx;
}

/**
 * Default inset when bringing focused covers into view. On Smart TV, skins that
 * use scale(1.14) set `--mhg-tv-cover-scale-pad` so edge tiles are not clipped.
 */
function readDefaultScrollVisibilityPadPx(): number {
  if (typeof document === "undefined") return 12;
  if (document.documentElement.getAttribute("data-mhg-tv") !== "1") return 12;
  const raw = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--mhg-tv-cover-scale-pad"),
  );
  if (Number.isFinite(raw) && raw > 0) return Math.ceil(raw);
  return 36;
}

/**
 * After Smart TV D-pad focus (`preventScroll: true`), bring `el` into view inside
 * every scrollable ancestor (GOG vertical library menu, cover grids, sheets, …).
 *
 * On Recommended strips, snap the section keyword to the scrollport top inset
 * (padding-top) so the gap under the browse-preview summary stays constant.
 */
export function ensureElementVisibleInScrollParents(
  el: HTMLElement,
  padPx: number = readDefaultScrollVisibilityPadPx(),
): void {
  if (!el.isConnected) return;

  const target = resolveScrollVisibilityTarget(el);
  const keyword = resolveScrollableSectionKeyword(el);

  let node: HTMLElement | null = target.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const parent = node;
    const elRect = target.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    if (canScrollAxis(parent, "y")) {
      if (keyword && parent.contains(keyword)) {
        const inset = recommendedKeywordTopInset(parent, padPx);
        const headerRect = keyword.getBoundingClientRect();
        const deltaY = headerRect.top - parentRect.top - inset;
        if (Math.abs(deltaY) > SCROLL_SLACK_PX) {
          clampScroll(parent, "y", parent.scrollTop + deltaY);
        }
      } else {
        let deltaY = 0;
        if (elRect.top < parentRect.top + padPx) {
          deltaY = elRect.top - parentRect.top - padPx;
        } else if (elRect.bottom > parentRect.bottom - padPx) {
          deltaY = elRect.bottom - parentRect.bottom + padPx;
        }
        if (deltaY !== 0) {
          clampScroll(parent, "y", parent.scrollTop + deltaY);
        }
      }
    }

    if (canScrollAxis(parent, "x")) {
      // Re-read after vertical scroll — layout may have shifted slightly.
      const elRectX = target.getBoundingClientRect();
      const parentRectX = parent.getBoundingClientRect();
      let deltaX = 0;
      if (elRectX.left < parentRectX.left + padPx) {
        deltaX = elRectX.left - parentRectX.left - padPx;
      } else if (elRectX.right > parentRectX.right - padPx) {
        deltaX = elRectX.right - parentRectX.right + padPx;
      }
      if (deltaX !== 0) {
        clampScroll(parent, "x", parent.scrollLeft + deltaX);
      }
    }

    node = parent.parentElement;
  }
}

/**
 * When geometric focus finds no neighbor (e.g. virtualized covers not mounted yet),
 * nudge the nearest scroll parent so more items can enter the viewport.
 * @returns true if scroll position changed
 */
export function nudgeScrollParentForDirection(
  el: HTMLElement,
  direction: "up" | "down" | "left" | "right",
): boolean {
  const axis = direction === "up" || direction === "down" ? "y" : "x";
  const parent = findScrollParent(el, axis);
  if (!parent) return false;

  const rect = el.getBoundingClientRect();
  const step =
    axis === "y"
      ? Math.max(64, Math.round(rect.height || parent.clientHeight * 0.35))
      : Math.max(64, Math.round(rect.width || parent.clientWidth * 0.35));

  if (axis === "y") {
    const before = parent.scrollTop;
    if (direction === "down") {
      clampScroll(parent, "y", before + step);
    } else {
      clampScroll(parent, "y", before - step);
    }
    return Math.abs(parent.scrollTop - before) > SCROLL_SLACK_PX;
  }

  const before = parent.scrollLeft;
  if (direction === "right") {
    clampScroll(parent, "x", before + step);
  } else {
    clampScroll(parent, "x", before - step);
  }
  return Math.abs(parent.scrollLeft - before) > SCROLL_SLACK_PX;
}
