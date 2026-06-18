import { useEffect, useState } from "react";

/** Fallback when the skin does not declare `--mhg-collapsible-sidebar-max-width`. */
const DEFAULT_COLLAPSIBLE_MAX_WIDTH_PX = 720;

function readCollapsibleMaxWidthPx(): number {
  if (typeof window === "undefined") return DEFAULT_COLLAPSIBLE_MAX_WIDTH_PX;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--mhg-collapsible-sidebar-max-width")
    .trim();
  const parsed = parseFloat(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_COLLAPSIBLE_MAX_WIDTH_PX;
}

/**
 * Collapsible overlay only below the skin breakpoint. Above that, the persistent shell
 * may still use horizontal scroll (`min-width: sidebar + main column`) with the menu visible.
 */
export function isCollapsibleSidebarViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < readCollapsibleMaxWidthPx();
}

export function useCollapsibleSidebarViewport(): boolean {
  const [narrow, setNarrow] = useState(isCollapsibleSidebarViewport);

  useEffect(() => {
    const update = () => setNarrow(isCollapsibleSidebarViewport());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return narrow;
}
