import { useLayoutEffect, type ReactNode } from "react";

export const SIDEBAR_SEARCH_MENU_Z_INDEX = 22200;
export const SIDEBAR_SEARCH_SHIELD_Z_INDEX = 22150;
export const SIDEBAR_SEARCH_CONFIRM_Z_INDEX = 22202;
export const SIDEBAR_SEARCH_ACTION_Z_INDEX = 22203;

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

function SidebarSearchMenuStack({
  children,
  zIndex,
}: {
  children: ReactNode;
  zIndex: number;
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
          pointerEvents: "auto",
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
) {
  if (!enabled) return children;
  return <SidebarSearchMenuStack zIndex={zIndex}>{children}</SidebarSearchMenuStack>;
}
