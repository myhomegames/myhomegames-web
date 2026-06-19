export type SubmenuAnchorRect = Pick<DOMRect, "top" | "left" | "right" | "bottom">;

export function readPortaledSubmenuSize(menu: HTMLElement): { width: number; height: number } {
  const rect = menu.getBoundingClientRect();
  return {
    width: rect.width || menu.offsetWidth || 200,
    height: rect.height || menu.offsetHeight || 100,
  };
}

/** Keep a fixed submenu fully inside the viewport; prefer the side with more room. */
export function clampPortaledSubmenuPosition(
  anchor: SubmenuAnchorRect,
  menuWidth: number,
  menuHeight: number,
  padding = 8,
): { top: number; left: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const spaceRight = viewportWidth - anchor.right - padding;
  const spaceLeft = anchor.left - padding;

  let left =
    spaceRight >= menuWidth || spaceRight >= spaceLeft
      ? anchor.right
      : anchor.left - menuWidth;

  left = Math.max(padding, Math.min(left, viewportWidth - menuWidth - padding));

  let top = anchor.top;
  if (top + menuHeight + padding > viewportHeight) {
    top = anchor.bottom - menuHeight;
  }
  top = Math.max(padding, Math.min(top, viewportHeight - menuHeight - padding));

  return { top, left };
}

export function applyPortaledSubmenuPosition(
  menu: HTMLElement,
  anchor: SubmenuAnchorRect,
  padding = 8,
): void {
  const { width, height } = readPortaledSubmenuSize(menu);
  const { top, left } = clampPortaledSubmenuPosition(anchor, width, height, padding);

  menu.style.position = "fixed";
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  menu.style.right = "auto";
  menu.style.bottom = "auto";
}
