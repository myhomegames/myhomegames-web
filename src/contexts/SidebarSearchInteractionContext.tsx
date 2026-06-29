import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { SIDEBAR_SEARCH_SHIELD_Z_INDEX } from "../utils/sidebarSearchMenuStack";

type SidebarSearchInteractionContextValue = {
  retainInteractionBlock: () => () => void;
};

const SidebarSearchInteractionContext =
  createContext<SidebarSearchInteractionContextValue | null>(null);

let interactionBlockCount = 0;
const interactionBlockListeners = new Set<() => void>();

function emitInteractionBlockChange() {
  for (const listener of interactionBlockListeners) {
    listener();
  }
}

function subscribeInteractionBlocked(listener: () => void) {
  interactionBlockListeners.add(listener);
  return () => {
    interactionBlockListeners.delete(listener);
  };
}

function getInteractionBlockedSnapshot() {
  return interactionBlockCount > 0;
}

export function useSidebarSearchInteraction() {
  return useContext(SidebarSearchInteractionContext);
}

function SidebarSearchInteractionShield() {
  const blocked = useSyncExternalStore(
    subscribeInteractionBlocked,
    getInteractionBlockedSnapshot,
  );

  useLayoutEffect(() => {
    const dropdown = document.querySelector<HTMLElement>(
      "[data-mhg-sidebar-search-dialog] .search-dropdown",
    );
    if (blocked) {
      document.body.setAttribute("data-mhg-sidebar-search-stack-active", "");
      dropdown?.classList.add("search-dropdown--modal-hidden");
      return;
    }
    document.body.removeAttribute("data-mhg-sidebar-search-stack-active");
    if (!document.body.hasAttribute("data-mhg-sidebar-search-modal-action")) {
      dropdown?.classList.remove("search-dropdown--modal-hidden");
    }
  }, [blocked]);

  if (!blocked) return null;

  return createPortal(
    <div
      data-mhg-sidebar-search-interaction-shield
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: SIDEBAR_SEARCH_SHIELD_Z_INDEX,
        pointerEvents: "auto",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
      }}
    />,
    document.body,
  );
}

export function SidebarSearchInteractionProvider({ children }: { children: ReactNode }) {
  const retainInteractionBlock = useCallback(() => {
    interactionBlockCount += 1;
    emitInteractionBlockChange();
    return () => {
      interactionBlockCount = Math.max(0, interactionBlockCount - 1);
      emitInteractionBlockChange();
    };
  }, []);

  return (
    <SidebarSearchInteractionContext.Provider value={{ retainInteractionBlock }}>
      {children}
      <SidebarSearchInteractionShield />
    </SidebarSearchInteractionContext.Provider>
  );
}
