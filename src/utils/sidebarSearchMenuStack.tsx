import { useLayoutEffect, type ReactNode } from "react";

export const SIDEBAR_SEARCH_MENU_Z_INDEX = 22200;
export const SIDEBAR_SEARCH_SHIELD_Z_INDEX = 22150;
export const SIDEBAR_SEARCH_CONFIRM_Z_INDEX = 22202;
export const SIDEBAR_SEARCH_ACTION_Z_INDEX = 22203;
/** Header search dropdown (Plex): portaled ⋮ menu below action sheets. */
export const HEADER_SEARCH_MENU_Z_INDEX = 10105;
export const HEADER_SEARCH_ACTION_Z_INDEX = 10125;

let sidebarSearchStackMountCount = 0;
const sidebarSearchStackMountListeners = new Set<() => void>();

function emitSidebarSearchStackMountChange() {
  for (const listener of sidebarSearchStackMountListeners) {
    listener();
  }
}

export function subscribeSidebarSearchStackMounted(listener: () => void) {
  sidebarSearchStackMountListeners.add(listener);
  return () => {
    sidebarSearchStackMountListeners.delete(listener);
  };
}

export function getSidebarSearchStackMounted() {
  return sidebarSearchStackMountCount > 0;
}

export function isSidebarSearchDialogOpen(): boolean {
  return (
    typeof document !== "undefined" &&
    !!document.querySelector("[data-mhg-sidebar-search-dialog]")
  );
}

export function isHeaderSearchDropdownModalAction(): boolean {
  return (
    typeof document !== "undefined" &&
    document.body.hasAttribute("data-mhg-search-dropdown-modal-action")
  );
}

export function resolveSearchMenuStackZIndex(sidebarDialogOpen = isSidebarSearchDialogOpen()) {
  return sidebarDialogOpen ? SIDEBAR_SEARCH_MENU_Z_INDEX : HEADER_SEARCH_MENU_Z_INDEX;
}

export function resolveSearchActionStackZIndex(sidebarDialogOpen = isSidebarSearchDialogOpen()) {
  return sidebarDialogOpen ? SIDEBAR_SEARCH_ACTION_Z_INDEX : HEADER_SEARCH_ACTION_Z_INDEX;
}

export function markSearchDropdownModalActionOpen() {
  if (typeof document === "undefined") return;
  if (isSidebarSearchDialogOpen()) {
    document.body.setAttribute("data-mhg-sidebar-search-modal-action", "");
    document.body.removeAttribute("data-mhg-search-dropdown-modal-action");
    return;
  }
  document.body.setAttribute("data-mhg-search-dropdown-modal-action", "");
  document.body.removeAttribute("data-mhg-sidebar-search-modal-action");
}

export function clearSearchDropdownModalActionMark() {
  if (typeof document === "undefined") return;
  document.body.removeAttribute("data-mhg-search-dropdown-modal-action");
  document.body.removeAttribute("data-mhg-sidebar-search-modal-action");
}

function SidebarSearchMenuStack({
  children,
  zIndex,
  permeable = false,
}: {
  children: ReactNode;
  zIndex: number;
  permeable?: boolean;
}) {
  useLayoutEffect(() => {
    sidebarSearchStackMountCount += 1;
    emitSidebarSearchStackMountChange();
    return () => {
      sidebarSearchStackMountCount = Math.max(0, sidebarSearchStackMountCount - 1);
      emitSidebarSearchStackMountChange();
    };
  }, []);

  return (
    <div
      data-mhg-sidebar-search-menu-stack
      {...(permeable ? { "data-mhg-sidebar-search-menu-stack-permeable": "" } : {})}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          pointerEvents: permeable ? "none" : "auto",
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function wrapSidebarSearchMenuStack(
  children: ReactNode,
  enabled: boolean,
  zIndex = SIDEBAR_SEARCH_MENU_Z_INDEX,
  permeable = false,
) {
  if (!enabled) return children;
  return (
    <SidebarSearchMenuStack zIndex={zIndex} permeable={permeable}>
      {children}
    </SidebarSearchMenuStack>
  );
}
