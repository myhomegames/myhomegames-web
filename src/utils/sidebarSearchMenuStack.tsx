import type { ReactNode } from "react";

export const SIDEBAR_SEARCH_MENU_Z_INDEX = 22200;
export const SIDEBAR_SEARCH_SHIELD_Z_INDEX = 22150;
export const SIDEBAR_SEARCH_CONFIRM_Z_INDEX = 22202;
export const SIDEBAR_SEARCH_ACTION_Z_INDEX = 22203;

export function isSidebarSearchDialogOpen(): boolean {
  return (
    typeof document !== "undefined" &&
    !!document.querySelector("[data-mhg-sidebar-search-dialog]")
  );
}

export function wrapSidebarSearchMenuStack(
  children: ReactNode,
  enabled: boolean,
  zIndex = SIDEBAR_SEARCH_MENU_Z_INDEX,
) {
  if (!enabled) return children;
  return (
    <div
      data-mhg-sidebar-search-menu-stack
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto", width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
}
