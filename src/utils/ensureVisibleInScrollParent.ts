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
    ].join(","),
  ) as HTMLElement | null;
  if (tile) return tile;
  const parent = cover.parentElement;
  if (parent?.querySelector(":scope > .games-list-title-wrapper")) return parent;
  return el;
}

/**
 * After Smart TV D-pad focus (`preventScroll: true`), bring `el` into view inside
 * every scrollable ancestor (GOG vertical library menu, cover grids, sheets, …).
 */
export function ensureElementVisibleInScrollParents(
  el: HTMLElement,
  padPx: number = 12,
): void {
  if (!el.isConnected) return;

  const target = resolveScrollVisibilityTarget(el);

  let node: HTMLElement | null = target.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const parent = node;
    const elRect = target.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    if (canScrollAxis(parent, "y")) {
      let deltaY = 0;
      if (elRect.top < parentRect.top + padPx) {
        deltaY = elRect.top - parentRect.top - padPx;
      } else if (elRect.bottom > parentRect.bottom - padPx) {
        deltaY = elRect.bottom - parentRect.bottom + padPx;
      }
      if (deltaY !== 0) {
        const max = Math.max(0, parent.scrollHeight - parent.clientHeight);
        parent.scrollTop = Math.max(0, Math.min(max, parent.scrollTop + deltaY));
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
        const max = Math.max(0, parent.scrollWidth - parent.clientWidth);
        parent.scrollLeft = Math.max(0, Math.min(max, parent.scrollLeft + deltaX));
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
    const max = Math.max(0, parent.scrollHeight - parent.clientHeight);
    const before = parent.scrollTop;
    if (direction === "down") {
      parent.scrollTop = Math.min(max, before + step);
    } else {
      parent.scrollTop = Math.max(0, before - step);
    }
    return Math.abs(parent.scrollTop - before) > SCROLL_SLACK_PX;
  }

  const max = Math.max(0, parent.scrollWidth - parent.clientWidth);
  const before = parent.scrollLeft;
  if (direction === "right") {
    parent.scrollLeft = Math.min(max, before + step);
  } else {
    parent.scrollLeft = Math.max(0, before - step);
  }
  return Math.abs(parent.scrollLeft - before) > SCROLL_SLACK_PX;
}
